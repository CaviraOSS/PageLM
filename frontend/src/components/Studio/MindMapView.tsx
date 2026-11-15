import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from "react";
import { createPortal } from "react-dom";
import type { MindMapTemplate, StudioMindMap } from "../../lib/api";
import {
  MINDMAP_TEMPLATES,
  layoutMindMap,
  normalizeTemplate,
  walkAll,
  type TreeNode,
} from "./mindmap/layout";
import { mapDirection } from "./mindmap/direction";
import { fitLayout } from "./mindmap/view";
import {
  downloadMarkdown,
  downloadPdf,
  downloadPng,
  downloadSvg,
  mapToMarkdown,
} from "./mindmap/export";

type Props = { map: StudioMindMap };

const MIN_ZOOM = 0.1;
const MAX_ZOOM = 2;
// Below this scale the cards and labels stop being readable. Large maps are
// kept at this floor and centred on the root, so the user pans instead of
// staring at a 10%-scaled overview.
const READABLE_MIN_ZOOM = 0.7;

const DEPTH_CARD = [
  "border-violet-400/40 bg-gradient-to-br from-violet-500/25 via-stone-900 to-stone-950 text-white shadow-[0_18px_50px_-18px_rgba(139,92,246,0.8)]",
  "border-sky-500/30 bg-gradient-to-br from-sky-500/12 via-stone-950 to-stone-950 text-stone-100 hover:border-sky-400/60",
  "border-emerald-500/25 bg-stone-950 text-stone-200 hover:border-emerald-400/50",
  "border-amber-500/25 bg-stone-950 text-stone-300 hover:border-amber-400/50",
];
const DEPTH_DOT = ["bg-violet-300", "bg-sky-300", "bg-emerald-300", "bg-amber-300"];
const DEPTH_EDGE = ["stroke-sky-400/50", "stroke-sky-400/40", "stroke-emerald-400/35", "stroke-amber-400/30"];
const DEPTH_TEXT = [
  "text-[15px] font-semibold",
  "text-[13px] font-medium",
  "text-[12px]",
  "text-[11.5px]",
];

function clamp(n: number, min: number, max: number) {
  return Math.min(max, Math.max(min, n));
}

function buildTree(root: StudioMindMap["root"]): TreeNode {
  let seq = 0;
  const walk = (node: StudioMindMap["root"], depth: number): TreeNode => {
    const id = `mm-${seq++}`;
    const label = String(node?.label ?? "").replace(/\s+/g, " ").trim() || "…";
    const kids = Array.isArray(node?.children)
      ? node.children.filter((c) => c && String(c?.label ?? "").trim())
      : [];
    return { id, label, depth, children: kids.map((c) => walk(c, depth + 1)) };
  };
  return walk(root, 0);
}

function defaultCollapsed(tree: TreeNode): Set<string> {
  return new Set(
    walkAll(tree)
      .filter((n) => n.depth >= 1 && n.children.length > 0)
      .map((n) => n.id),
  );
}

function TemplateGlyph({ id, className = "size-4" }: { id: MindMapTemplate; className?: string }) {
  const common = { fill: "none", stroke: "currentColor", strokeWidth: 1.6, strokeLinecap: "round" as const };
  if (id === "balanced") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M12 9H6m6 0h6M6 9V4H3m3 5v5H3M18 9V4h3m-3 5v5h3" />
      </svg>
    );
  }
  if (id === "org") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <rect {...common} x="9" y="2" width="6" height="3.4" rx="1" />
        <path {...common} d="M12 5.4v3M5 8.4h14M5 8.4V12m7-3.6V12m7-3.6V12" />
        <rect {...common} x="2.5" y="12" width="5" height="3.4" rx="1" />
        <rect {...common} x="9.5" y="12" width="5" height="3.4" rx="1" />
        <rect {...common} x="16.5" y="12" width="5" height="3.4" rx="1" />
      </svg>
    );
  }
  if (id === "radial") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <circle {...common} cx="12" cy="9" r="2.6" />
        <circle {...common} cx="4" cy="4" r="1.6" />
        <circle {...common} cx="20" cy="4" r="1.6" />
        <circle {...common} cx="4" cy="14" r="1.6" />
        <circle {...common} cx="20" cy="14" r="1.6" />
        <path {...common} d="m10 7-4-2m8 2 4-2m-8 4-4 2m8-2 4 2" />
      </svg>
    );
  }
  if (id === "arc") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M4 13C6 5 18 5 20 13" />
        <circle {...common} cx="12" cy="15.2" r="1.5" />
        <circle {...common} cx="7" cy="8.2" r="1.2" />
        <circle {...common} cx="12" cy="6" r="1.2" />
        <circle {...common} cx="17" cy="8.2" r="1.2" />
        <path {...common} d="M12 13.7V7.2M12 13.7 8.2 9.1M12 13.7 15.8 9.1" />
      </svg>
    );
  }
  if (id === "timeline") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M2 9h20M6 9V4m6 5v5m6-5V4" />
        <circle {...common} cx="6" cy="9" r="1.1" />
        <circle {...common} cx="12" cy="9" r="1.1" />
        <circle {...common} cx="18" cy="9" r="1.1" />
      </svg>
    );
  }
  if (id === "stairs") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M3 15h4v-4h4V7h4V3h4" />
        <path {...common} d="M3 15h4m0-4h4m0-4h4m0-4h4" />
      </svg>
    );
  }
  if (id === "outline") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M4 3h3M4 7h3M4 11h3M4 15h3M9 3h11M9 7h8M9 11h11M9 15h8" />
      </svg>
    );
  }
  if (id === "fishbone") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <path {...common} d="M2 9h20M7 9 4 4m5 5 3-5m-2 5-3 5m5-5 3 5M17 4h3M17 14h3" />
      </svg>
    );
  }
  if (id === "columns") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <rect {...common} x="2.5" y="3" width="5" height="12" rx="1.2" />
        <rect {...common} x="9.5" y="3" width="5" height="12" rx="1.2" />
        <rect {...common} x="16.5" y="3" width="5" height="12" rx="1.2" />
        <path {...common} d="M5 6h0m0 3h0m7-3h0m0 3h0m7-3h0m0 3h0" />
      </svg>
    );
  }
  if (id === "lanes") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <rect {...common} x="2.5" y="3" width="4" height="3" rx="1" />
        <rect {...common} x="2.5" y="7.5" width="4" height="3" rx="1" />
        <rect {...common} x="2.5" y="12" width="4" height="3" rx="1" />
        <path {...common} d="M7 4.5h13M7 9h13M7 13.5h13" />
      </svg>
    );
  }
  if (id === "matrix") {
    return (
      <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
        <rect {...common} x="2.5" y="2.5" width="8" height="5.5" rx="1.2" />
        <rect {...common} x="13.5" y="2.5" width="8" height="5.5" rx="1.2" />
        <rect {...common} x="2.5" y="10" width="8" height="5.5" rx="1.2" />
        <rect {...common} x="13.5" y="10" width="8" height="5.5" rx="1.2" />
        <path {...common} d="M4.5 5.2h4m5 0h4m-13 7.5h4m5 0h4" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 18" className={className} aria-hidden="true">
      <path {...common} d="M20 9h-5M15 9V4H8m7 5v5H8M8 4V2m0 2v2m0 5v-2m0 2v2" />
    </svg>
  );
}

export default function MindMapView({ map }: Props) {
  const tree = useMemo(() => buildTree(map.root), [map]);
  const [collapsed, setCollapsed] = useState<Set<string>>(() => defaultCollapsed(tree));
  const [template, setTemplate] = useState<MindMapTemplate>(() => normalizeTemplate(map.template));
  const [view, setView] = useState({ x: 0, y: 0, k: 1 });
  const [dragging, setDragging] = useState(false);
  const [copyState, setCopyState] = useState<"idle" | "done" | "fail">("idle");
  const [fullscreen, setFullscreen] = useState(false);
  const [exporting, setExporting] = useState<"" | "svg" | "png" | "pdf">("");
  const [pdfProgress, setPdfProgress] = useState(0);
  const [exportError, setExportError] = useState("");
  const [exportOpen, setExportOpen] = useState(false);
  const [exportPos, setExportPos] = useState<{ left: number; top: number } | null>(null);

  const wrapRef = useRef<HTMLDivElement | null>(null);
  const exportRef = useRef<HTMLDivElement | null>(null);
  const exportBtnRef = useRef<HTMLButtonElement | null>(null);
  const exportMenuRef = useRef<HTMLDivElement | null>(null);
  const dragRef = useRef<{ x: number; y: number; vx: number; vy: number } | null>(null);
  const copyTimer = useRef<number | null>(null);

  useEffect(() => {
    setCollapsed(defaultCollapsed(tree));
  }, [tree]);

  useEffect(() => {
    setTemplate(normalizeTemplate(map.template));
  }, [map]);

  useEffect(() => {
    setCopyState("idle");
  }, [map]);

  useEffect(() => () => {
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
  }, []);

  useEffect(() => {
    if (!fullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setFullscreen(false);
    };
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = previous;
    };
  }, [fullscreen]);

  useEffect(() => {
    if (!exportOpen) return;
    const onDown = (e: PointerEvent) => {
      const target = e.target as Node;
      if (exportRef.current?.contains(target) || exportMenuRef.current?.contains(target)) return;
      setExportOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setExportOpen(false);
    };
    const onReposition = () => setExportOpen(false);
    window.addEventListener("pointerdown", onDown);
    window.addEventListener("keydown", onKey);
    window.addEventListener("resize", onReposition);
    window.addEventListener("scroll", onReposition, true);
    return () => {
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("resize", onReposition);
      window.removeEventListener("scroll", onReposition, true);
    };
  }, [exportOpen]);

  const direction = useMemo(() => mapDirection(map), [map]);
  const layout = useMemo(
    () => layoutMindMap(tree, template, collapsed, direction),
    [tree, template, collapsed, direction],
  );
  const fullLayout = useMemo(
    () => layoutMindMap(tree, template, new Set(), direction),
    [tree, template, direction],
  );

  const fitView = useCallback((minScale = READABLE_MIN_ZOOM) => {
    const el = wrapRef.current;
    if (!el) return;
    const next = fitLayout(layout, el.clientWidth, el.clientHeight, Math.max(MIN_ZOOM, minScale));
    setView({ k: next.k, x: next.x, y: next.y });
  }, [layout]);

  const fit = useCallback(() => fitView(READABLE_MIN_ZOOM), [fitView]);
  const fitAll = useCallback(() => fitView(MIN_ZOOM), [fitView]);

  useLayoutEffect(() => {
    fitView(READABLE_MIN_ZOOM);
  }, [fitView, template]);

  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const rect = el.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      setView((v) => {
        const k = clamp(v.k * Math.exp(-e.deltaY * 0.0015), MIN_ZOOM, MAX_ZOOM);
        const ratio = k / v.k;
        return { k, x: mx - (mx - v.x) * ratio, y: my - (my - v.y) * ratio };
      });
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, []);

  const zoomBy = (factor: number) => {
    const el = wrapRef.current;
    const cw = el?.clientWidth ?? 800;
    const ch = el?.clientHeight ?? 560;
    setView((v) => {
      const k = clamp(v.k * factor, MIN_ZOOM, MAX_ZOOM);
      const ratio = k / v.k;
      const cx = cw / 2;
      const cy = ch / 2;
      return { k, x: cx - (cx - v.x) * ratio, y: cy - (cy - v.y) * ratio };
    });
  };

  const toggle = (id: string) => {
    setCollapsed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const expandAll = () => setCollapsed(new Set());

  const collapseAll = () => {
    setCollapsed(new Set(
      walkAll(tree)
        .filter((n) => n.depth >= 1 && n.children.length > 0)
        .map((n) => n.id),
    ));
  };

  const copyMarkdown = async () => {
    const text = mapToMarkdown(map);
    let ok = false;
    try {
      await navigator.clipboard.writeText(text);
      ok = true;
    } catch {
      try {
        const area = document.createElement("textarea");
        area.value = text;
        area.style.position = "fixed";
        area.style.opacity = "0";
        area.setAttribute("readonly", "");
        document.body.appendChild(area);
        area.focus();
        area.select();
        ok = document.execCommand("copy");
        document.body.removeChild(area);
      } catch {
        ok = false;
      }
    }
    if (!ok) {
      setCopyState("fail");
      if (copyTimer.current) window.clearTimeout(copyTimer.current);
      copyTimer.current = window.setTimeout(() => setCopyState("idle"), 2000);
      return;
    }
    setCopyState("done");
    if (copyTimer.current) window.clearTimeout(copyTimer.current);
    copyTimer.current = window.setTimeout(() => setCopyState("idle"), 1800);
  };

  const openExport = () => {
    if (exportOpen) {
      setExportOpen(false);
      return;
    }
    const btn = exportBtnRef.current;
    if (!btn) return;
    const r = btn.getBoundingClientRect();
    const width = 280;
    const margin = 10;
    const spaceRight = window.innerWidth - r.left - margin;
    const spaceLeft = r.right - margin;
    const left =
      spaceRight >= width || spaceRight >= spaceLeft
        ? clamp(r.left, margin, window.innerWidth - width - margin)
        : clamp(r.right - width, margin, window.innerWidth - width - margin);
    const estimatedH = 310;
    const below = r.bottom + 8;
    const top =
      below + estimatedH > window.innerHeight - margin
        ? Math.max(margin, r.top - estimatedH - 8)
        : below;
    setExportPos({ left, top });
    setExportOpen(true);
  };

  const runExport = async (kind: "svg" | "png" | "pdf") => {
    setExportError("");
    setExportOpen(false);
    setExporting(kind);
    setPdfProgress(0);
    try {
      if (kind === "svg") downloadSvg(map, fullLayout);
      else if (kind === "png") await downloadPng(map, fullLayout);
      else
        await downloadPdf(map, {
          template,
          templateName: activeTemplate.name,
          onProgress: (done, total) => {
            setPdfProgress(total ? Math.round((done / total) * 100) : 0);
          },
        });
    } catch {
      setExportError("تعذر التصدير. حاول مرة أخرى.");
    } finally {
      setExporting("");
      setPdfProgress(0);
    }
  };

  const onPointerDown = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (e.button !== 0) return;
    const target = e.target as HTMLElement;
    if (target.closest("[data-mm-tool]") || target.closest("[data-mm-card]")) return;
    dragRef.current = { x: e.clientX, y: e.clientY, vx: view.x, vy: view.y };
    e.currentTarget.setPointerCapture(e.pointerId);
    setDragging(true);
  };

  const onPointerMove = (e: ReactPointerEvent<HTMLDivElement>) => {
    const d = dragRef.current;
    if (!d) return;
    setView((v) => ({ ...v, x: d.vx + (e.clientX - d.x), y: d.vy + (e.clientY - d.y) }));
  };

  const endPan = (e: ReactPointerEvent<HTMLDivElement>) => {
    if (!dragRef.current) return;
    dragRef.current = null;
    setDragging(false);
    try { e.currentTarget.releasePointerCapture(e.pointerId); } catch { /* ignore */ }
  };

  const branches = map.root.children?.length ?? 0;
  const suggestedTemplate = normalizeTemplate(map.template);
  const activeTemplate = MINDMAP_TEMPLATES.find((t) => t.id === template) ?? MINDMAP_TEMPLATES[0];

  const viewer = (
    <div
      dir="rtl"
      className={`overflow-hidden rounded-3xl border border-stone-800 bg-stone-950 ${
        fullscreen ? "fixed inset-2 z-[70] flex flex-col shadow-2xl shadow-black/80 sm:inset-4" : ""
      }`}
    >
      <div className="flex flex-col gap-3 border-b border-stone-900 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5">
        <div className="flex min-w-0 items-center gap-3">
          <div className="flex size-10 shrink-0 items-center justify-center rounded-2xl border border-violet-500/30 bg-gradient-to-br from-violet-500/25 to-sky-500/10 text-violet-200">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-5">
              <circle cx="12" cy="12" r="2.5" />
              <circle cx="5" cy="5" r="2" />
              <circle cx="19" cy="5" r="2" />
              <circle cx="5" cy="19" r="2" />
              <circle cx="19" cy="19" r="2" />
              <path strokeLinecap="round" d="m10.2 10.2-3.6-3.6M13.8 10.2l3.6-3.6M10.2 13.8l-3.6 3.6M13.8 13.8l3.6 3.6" />
            </svg>
          </div>
          <div className="min-w-0">
            <div className="truncate font-semibold text-white" dir="auto">{map.title || map.root.label}</div>
            <div className="mt-0.5 text-xs text-stone-500">
              {layout.total.toLocaleString("ar")} عقدة · {branches.toLocaleString("ar")} فروع رئيسية · {layout.visible.toLocaleString("ar")} ظاهرة الآن
            </div>
          </div>
        </div>
        <div className="flex flex-wrap shrink-0 items-center gap-1.5">
          <span className="hidden rounded-full border border-violet-500/20 bg-violet-500/10 px-2.5 py-1 text-[10px] text-violet-300 lg:inline-flex">
            خريطة تفاعلية
          </span>
          <button
            onClick={copyMarkdown}
            className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-medium transition-colors sm:px-3 ${
              copyState === "done"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : copyState === "fail"
                  ? "border-red-500/30 bg-red-500/10 text-red-300"
                  : "border-stone-700 bg-stone-900 text-stone-300 hover:bg-stone-800 hover:text-white"
            }`}
            title="نسخ الخريطة بصيغة Markdown"
          >
            {copyState === "done" ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="m4.5 12.75 6 6 9-13.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 7.5V6.108c0-1.135.845-2.098 1.976-2.192.373-.03.748-.057 1.123-.08M15.75 18H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08M15.75 18.75v-1.875a3.375 3.375 0 0 0-3.375-3.375h-1.5a1.125 1.125 0 0 1-1.125-1.125v-1.5A3.375 3.375 0 0 0 6.375 7.5H5.25m11.9-3.664A2.251 2.251 0 0 0 15 2.25h-1.5a2.251 2.251 0 0 0-2.15 1.586m5.8 0c.065.21.1.433.1.664v.75h-6V4.5c0-.231.035-.454.1-.664M6.75 7.5H4.875c-.621 0-1.125.504-1.125 1.125v12c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V16.5a9 9 0 0 0-9-9Z" />
              </svg>
            )}
            <span className="hidden sm:inline">
              {copyState === "done" ? "تم النسخ" : copyState === "fail" ? "تعذر النسخ" : "نسخ Markdown"}
            </span>
          </button>
          <div className="relative" ref={exportRef}>
            <button
              ref={exportBtnRef}
              onClick={openExport}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-semibold transition-colors sm:px-3 ${
                exportOpen
                  ? "border-violet-400/60 bg-violet-500/15 text-violet-100"
                  : "border-violet-500/30 bg-violet-500/10 text-violet-200 hover:border-violet-400/50 hover:bg-violet-500/20"
              }`}
              aria-haspopup="menu"
              aria-expanded={exportOpen}
              title="تصدير الخريطة"
            >
              {exporting ? (
                <span className="size-4 animate-spin rounded-full border-2 border-violet-300/30 border-t-violet-200" />
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 16.5m0 0L7.5 12m4.5 4.5V3" />
                </svg>
              )}
              <span>
                {exporting
                  ? exporting === "pdf" && pdfProgress > 0
                    ? `PDF ${pdfProgress.toLocaleString("ar")}٪`
                    : "جارٍ التصدير"
                  : "تصدير"}
              </span>
              <svg
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                className={`size-3.5 transition-transform duration-200 ${exportOpen ? "rotate-180" : ""}`}
              >
                <path strokeLinecap="round" strokeLinejoin="round" d="m6 9 6 6 6-6" />
              </svg>
            </button>
            {exportOpen && exportPos && createPortal(
              <div
                ref={exportMenuRef}
                role="menu"
                dir="rtl"
                style={{ left: exportPos.left, top: exportPos.top }}
                className="fixed z-[90] w-[17.5rem] overflow-hidden rounded-2xl border border-stone-700 bg-stone-950/95 p-1.5 shadow-2xl shadow-black/70 backdrop-blur-xl"
              >
                <div className="px-2.5 pb-2 pt-1.5">
                  <div className="text-[11px] font-semibold text-white">تصدير الخريطة</div>
                  <div className="mt-0.5 text-[10px] leading-relaxed text-stone-500">
                    نسخة فاتحة كاملة العقد، جاهزة للمشاركة أو الطباعة.
                  </div>
                </div>
                <div className="my-1 h-px bg-stone-800" />
                <button
                  role="menuitem"
                  onClick={() => void runExport("png")}
                  disabled={!!exporting}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-stone-800/80 disabled:opacity-50"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-sky-500/25 bg-sky-500/10 text-sky-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 15.75 5.159-5.159a2.25 2.25 0 0 1 3.182 0l5.159 5.159m-1.5-1.5 1.409-1.409a2.25 2.25 0 0 1 3.182 0l2.909 2.909M3.75 21h16.5A1.5 1.5 0 0 0 21.75 19.5V4.5A1.5 1.5 0 0 0 20.25 3H3.75A1.5 1.5 0 0 0 2.25 4.5v15A1.5 1.5 0 0 0 3.75 21Z" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-stone-100">
                      صورة PNG
                      {exporting === "png" && <span className="text-[10px] text-sky-300">جارٍ…</span>}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">دقة عالية، مناسبة للعرض والمشاركة</span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => void runExport("svg")}
                  disabled={!!exporting}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-stone-800/80 disabled:opacity-50"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-emerald-500/25 bg-emerald-500/10 text-emerald-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="m17.25 6.75 3 3-3 3m-10.5 0-3-3 3-3M14.25 4.5l-4.5 15" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-stone-100">
                      متجهات SVG
                      {exporting === "svg" && <span className="text-[10px] text-emerald-300">جارٍ…</span>}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">قابل للتكبير والتحرير دون فقدان الجودة</span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => void runExport("pdf")}
                  disabled={!!exporting}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-stone-800/80 disabled:opacity-50"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-rose-500/25 bg-rose-500/10 text-rose-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 0 0-9-9Z" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="flex items-center gap-1.5 text-xs font-medium text-stone-100">
                      PDF احترافي
                      {exporting === "pdf" && <span className="text-[10px] text-rose-300">جارٍ…</span>}
                    </span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">
                      غلاف + صفحات مفصّلة لكل فرع، بمقاس A4 جاهز للطباعة
                    </span>
                  </span>
                </button>
                <button
                  role="menuitem"
                  onClick={() => {
                    setExportOpen(false);
                    downloadMarkdown(map);
                  }}
                  className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-right transition-colors hover:bg-stone-800/80"
                >
                  <span className="mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-lg border border-amber-500/25 bg-amber-500/10 text-amber-300">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25H12" />
                    </svg>
                  </span>
                  <span className="min-w-0">
                    <span className="block text-xs font-medium text-stone-100">ملف Markdown</span>
                    <span className="mt-0.5 block text-[10px] text-stone-500">بنية هرمية نصية قابلة للتحرير</span>
                  </span>
                </button>
              </div>,
              document.body,
            )}
          </div>
          <button
            onClick={() => setFullscreen((v) => !v)}
            className="flex size-9 items-center justify-center rounded-xl border border-stone-700 bg-stone-900 text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
            title={fullscreen ? "إنهاء ملء الشاشة (Esc)" : "ملء الشاشة"}
            aria-label={fullscreen ? "إنهاء ملء الشاشة" : "ملء الشاشة"}
          >
            {fullscreen ? (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 9H5m4 0V5m0 4L4.5 4.5M15 9h4m-4 0V5m0 4 4.5-4.5M9 15H5m4 0v4m0-4-4.5 4.5M15 15h4m-4 0v4m0-4 4.5 4.5" />
              </svg>
            ) : (
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-4">
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 3H3m0 0v6m0-6 6 6M15 3h6m0 0v6m0-6-6 6M9 21H3m0 0v-6m0 6 6-6M15 21h6m0 0v-6m0 6-6-6" />
              </svg>
            )}
          </button>
        </div>
      </div>

      <div className="border-b border-stone-900 px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center justify-between gap-x-3 gap-y-1.5">
          <div className="flex min-w-0 items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[0.14em] text-stone-500">شكل الخريطة</span>
            <span className="rounded-full border border-amber-500/25 bg-amber-500/10 px-2 py-0.5 text-[10px] font-medium text-amber-200">
              {activeTemplate.name}
            </span>
          </div>
          <p className="hidden text-[10px] text-stone-500 sm:block">{activeTemplate.hint}</p>
        </div>
        <div className="mt-2.5 grid grid-cols-4 gap-1.5 sm:grid-cols-6">
          {MINDMAP_TEMPLATES.map((t) => {
            const active = t.id === template;
            const suggested = t.id === suggestedTemplate;
            return (
              <button
                key={t.id}
                data-mm-template={t.id}
                onClick={() => setTemplate(t.id)}
                className={`group relative flex flex-col items-center gap-1.5 rounded-xl border px-1 pb-1.5 pt-2 transition-all duration-200 ${
                  active
                    ? "border-amber-400/60 bg-gradient-to-b from-amber-400/15 to-amber-500/5 text-amber-100 shadow-[0_0_0_1px_rgba(251,191,36,0.08),0_8px_24px_-12px_rgba(251,191,36,0.5)]"
                    : "border-stone-800 bg-stone-900/60 text-stone-400 hover:-translate-y-0.5 hover:border-stone-600 hover:bg-stone-900 hover:text-stone-100"
                }`}
                title={`${t.name} — ${t.hint}${suggested ? " (النموذج المقترح)" : ""}`}
                aria-pressed={active}
              >
                <TemplateGlyph id={t.id} className="size-5" />
                <span className="w-full truncate text-center text-[10px] leading-tight">{t.name}</span>
                {suggested && (
                  <span
                    className="absolute right-1 top-1 size-1.5 rounded-full bg-violet-400 shadow-[0_0_0_2px_rgba(167,139,250,0.2)]"
                    title="النموذج المقترح من المحتوى"
                  />
                )}
              </button>
            );
          })}
        </div>
        <div className="mt-2 flex flex-wrap items-center justify-between gap-x-3 gap-y-1">
          <p className="text-[10px] text-stone-500 sm:hidden">{activeTemplate.hint}</p>
          <p className="text-[10px] text-stone-600">
            النقطة البنفسجية = الشكل المقترح تلقائيًا من المحتوى.
          </p>
        </div>
        {exportError && <p className="mt-1 text-[10px] text-red-300">{exportError}</p>}
      </div>

      <div
        ref={wrapRef}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        className={`studio-mm-canvas relative touch-none select-none overflow-hidden ${
          fullscreen ? "min-h-0 flex-1" : "h-[440px] sm:h-[600px]"
        } ${dragging ? "cursor-grabbing" : "cursor-grab"}`}
      >
        <div
          className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.k})` }}
        >
          <svg
            width={layout.W}
            height={layout.H}
            className="pointer-events-none absolute left-0 top-0 overflow-visible"
            aria-hidden="true"
          >
            {layout.links.map((link, i) => (
              <path
                key={link.id}
                d={link.d}
                pathLength={1}
                fill="none"
                strokeWidth={1.7}
                strokeLinecap="round"
                className={`studio-mm-edge ${DEPTH_EDGE[Math.min(link.depth, 3)]}`}
                style={{ animationDelay: `${Math.min(560, link.depth * 90 + i * 12)}ms` }}
              />
            ))}
          </svg>

          {layout.nodes.map((node, i) => {
            const d = Math.min(node.depth, 3);
            const hasKids = node.children.length > 0;
            const isCollapsed = collapsed.has(node.id);
            return (
              <div
                key={node.id}
                data-mm-card
                role={hasKids ? "button" : undefined}
                tabIndex={hasKids ? 0 : undefined}
                aria-expanded={hasKids ? !isCollapsed : undefined}
                title={node.label}
                onClick={hasKids ? () => toggle(node.id) : undefined}
                onKeyDown={hasKids ? (e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(node.id);
                  }
                } : undefined}
                className={`studio-mm-node group absolute rounded-2xl border px-3.5 transition-colors duration-200 ${
                  DEPTH_CARD[d]
                } ${hasKids ? "cursor-pointer" : ""}`}
                style={{
                  left: node.x,
                  top: node.y,
                  width: node.w,
                  height: node.h,
                  animationDelay: `${Math.min(520, d * 110 + i * 22)}ms`,
                }}
              >
                {d === 0 ? (
                  <div className="flex h-full flex-col items-center justify-center text-center">
                    <span className="mb-1 text-[8.5px] font-medium uppercase tracking-[0.18em] text-violet-200/70">
                      الموضوع الرئيسي
                    </span>
                    <span className="line-clamp-2 text-[15px] font-semibold leading-snug" dir="auto">
                      {node.label}
                    </span>
                  </div>
                ) : (
                  <div className="flex h-full items-center gap-2.5">
                    <span className={`size-2 shrink-0 rounded-full ${DEPTH_DOT[d]}`} />
                    <span className={`line-clamp-2 min-w-0 flex-1 leading-snug ${DEPTH_TEXT[d]}`} dir="auto">
                      {node.label}
                    </span>
                  </div>
                )}
                {hasKids && (
                  <span
                    className={`absolute -left-3 top-1/2 flex -translate-y-1/2 items-center justify-center rounded-full border font-semibold tabular-nums shadow-lg transition-colors ${
                      isCollapsed
                        ? "size-6 border-sky-400/40 bg-sky-500/20 text-[9px] text-sky-200 group-hover:bg-sky-500/35"
                        : "size-5 border-stone-700 bg-stone-900 text-[11px] text-stone-400 group-hover:text-white"
                    }`}
                    title={isCollapsed ? "توسيع الفرع" : "طيّ الفرع"}
                  >
                    {isCollapsed ? node.children.length.toLocaleString("ar") : "−"}
                  </span>
                )}
              </div>
            );
          })}
        </div>

        <div
          data-mm-tool
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute left-3 top-3 z-20 flex items-center gap-1 rounded-2xl border border-stone-800 bg-stone-950/90 p-1.5 shadow-xl backdrop-blur-md"
        >
          <button
            onClick={() => zoomBy(0.85)}
            className="flex size-7 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
            title="تصغير"
            aria-label="تصغير"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
              <path strokeLinecap="round" d="M5 12h14" />
            </svg>
          </button>
          <button
            onClick={fit}
            className="min-w-11 rounded-lg px-1 py-1 text-[10px] tabular-nums text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
            title="ملاءمة مقروءة"
          >
            {Math.round(view.k * 100)}%
          </button>
          <button
            onClick={() => zoomBy(1.18)}
            className="flex size-7 items-center justify-center rounded-lg text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
            title="تكبير"
            aria-label="تكبير"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-3.5">
              <path strokeLinecap="round" d="M12 5v14M5 12h14" />
            </svg>
          </button>
          <button
            onClick={fitAll}
            className="flex size-7 items-center justify-center rounded-lg text-stone-400 transition-colors hover:bg-stone-800 hover:text-white"
            title="عرض الخريطة كاملة"
            aria-label="عرض الخريطة كاملة"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="size-3.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 9V4h5M20 15v5h-5M4 4l6 6m10 10-6-6" />
            </svg>
          </button>
          <span className="mx-0.5 h-5 w-px bg-stone-800" />
          <button
            onClick={expandAll}
            className="rounded-lg px-2 py-1 text-[10px] text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
          >
            توسيع الكل
          </button>
          <button
            onClick={collapseAll}
            className="rounded-lg px-2 py-1 text-[10px] text-stone-300 transition-colors hover:bg-stone-800 hover:text-white"
          >
            طيّ الفروع
          </button>
        </div>

        <div className="pointer-events-none absolute inset-x-0 bottom-3 z-10 hidden justify-center px-3 sm:flex">
          <span className="rounded-full border border-stone-800/80 bg-stone-950/85 px-3 py-1.5 text-[10px] text-stone-500 backdrop-blur">
            انقر فرعًا لطيّه أو توسيعه · اسحب للتنقل · عجلة الفأرة للتكبير
          </span>
        </div>
      </div>
    </div>
  );

  return fullscreen ? createPortal(viewer, document.body) : viewer;
}
