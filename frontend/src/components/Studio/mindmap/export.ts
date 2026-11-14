import type { MindMapNode, MindMapTemplate, StudioMindMap } from "../../../lib/api";
import type { FlatNode, Layout, TreeNode } from "./layout";
import { MINDMAP_TEMPLATES, layoutMindMap, normalizeTemplate } from "./layout";
import { mapDirection, textDirection, type TextDirection } from "./direction";

const FONT = '"Segoe UI", Tahoma, Arial, sans-serif';
const PAGE_BG = "#fafaf9";
const TOP = 58;

const NODE_STYLE = [
  { fill: "#6d28d9", stroke: "#5b21b6", text: "#ffffff", sub: "#ddd6fe" },
  { fill: "#ede9fe", stroke: "#a78bfa", text: "#3b0764", sub: "#6d28d9" },
  { fill: "#f0f9ff", stroke: "#7dd3fc", text: "#0c4a6e", sub: "#0284c7" },
  { fill: "#f0fdf4", stroke: "#86efac", text: "#14532d", sub: "#15803d" },
];
const EDGE_STYLE = ["#a78bfa", "#93c5fd", "#86efac", "#fcd34d"];
const FONT_SIZE = [17, 14, 12.5, 11.5];

/* ------------------------------------------------------------ print look ---- */

const PAPER = "#fbfaf8";
const CARD = "#ffffff";
const INK = "#1c1917";
const MUTED = "#78716c";
const FAINT = "#a8a29e";
const HAIR = "#e7e5e4";
const ACCENT = "#6d28d9";
const ACCENT_DARK = "#4c1d95";
const ACCENT_SOFT = "#f5f3ff";
const SKY = "#0284c7";

const PAGE_W = 794;
const PAGE_H = 1123;
const LAND_W = 1123;
const LAND_H = 794;
const PAGE_SCALE = 2.4;
const MARGIN = 46;
const CONTENT_W = PAGE_W - MARGIN * 2;

const PDF_W = 595.28;
const PDF_H = 841.89;

const DETAIL_FONT_SCALE = 1.1;
const DETAIL_MIN_FIT = 0.88;
const SINGLE_MIN_FIT = 0.93;

const DETAIL_MARGIN = 44;
const DETAIL_INNER_PAD = 24;
const DETAIL_CARD_TOP = 200;
const DETAIL_CARD_BOTTOM = LAND_H - 64;
const DETAIL_MAP_W = LAND_W - DETAIL_MARGIN * 2 - DETAIL_INNER_PAD * 2;
const DETAIL_MAP_H = DETAIL_CARD_BOTTOM - DETAIL_CARD_TOP - DETAIL_INNER_PAD * 2;
const SINGLE_MAP_W = CONTENT_W - DETAIL_INNER_PAD * 2;
const SINGLE_MAP_H = 770;

const DETAIL_PDF_W = PDF_H;
const DETAIL_PDF_H = PDF_W;

function clampDepth(d: number) {
  return Math.min(Math.max(d, 0), 3);
}

function esc(s: string) {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

function wrapLabel(label: string, width: number, fontSize: number, maxLines = 3): string[] {
  const text = String(label ?? "").replace(/\s+/g, " ").trim();
  if (!text) return [""];
  const maxChars = Math.max(4, Math.floor((width - 18) / (fontSize * 0.56)));
  const words = text.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (next.length <= maxChars) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    if (word.length > maxChars) {
      let rest = word;
      while (rest.length > maxChars) {
        lines.push(rest.slice(0, maxChars));
        rest = rest.slice(maxChars);
      }
      line = rest;
    } else {
      line = word;
    }
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines;
  const kept = lines.slice(0, maxLines);
  kept[maxLines - 1] = `${kept[maxLines - 1].slice(0, Math.max(4, maxChars - 1)).trimEnd()}…`;
  return kept;
}

export function mapToMarkdown(map: StudioMindMap): string {
  const lines = [`# ${map.title || map.root.label}`, ""];
  const walk = (node: MindMapNode, depth: number) => {
    lines.push(`${"  ".repeat(depth)}- ${String(node.label ?? "").trim()}`);
    for (const child of node.children ?? []) walk(child, depth + 1);
  };
  walk(map.root, 0);
  return lines.join("\n");
}

/* ------------------------------------------------------------- svg render ---- */

type SvgRenderOptions = {
  title?: string | null;
  background?: string | null;
  fontScale?: number;
  rootCaption?: string | null;
};

function nodeSvg(node: FlatNode, opts: { fontScale: number; rootCaption: string | null }): string {
  const d = clampDepth(node.depth);
  const style = NODE_STYLE[d];
  const baseSize = FONT_SIZE[d] * opts.fontScale;
  const caption = d === 0 ? opts.rootCaption : null;
  const shift = d === 0 && caption ? 8 : 0;
  const lineInfo = (fontSize: number, tight = false) => {
    const lineHeight = fontSize * (tight ? 1.2 : 1.35);
    const pad = tight ? 3 : caption ? 26 : 10;
    const maxLines = Math.max(
      1,
      Math.min(3, Math.floor((node.h - pad) / lineHeight)),
    );
    return {
      lines: wrapLabel(node.label, node.w, fontSize, d === 0 && caption ? Math.min(2, maxLines) : maxLines),
      lineHeight,
    };
  };

  let fontSize = baseSize;
  let { lines, lineHeight } = lineInfo(fontSize);
  if (d > 0 && lines.some((line) => line.endsWith("…"))) {
    const smallerSize = baseSize * 0.82;
    const smaller = lineInfo(smallerSize, true);
    if (smaller.lines.join("").length > lines.join("").length) {
      fontSize = smallerSize;
      lines = smaller.lines;
      lineHeight = smaller.lineHeight;
    }
  }

  const cx = node.x + node.w / 2;
  const cy = node.y + node.h / 2;
  const firstDy = -((lines.length - 1) * lineHeight) / 2 + shift;
  const radius = d === 0 ? 20 : 14;
  const dir = textDirection(node.label);
  const tspans = lines
    .map(
      (line, i) =>
        `<tspan x="${cx.toFixed(1)}" dy="${(i === 0 ? firstDy : lineHeight).toFixed(1)}">${esc(line)}</tspan>`,
    )
    .join("");

  return `<g>
    <rect x="${node.x.toFixed(1)}" y="${node.y.toFixed(1)}" width="${node.w}" height="${node.h}" rx="${radius}" fill="${style.fill}" stroke="${style.stroke}" stroke-width="${d === 0 ? 2 : 1.4}" />
    <text x="${cx.toFixed(1)}" y="${cy.toFixed(1)}" text-anchor="middle" dominant-baseline="middle" direction="${dir}" unicode-bidi="plaintext" font-family='${FONT}' font-size="${fontSize.toFixed(1)}" font-weight="${d === 0 ? 700 : 600}" fill="${style.text}" style="direction:${dir};unicode-bidi:isolate">${tspans}</text>
    ${
      caption
        ? `<text x="${cx.toFixed(1)}" y="${(node.y + 14).toFixed(1)}" text-anchor="middle" direction="rtl" font-family='${FONT}' font-size="8.5" letter-spacing="1.4" fill="${style.sub}">${esc(caption)}</text>`
        : ""
    }
  </g>`;
}

function renderSvg(layout: Layout, options: SvgRenderOptions): string {
  const title = options.title ?? null;
  const background = options.background === undefined ? PAGE_BG : options.background;
  const fontScale = options.fontScale ?? 1;
  const rootCaption = options.rootCaption === undefined ? "الموضوع الرئيسي" : options.rootCaption;
  const top = title ? TOP : 0;
  const height = layout.H + top;
  const titleDir = title ? textDirection(title) : "rtl";
  const edges = layout.links
    .map((l) => {
      const d = clampDepth(l.depth);
      return `<path d="${l.d}" fill="none" stroke="${EDGE_STYLE[d]}" stroke-width="${Math.max(1.2, 2.4 - d * 0.35).toFixed(2)}" stroke-linecap="round" />`;
    })
    .join("");

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${layout.W}" height="${height}" viewBox="0 0 ${layout.W} ${height}">
  ${background ? `<rect width="${layout.W}" height="${height}" fill="${background}" />` : ""}
  ${title ? `<text x="${layout.W / 2}" y="32" text-anchor="middle" direction="${titleDir}" unicode-bidi="plaintext" font-family='${FONT}' font-size="19" font-weight="700" fill="#1c1917" style="direction:${titleDir};unicode-bidi:isolate">${esc(title)}</text>` : ""}
  <g transform="translate(0 ${top})">
    ${edges}
    ${layout.nodes.map((node) => nodeSvg(node, { fontScale, rootCaption })).join("\n    ")}
  </g>
</svg>`;
}

export function buildMindMapSvg(
  map: StudioMindMap,
  layout: Layout,
  options: SvgRenderOptions = {},
): string {
  return renderSvg(layout, {
    title: options.title === undefined ? map.title || map.root.label : options.title,
    background: options.background,
    fontScale: options.fontScale,
    rootCaption: options.rootCaption,
  });
}

function safeName(map: StudioMindMap) {
  return (
    String(map.title || map.root.label || "mindmap")
      .replace(/[\\/:*?"<>|]+/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, 60) || "mindmap"
  );
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 4000);
}

export function downloadMarkdown(map: StudioMindMap) {
  downloadBlob(new Blob([mapToMarkdown(map)], { type: "text/markdown;charset=utf-8" }), `${safeName(map)}.md`);
}

export function downloadSvg(map: StudioMindMap, layout: Layout) {
  downloadBlob(new Blob([buildMindMapSvg(map, layout)], { type: "image/svg+xml;charset=utf-8" }), `${safeName(map)}.svg`);
}

type RasterOptions = {
  background?: string | null;
  maxScale?: number;
  maxSide?: number;
  targetW?: number;
  targetH?: number;
};

async function svgToCanvas(svg: string, opts: RasterOptions = {}): Promise<HTMLCanvasElement> {
  const blob = new Blob([svg], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  try {
    const img = new Image();
    img.decoding = "async";
    await new Promise<void>((resolve, reject) => {
      img.onload = () => resolve();
      img.onerror = () => reject(new Error("SVG render failed"));
      img.src = url;
    });
    const longest = Math.max(img.width, img.height, 1);
    const maxSide = opts.maxSide ?? 5600;
    const targetW = opts.targetW ?? 0;
    const targetH = opts.targetH ?? 0;
    let scale: number;
    if (targetW || targetH) {
      scale = Math.min(
        targetW ? targetW / Math.max(img.width, 1) : Number.POSITIVE_INFINITY,
        targetH ? targetH / Math.max(img.height, 1) : Number.POSITIVE_INFINITY,
      );
    } else {
      scale = Math.min(opts.maxScale ?? 2.4, 4200 / longest);
    }
    if (!Number.isFinite(scale) || scale <= 0) scale = 1;
    scale = Math.min(scale, maxSide / longest);
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(img.width * scale));
    canvas.height = Math.max(1, Math.round(img.height * scale));
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas is unavailable");
    const background = opts.background === undefined ? PAGE_BG : opts.background;
    if (background) {
      ctx.fillStyle = background;
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    return canvas;
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function downloadPng(map: StudioMindMap, layout: Layout) {
  const canvas = await svgToCanvas(buildMindMapSvg(map, layout));
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!blob) throw new Error("PNG export failed");
  downloadBlob(blob, `${safeName(map)}.png`);
}

/* --------------------------------------------------------------- pdf core ---- */

type PdfPageImage = {
  jpeg: Uint8Array;
  width: number;
  height: number;
  pageW: number;
  pageH: number;
};

function latin1(s: string) {
  const out = new Uint8Array(s.length);
  for (let i = 0; i < s.length; i++) out[i] = s.charCodeAt(i) & 0xff;
  return out;
}

function concat(parts: Uint8Array[]) {
  const total = parts.reduce((s, p) => s + p.length, 0);
  const out = new Uint8Array(total);
  let offset = 0;
  for (const p of parts) {
    out.set(p, offset);
    offset += p.length;
  }
  return out;
}

function pdfTextString(value: string) {
  if (/^[\x20-\x7e]*$/.test(value)) {
    return `(${value.replace(/\\/g, "\\\\").replace(/\(/g, "\\(").replace(/\)/g, "\\)")})`;
  }
  let hex = "FEFF";
  for (let i = 0; i < value.length; i++) {
    hex += value.charCodeAt(i).toString(16).padStart(4, "0").toUpperCase();
  }
  return `<${hex}>`;
}

function pdfDate(date = new Date()) {
  const p = (n: number) => String(n).padStart(2, "0");
  const offset = -date.getTimezoneOffset();
  const sign = offset >= 0 ? "+" : "-";
  const abs = Math.abs(offset);
  return `D:${date.getFullYear()}${p(date.getMonth() + 1)}${p(date.getDate())}${p(date.getHours())}${p(date.getMinutes())}${p(date.getSeconds())}${sign}${p(Math.floor(abs / 60))}'${p(abs % 60)}'`;
}

function buildPdf(pages: PdfPageImage[], title: string, subject: string) {
  if (!pages.length) throw new Error("PDF export failed");
  const pageCount = pages.length;
  const size = 4 + pageCount * 3;
  const chunks: Uint8Array[] = [];
  const offsets: number[] = [0];
  let total = 0;
  const push = (bytes: Uint8Array) => {
    chunks.push(bytes);
    total += bytes.length;
  };
  const pushText = (s: string) => push(latin1(s));

  pushText("%PDF-1.4\n%\xE2\xE3\xCF\xD3\n");

  const obj = (n: number, body: string) => {
    offsets[n] = total;
    pushText(`${n} 0 obj\n${body}\nendobj\n`);
  };

  const kids = pages.map((_, i) => `${4 + i * 3} 0 R`).join(" ");

  obj(1, "<< /Type /Catalog /Pages 2 0 R /Lang (ar) /ViewerPreferences << /DisplayDocTitle true /PrintScaling /None /Direction /R2L >> >>");
  obj(2, `<< /Type /Pages /Kids [${kids}] /Count ${pageCount} >>`);

  const now = pdfDate();
  obj(
    3,
    `<< /Title ${pdfTextString(title)} /Author (PageLM) /Subject ${pdfTextString(subject)} /Keywords ${pdfTextString("mind map, PageLM, خريطة ذهنية")} /Creator (PageLM Studio) /Producer (PageLM) /CreationDate (${now}) /ModDate (${now}) >>`,
  );

  pages.forEach((page, i) => {
    const pageObj = 4 + i * 3;
    const imageObj = pageObj + 1;
    const contentObj = pageObj + 2;
    obj(
      pageObj,
      `<< /Type /Page /Parent 2 0 R /MediaBox [0 0 ${page.pageW} ${page.pageH}] /Resources << /XObject << /Im0 ${imageObj} 0 R >> >> /Contents ${contentObj} 0 R >>`,
    );

    offsets[imageObj] = total;
    pushText(`${imageObj} 0 obj\n`);
    pushText(
      `<< /Type /XObject /Subtype /Image /Width ${page.width} /Height ${page.height} /ColorSpace /DeviceRGB /BitsPerComponent 8 /Filter /DCTDecode /Length ${page.jpeg.length} >>\nstream\n`,
    );
    push(page.jpeg);
    pushText("\nendstream\nendobj\n");

    const content = `q\n${page.pageW} 0 0 ${page.pageH} 0 0 cm\n/Im0 Do\nQ\n`;
    obj(contentObj, `<< /Length ${latin1(content).length} >>\nstream\n${content}endstream`);
  });

  const xref = total;
  let table = `xref\n0 ${size}\n0000000000 65535 f \n`;
  for (let i = 1; i < size; i++) table += `${String(offsets[i]).padStart(10, "0")} 00000 n \n`;
  table += `trailer\n<< /Size ${size} /Root 1 0 R /Info 3 0 R >>\nstartxref\n${xref}\n%%EOF\n`;
  pushText(table);

  return new Blob([concat(chunks)], { type: "application/pdf" });
}

/* ----------------------------------------------------------- canvas tools ---- */

type PageCanvas = { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D };

function createPageCanvas(width = PAGE_W, height = PAGE_H): PageCanvas {
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(width * PAGE_SCALE);
  canvas.height = Math.round(height * PAGE_SCALE);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("Canvas is unavailable");
  ctx.scale(PAGE_SCALE, PAGE_SCALE);
  ctx.fillStyle = PAPER;
  ctx.fillRect(0, 0, width, height);
  ctx.textBaseline = "alphabetic";
  return { canvas, ctx };
}

function roundRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  const radius = Math.max(0, Math.min(r, w / 2, h / 2));
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + w, y, x + w, y + h, radius);
  ctx.arcTo(x + w, y + h, x, y + h, radius);
  ctx.arcTo(x, y + h, x, y, radius);
  ctx.arcTo(x, y, x + w, y, radius);
  ctx.closePath();
}

function formatNum(n: number) {
  return n.toLocaleString("ar-EG");
}

function formatDate(date = new Date()) {
  try {
    return new Intl.DateTimeFormat("ar-EG", {
      day: "numeric",
      month: "long",
      year: "numeric",
    }).format(date);
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

function setFont(ctx: CanvasRenderingContext2D, size: number, weight: number) {
  ctx.font = `${weight} ${size}px ${FONT}`;
}

type DrawTextOptions = {
  size: number;
  weight?: number;
  color?: string;
  align?: CanvasTextAlign;
  dir?: CanvasDirection;
  maxWidth?: number;
};

function drawText(ctx: CanvasRenderingContext2D, text: string, x: number, y: number, opts: DrawTextOptions) {
  ctx.save();
  setFont(ctx, opts.size, opts.weight ?? 400);
  ctx.fillStyle = opts.color ?? INK;
  ctx.textAlign = opts.align ?? "right";
  ctx.direction = opts.dir ?? "rtl";
  if (opts.maxWidth) ctx.fillText(text, x, y, opts.maxWidth);
  else ctx.fillText(text, x, y);
  ctx.restore();
}

function measureText(ctx: CanvasRenderingContext2D, text: string, size: number, weight = 400) {
  ctx.save();
  setFont(ctx, size, weight);
  ctx.direction = "rtl";
  const width = ctx.measureText(text).width;
  ctx.restore();
  return width;
}

function fitText(ctx: CanvasRenderingContext2D, text: string, maxWidth: number, size: number, weight = 400) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (measureText(ctx, value, size, weight) <= maxWidth) return value;
  let out = value;
  while (out.length > 1 && measureText(ctx, `${out}…`, size, weight) > maxWidth) {
    out = out.slice(0, -1);
  }
  return `${out.trimEnd()}…`;
}

function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  start: number,
  min: number,
  weight = 700,
) {
  let size = start;
  while (size > min && measureText(ctx, text, size, weight) > maxWidth) size -= 0.5;
  return size;
}

function wrapCanvasText(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  size: number,
  weight: number,
  maxLines: number,
) {
  const value = String(text ?? "").replace(/\s+/g, " ").trim();
  if (!value) return [""];
  ctx.save();
  setFont(ctx, size, weight);
  ctx.direction = "rtl";
  const words = value.split(" ");
  const lines: string[] = [];
  let line = "";
  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (!line || ctx.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length > maxLines) {
    const kept = lines.slice(0, maxLines);
    let last = kept[maxLines - 1];
    while (last.length > 1 && ctx.measureText(`${last}…`).width > maxWidth) last = last.slice(0, -1);
    kept[maxLines - 1] = `${last.trimEnd()}…`;
    lines.length = 0;
    lines.push(...kept);
  }
  ctx.restore();
  return lines;
}

function drawTextLines(
  ctx: CanvasRenderingContext2D,
  lines: string[],
  x: number,
  top: number,
  opts: DrawTextOptions & { lineHeight: number },
) {
  lines.forEach((line, i) => {
    drawText(ctx, line, x, top + opts.size * 0.82 + i * opts.lineHeight, opts);
  });
  return lines.length * opts.lineHeight;
}

function drawPageChrome(
  ctx: CanvasRenderingContext2D,
  pageW: number,
  pageH: number,
  pageNo: number,
  pageCount: number,
  footerRight: string,
  topRight: string,
  compact = false,
) {
  const margin = compact ? DETAIL_MARGIN : MARGIN;
  const contentW = pageW - margin * 2;
  const topBase = compact ? 43 : 58.5;
  const gradient = ctx.createLinearGradient(pageW, 0, 0, 0);
  gradient.addColorStop(0, ACCENT);
  gradient.addColorStop(0.55, "#7c3aed");
  gradient.addColorStop(1, SKY);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, pageW, 4);

  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, margin, topBase - 8.5, 7, 7, 1.5);
  ctx.fill();
  drawText(ctx, "PageLM", margin + 13, topBase, {
    size: 10.5,
    weight: 700,
    color: INK,
    align: "left",
    dir: "ltr",
  });
  drawText(ctx, topRight, pageW - margin, topBase, {
    size: 8.6,
    color: FAINT,
    dir: textDirection(topRight),
  });

  ctx.fillStyle = HAIR;
  ctx.fillRect(margin, pageH - (compact ? 47 : 54), contentW, 1);
  drawText(
    ctx,
    fitText(ctx, footerRight, contentW - 110, 8.5),
    pageW - margin,
    pageH - (compact ? 27 : 32),
    { size: 8.5, color: FAINT, dir: textDirection(footerRight) },
  );
  drawText(ctx, `صفحة ${formatNum(pageNo)} من ${formatNum(pageCount)}`, margin, pageH - (compact ? 27 : 32), {
    size: 8.5,
    weight: 600,
    color: MUTED,
    align: "left",
  });
}

function sectionLabel(ctx: CanvasRenderingContext2D, text: string, y: number, note?: string) {
  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, PAGE_W - MARGIN - 3, y - 9, 3, 12, 1.5);
  ctx.fill();
  drawText(ctx, text, PAGE_W - MARGIN - 12, y, { size: 10.5, weight: 700, color: INK });
  if (note) {
    drawText(ctx, note, MARGIN, y, { size: 8.5, color: FAINT, align: "left" });
  }
}

function drawCard(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, radius = 16) {
  ctx.save();
  ctx.shadowColor = "rgba(28,25,23,0.06)";
  ctx.shadowBlur = 18;
  ctx.shadowOffsetY = 5;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.fillStyle = CARD;
  ctx.fill();
  ctx.restore();
  ctx.strokeStyle = HAIR;
  ctx.lineWidth = 1;
  roundRectPath(ctx, x, y, w, h, radius);
  ctx.stroke();
}

async function drawMapInRect(
  ctx: CanvasRenderingContext2D,
  svg: string,
  x: number,
  y: number,
  w: number,
  h: number,
) {
  if (w < 4 || h < 4) return;
  const mapCanvas = await svgToCanvas(svg, {
    targetW: Math.round(w * PAGE_SCALE),
    targetH: Math.round(h * PAGE_SCALE),
    background: null,
    maxSide: 6400,
  });
  const dw = mapCanvas.width / PAGE_SCALE;
  const dh = mapCanvas.height / PAGE_SCALE;
  ctx.drawImage(mapCanvas, x + (w - dw) / 2, y + (h - dh) / 2, dw, dh);
}

function pageToImage(canvas: HTMLCanvasElement, pageW: number, pageH: number): PdfPageImage {
  const dataUrl = canvas.toDataURL("image/jpeg", 0.92);
  const base64 = dataUrl.slice(dataUrl.indexOf(",") + 1);
  const binary = atob(base64);
  const jpeg = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) jpeg[i] = binary.charCodeAt(i);
  return { jpeg, width: canvas.width, height: canvas.height, pageW, pageH };
}

/* --------------------------------------------------------------- planning ---- */

type DetailPagePlan = {
  root: TreeNode;
  layout: Layout;
  crumbs: string[];
  branch: TreeNode;
  branchIndex: number;
  part: number;
  partTotal: number;
};

type BranchPlan = {
  branch: TreeNode;
  index: number;
  start: number;
  count: number;
  nodes: number;
  directChildren: number;
};

type SinglePageMode = "portrait" | "landscape" | null;

type DocumentPlan = {
  single: SinglePageMode;
  fullLayout: Layout;
  detailPages: DetailPagePlan[];
  branches: BranchPlan[];
  totalPages: number;
  detailTemplate: MindMapTemplate;
  usesPrintLayout: boolean;
};

type DetailPlan = {
  detailPages: DetailPagePlan[];
  branches: BranchPlan[];
};

function treeFrom(node: MindMapNode, depth = 0, counter = { n: 0 }): TreeNode {
  const label = String(node?.label ?? "").replace(/\s+/g, " ").trim() || "…";
  const children = Array.isArray(node?.children)
    ? node.children
        .filter((child) => child && String(child?.label ?? "").trim())
        .map((child) => treeFrom(child, depth + 1, counter))
    : [];
  return { id: `pdf-${counter.n++}`, label, depth, children };
}

/**
 * The cover page is a printed overview, not a miniature of the whole map.
 * Showing only the root and the main branches keeps every label readable; the
 * detail pages carry the full branch content.
 */
export function overviewMap(map: StudioMindMap): StudioMindMap {
  const branches = (map.root.children ?? [])
    .map((branch) => String(branch?.label ?? "").replace(/\s+/g, " ").trim())
    .filter(Boolean)
    .map((label) => ({ label }));
  return {
    title: map.title,
    template: "tree",
    root: {
      label:
        String(map.root.label ?? map.title ?? "")
          .replace(/\s+/g, " ")
          .trim() || "…",
      children: branches,
    },
  };
}

function withDepth(node: TreeNode, depth = 0): TreeNode {
  return { ...node, depth, children: node.children.map((child) => withDepth(child, depth + 1)) };
}

function countTree(node: TreeNode): number {
  return 1 + node.children.reduce((sum, child) => sum + countTree(child), 0);
}

function splitChildren(children: TreeNode[]): TreeNode[][] {
  const mid = Math.ceil(children.length / 2);
  return [children.slice(0, mid), children.slice(mid)].filter((chunk) => chunk.length > 0);
}

function planBranch(
  branch: TreeNode,
  template: MindMapTemplate,
  direction: TextDirection,
): DetailPagePlan[] {
  const pages: Omit<DetailPagePlan, "branch" | "branchIndex" | "part" | "partTotal">[] = [];
  const visit = (focus: TreeNode, crumbs: string[]) => {
    const layout = layoutMindMap(focus, template, new Set(), direction);
    const fit = Math.min(
      DETAIL_MAP_W / Math.max(1, layout.W),
      DETAIL_MAP_H / Math.max(1, layout.H),
    );
    if (fit >= DETAIL_MIN_FIT || focus.children.length === 0) {
      pages.push({ root: focus, layout, crumbs });
      return;
    }
    if (focus.children.length === 1) {
      const only = focus.children[0];
      visit(withDepth(only, 0), [...crumbs, focus.label]);
      return;
    }
    for (const chunk of splitChildren(focus.children)) {
      visit(withDepth({ ...focus, children: chunk }, 0), crumbs);
    }
  };
  visit(withDepth(branch, 0), []);
  return pages.map((page, i) => ({
    ...page,
    branch,
    branchIndex: 0,
    part: i + 1,
    partTotal: pages.length,
  }));
}

function buildDetailPlan(
  branches: TreeNode[],
  template: MindMapTemplate,
  direction: TextDirection,
): DetailPlan {
  const detailPages: DetailPagePlan[] = [];
  const branchPlans: BranchPlan[] = [];
  branches.forEach((branch, index) => {
    const branchPages = planBranch(branch, template, direction).map((page) => ({
      ...page,
      branch,
      branchIndex: index,
    }));
    const start = detailPages.length + 2;
    detailPages.push(...branchPages);
    branchPlans.push({
      branch,
      index,
      start,
      count: branchPages.length,
      nodes: countTree(branch),
      directChildren: branch.children.length,
    });
  });
  return { detailPages, branches: branchPlans };
}

function planScore(plan: DetailPlan) {
  const sparse = plan.detailPages.filter((page) => countTree(page.root) < 4).length;
  return plan.detailPages.length * 10 + sparse;
}

function planDocument(
  map: StudioMindMap,
  fullLayout: Layout,
  template: MindMapTemplate,
  direction: TextDirection,
): DocumentPlan {
  const tree = treeFrom(map.root);
  const branches = tree.children;
  const portraitFit = Math.min(
    SINGLE_MAP_W / Math.max(1, fullLayout.W),
    SINGLE_MAP_H / Math.max(1, fullLayout.H),
  );
  const landscapeFit = Math.min(
    DETAIL_MAP_W / Math.max(1, fullLayout.W),
    DETAIL_MAP_H / Math.max(1, fullLayout.H),
  );
  const single: SinglePageMode = !branches.length
    ? portraitFit >= SINGLE_MIN_FIT
      ? "portrait"
      : "landscape"
    : portraitFit >= SINGLE_MIN_FIT
      ? "portrait"
      : landscapeFit >= SINGLE_MIN_FIT
        ? "landscape"
        : null;

  if (single) {
    return {
      single,
      fullLayout,
      detailPages: [],
      branches: [],
      totalPages: 1,
      detailTemplate: template,
      usesPrintLayout: false,
    };
  }

  let detail = buildDetailPlan(branches, template, direction);
  let detailTemplate = template;

  // Wide radial/fishbone/balanced layouts split into many sparse pages. For
  // printing, a compact tree or column layout keeps every branch readable.
  if (template !== "tree" && template !== "columns") {
    const treePlan = buildDetailPlan(branches, "tree", direction);
    if (planScore(treePlan) < planScore(detail)) {
      detail = treePlan;
      detailTemplate = "tree";
    }
    const columnsPlan = buildDetailPlan(branches, "columns", direction);
    if (planScore(columnsPlan) < planScore(detail)) {
      detail = columnsPlan;
      detailTemplate = "columns";
    }
  }

  return {
    single: null,
    fullLayout,
    detailPages: detail.detailPages,
    branches: detail.branches,
    totalPages: 1 + detail.detailPages.length,
    detailTemplate,
    usesPrintLayout: detailTemplate !== template,
  };
}

/* ---------------------------------------------------------------- render ----- */

type RenderCommon = {
  title: string;
  templateName: string;
  detailName: string;
  totalNodes: number;
  totalPages: number;
  usesPrintLayout: boolean;
};

async function renderSinglePage(
  map: StudioMindMap,
  layout: Layout,
  template: MindMapTemplate,
  common: RenderCommon,
) {
  const { canvas, ctx } = createPageCanvas();
  const branchCount = map.root.children?.length ?? 0;
  drawPageChrome(ctx, PAGE_W, PAGE_H, 1, 1, common.title, `القالب · ${common.templateName}`);

  drawText(ctx, "خريطة ذهنية · مستند كامل", PAGE_W - MARGIN, 94, {
    size: 9.5,
    weight: 600,
    color: ACCENT,
  });

  const titleTop = 110;
  const titleLines = wrapCanvasText(ctx, common.title, 650, 32, 700, 2);
  const titleH = drawTextLines(ctx, titleLines, PAGE_W - MARGIN, titleTop, {
    size: 32,
    weight: 700,
    lineHeight: 41,
    color: INK,
    dir: textDirection(common.title),
  });

  const meta = `${formatNum(common.totalNodes)} عقدة · ${formatNum(branchCount)} فروع رئيسية · ${common.templateName}`;
  const metaBaseline = titleTop + titleH + 16;
  drawText(ctx, fitText(ctx, meta, CONTENT_W, 9.5), PAGE_W - MARGIN, metaBaseline, {
    size: 9.5,
    color: MUTED,
  });

  const cardTop = metaBaseline + 22;
  const cardBottom = PAGE_H - 72;
  const cardH = cardBottom - cardTop;
  drawCard(ctx, MARGIN, cardTop, CONTENT_W, cardH);

  const svg = buildMindMapSvg(map, layout, {
    title: null,
    background: null,
    fontScale: 1,
    rootCaption: "الموضوع الرئيسي",
  });
  await drawMapInRect(
    ctx,
    svg,
    MARGIN + DETAIL_INNER_PAD,
    cardTop + DETAIL_INNER_PAD,
    CONTENT_W - DETAIL_INNER_PAD * 2,
    cardH - DETAIL_INNER_PAD * 2,
  );

  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, PAGE_W - MARGIN - 54, cardTop - 15, 54, 2, 1);
  ctx.fill();

  return canvas;
}

async function renderSingleLandscape(
  map: StudioMindMap,
  layout: Layout,
  common: RenderCommon,
) {
  const { canvas, ctx } = createPageCanvas(LAND_W, LAND_H);
  const right = LAND_W - DETAIL_MARGIN;
  const detailW = LAND_W - DETAIL_MARGIN * 2;
  drawPageChrome(ctx, LAND_W, LAND_H, 1, 1, common.title, `القالب · ${common.templateName}`, true);

  drawText(ctx, "خريطة ذهنية · مستند كامل", right, 78, {
    size: 9.2,
    weight: 600,
    color: ACCENT,
  });

  const titleTop = 88;
  const titleLines = wrapCanvasText(ctx, common.title, 900, 24, 700, 2);
  const titleH = drawTextLines(ctx, titleLines, right, titleTop, {
    size: 24,
    weight: 700,
    lineHeight: 30,
    color: INK,
    dir: textDirection(common.title),
  });

  const branchCount = map.root.children?.length ?? 0;
  const meta = `${formatNum(common.totalNodes)} عقدة · ${formatNum(branchCount)} فروع رئيسية · ${common.templateName}`;
  drawText(ctx, fitText(ctx, meta, 900, 9.2), right, titleTop + titleH + 12, {
    size: 9.2,
    color: MUTED,
  });

  const cardTop = DETAIL_CARD_TOP;
  ctx.fillStyle = HAIR;
  ctx.fillRect(DETAIL_MARGIN, cardTop - 14, detailW, 1);
  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, right - 54, cardTop - 15, 54, 2, 1);
  ctx.fill();

  const cardH = DETAIL_CARD_BOTTOM - cardTop;
  drawCard(ctx, DETAIL_MARGIN, cardTop, detailW, cardH);

  const svg = buildMindMapSvg(map, layout, {
    title: null,
    background: null,
    fontScale: 1,
    rootCaption: "الموضوع الرئيسي",
  });
  await drawMapInRect(
    ctx,
    svg,
    DETAIL_MARGIN + DETAIL_INNER_PAD,
    cardTop + DETAIL_INNER_PAD,
    detailW - DETAIL_INNER_PAD * 2,
    cardH - DETAIL_INNER_PAD * 2,
  );

  return canvas;
}

async function renderCoverPage(
  map: StudioMindMap,
  common: RenderCommon & { branches: BranchPlan[] },
) {
  const { canvas, ctx } = createPageCanvas();
  drawPageChrome(ctx, PAGE_W, PAGE_H, 1, common.totalPages, common.title, "استوديو الخرائط الذهنية");

  drawText(ctx, `خريطة ذهنية · ${formatDate()}`, PAGE_W - MARGIN, 96, {
    size: 9.5,
    weight: 600,
    color: ACCENT,
  });

  const titleTop = 112;
  const titleLines = wrapCanvasText(ctx, common.title, 650, 37, 700, 3);
  const titleH = drawTextLines(ctx, titleLines, PAGE_W - MARGIN, titleTop, {
    size: 37,
    weight: 700,
    lineHeight: 47,
    color: INK,
    dir: textDirection(common.title),
  });

  const rootLabel = String(map.root.label ?? "").replace(/\s+/g, " ").trim();
  const subtitle =
    rootLabel && rootLabel !== common.title
      ? rootLabel
      : "ملخّص بصري للموضوع الرئيسي وفروعه، مع صفحات مستقلة لكل فرع.";
  const subtitleBaseline = titleTop + titleH + 18;
  drawText(ctx, fitText(ctx, subtitle, CONTENT_W, 11.5), PAGE_W - MARGIN, subtitleBaseline, {
    size: 11.5,
    color: MUTED,
  });

  const gap = 10;
  const statW = (CONTENT_W - gap * 2) / 3;
  const statTop = subtitleBaseline + 22;
  const statH = 64;
  const mainBranchCount = map.root.children?.length ?? common.branches.length;
  const stats = [
    { label: "الفروع الرئيسية", value: formatNum(mainBranchCount) },
    { label: "إجمالي العقد", value: formatNum(common.totalNodes) },
    { label: "القالب البصري", value: common.templateName },
  ];
  stats.forEach((stat, i) => {
    const x = PAGE_W - MARGIN - statW - i * (statW + gap);
    ctx.save();
    ctx.shadowColor = "rgba(28,25,23,0.04)";
    ctx.shadowBlur = 10;
    ctx.shadowOffsetY = 2;
    roundRectPath(ctx, x, statTop, statW, statH, 12);
    ctx.fillStyle = CARD;
    ctx.fill();
    ctx.restore();
    ctx.strokeStyle = HAIR;
    ctx.lineWidth = 1;
    roundRectPath(ctx, x, statTop, statW, statH, 12);
    ctx.stroke();
    drawText(ctx, stat.label, x + statW - 14, statTop + 22, { size: 8.6, color: MUTED });
    const valueSize = fitFontSize(ctx, stat.value, statW - 28, 20, 12.5);
    drawText(ctx, stat.value, x + statW - 14, statTop + 50, {
      size: valueSize,
      weight: 700,
      color: i === 2 ? ACCENT_DARK : INK,
      maxWidth: statW - 28,
    });
  });

  const overviewLabelY = statTop + statH + 40;
  sectionLabel(
    ctx,
    "نظرة عامة على الخريطة",
    overviewLabelY,
    common.usesPrintLayout
      ? "الفروع الرئيسية فقط · التفاصيل بتخطيط طباعي مُحسَّن للقراءة"
      : common.branches.length
        ? "الفروع الرئيسية فقط · تُفصَّل في الصفحات التالية"
        : undefined,
  );

  const overview = overviewMap(map);
  const overviewLayout = layoutMindMap(
    treeFrom(overview.root),
    "tree",
    new Set(),
    mapDirection(map),
  );

  const branchCount = common.branches.length;
  const shown = branchCount > 10 ? 9 : branchCount;
  const columns = shown > 5 ? 2 : 1;
  const rows = Math.ceil((shown + (branchCount > 10 ? 1 : 0)) / columns);
  const contentsH = shown ? 26 + rows * 30 : 0;
  const contentsTop = PAGE_H - 78 - contentsH;
  const cardTop = overviewLabelY + 12;
  const cardBottom = contentsH ? contentsTop - 24 : PAGE_H - 78;
  const availableH = cardBottom - cardTop;
  const mapInnerW = CONTENT_W - 32;
  const mapAspect = overviewLayout.W / Math.max(1, overviewLayout.H);
  const desiredH = mapInnerW / Math.max(0.35, mapAspect) + 32;
  const cardH = Math.max(200, Math.min(availableH, Math.max(260, desiredH)));
  drawCard(ctx, MARGIN, cardTop, CONTENT_W, cardH);

  const svg = buildMindMapSvg(overview, overviewLayout, {
    title: null,
    background: null,
    fontScale: 1,
    rootCaption: "الموضوع الرئيسي",
  });
  await drawMapInRect(
    ctx,
    svg,
    MARGIN + 16,
    cardTop + 16,
    CONTENT_W - 32,
    cardH - 32,
  );

  if (shown) {
    sectionLabel(ctx, "محتويات المستند", contentsTop + 12);
    const colW = columns === 1 ? CONTENT_W : (CONTENT_W - 24) / 2;
    const rowH = 30;
    const entriesTop = contentsTop + 26;
    const entryCount = shown + (branchCount > 10 ? 1 : 0);
    for (let i = 0; i < entryCount; i++) {
      const col = columns === 1 ? 0 : i < rows ? 0 : 1;
      const row = columns === 1 ? i : i % rows;
      const right = PAGE_W - MARGIN - col * (colW + 24);
      const cy = entriesTop + row * rowH + 9;

      if (i >= shown) {
        drawText(ctx, `و${formatNum(branchCount - 10)} فروع أخرى`, right - 2, cy + 3.2, {
          size: 9,
          color: MUTED,
        });
        continue;
      }

      const branch = common.branches[i];
      ctx.fillStyle = ACCENT_SOFT;
      ctx.beginPath();
      ctx.arc(right - 9, cy, 8.5, 0, Math.PI * 2);
      ctx.fill();
      drawText(ctx, formatNum(i + 1), right - 9, cy + 3, {
        size: 8.2,
        weight: 700,
        color: ACCENT,
        align: "center",
      });

      const pageText = `ص ${formatNum(branch.start)}`;
      drawText(ctx, pageText, right - colW + 2, cy + 3.2, {
        size: 8.5,
        color: FAINT,
        align: "left",
      });
      const pageWidth = measureText(ctx, pageText, 8.5);
      const label = fitText(ctx, branch.branch.label, colW - 42 - pageWidth, 9.8, 600);
      drawText(ctx, label, right - 24, cy + 3.2, {
        size: 9.8,
        weight: 600,
        color: INK,
        dir: textDirection(label),
      });

      const labelWidth = measureText(ctx, label, 9.8, 600);
      const lineStart = right - 24 - labelWidth - 12;
      const lineEnd = right - colW + 2 + pageWidth + 12;
      if (lineStart - lineEnd > 16) {
        ctx.save();
        ctx.strokeStyle = "#eae7e4";
        ctx.lineWidth = 0.8;
        ctx.setLineDash([1, 3.5]);
        ctx.beginPath();
        ctx.moveTo(lineEnd, cy - 2.5);
        ctx.lineTo(lineStart, cy - 2.5);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, PAGE_W - MARGIN - 54, cardTop - 15, 54, 2, 1);
  ctx.fill();

  return canvas;
}

async function renderDetailPage(
  page: DetailPagePlan,
  common: RenderCommon & { branches: BranchPlan[]; map: StudioMindMap },
  pageNo: number,
) {
  const { canvas, ctx } = createPageCanvas(LAND_W, LAND_H);
  const right = LAND_W - DETAIL_MARGIN;
  const detailW = LAND_W - DETAIL_MARGIN * 2;
  drawPageChrome(
    ctx,
    LAND_W,
    LAND_H,
    pageNo,
    common.totalPages,
    `${page.branch.label} · ${common.title}`,
    `الفرع ${formatNum(page.branchIndex + 1)} من ${formatNum(common.branches.length)}`,
    true,
  );

  const eyebrow =
    page.partTotal > 1
      ? `تفصيل الفرع · ${common.detailName} · الجزء ${formatNum(page.part)} من ${formatNum(page.partTotal)}`
      : `تفصيل الفرع · ${common.detailName}`;
  drawText(ctx, eyebrow, right, 78, { size: 9.2, weight: 600, color: ACCENT });

  const titleTop = 88;
  const titleLines = wrapCanvasText(ctx, page.root.label, 900, 24, 700, 2);
  drawTextLines(ctx, titleLines, right, titleTop, {
    size: 24,
    weight: 700,
    lineHeight: 30,
    color: INK,
    dir: textDirection(page.root.label),
  });

  const nodeCount = countTree(page.root);
  let meta = `${formatNum(nodeCount)} عقدة · ${formatNum(page.root.children.length)} فروع فرعية`;
  if (page.partTotal > 1) {
    meta += ` · الصفحة ${formatNum(page.part)} من ${formatNum(page.partTotal)} لهذا الفرع`;
  }
  drawText(ctx, fitText(ctx, meta, 900, 9.2), right, 160, { size: 9.2, color: MUTED });

  if (page.crumbs.length) {
    const path = `المسار · ${[common.title, ...page.crumbs].join(" / ")}`;
    drawText(ctx, fitText(ctx, path, 900, 8.5), right, 176, {
      size: 8.5,
      color: FAINT,
    });
  }

  const cardTop = DETAIL_CARD_TOP;
  ctx.fillStyle = HAIR;
  ctx.fillRect(DETAIL_MARGIN, cardTop - 14, detailW, 1);
  ctx.fillStyle = ACCENT;
  roundRectPath(ctx, right - 54, cardTop - 15, 54, 2, 1);
  ctx.fill();

  const cardH = DETAIL_CARD_BOTTOM - cardTop;
  drawCard(ctx, DETAIL_MARGIN, cardTop, detailW, cardH);

  const caption =
    page.root.id === page.branch.id ? "الفرع الرئيسي" : "محور الصفحة";
  const svg = buildMindMapSvg(
    { ...common.map, title: page.root.label, root: { label: page.root.label } },
    page.layout,
    {
      title: null,
      background: null,
      fontScale: DETAIL_FONT_SCALE,
      rootCaption: caption,
    },
  );
  await drawMapInRect(
    ctx,
    svg,
    DETAIL_MARGIN + DETAIL_INNER_PAD,
    cardTop + DETAIL_INNER_PAD,
    detailW - DETAIL_INNER_PAD * 2,
    cardH - DETAIL_INNER_PAD * 2,
  );

  return canvas;
}

/* ---------------------------------------------------------------- driver ----- */

export type PdfExportOptions = {
  template?: MindMapTemplate;
  templateName?: string;
  onProgress?: (done: number, total: number) => void;
};

export async function downloadPdf(
  map: StudioMindMap,
  options: PdfExportOptions = {},
) {
  const template = normalizeTemplate(options.template ?? map.template);
  const templateName =
    options.templateName ??
    MINDMAP_TEMPLATES.find((item) => item.id === template)?.name ??
    "شجرة جانبية";
  const title =
    String(map.title || map.root.label || "خريطة ذهنية")
      .replace(/\s+/g, " ")
      .trim() || "خريطة ذهنية";

  const direction = mapDirection(map);
  const pdfLayout = layoutMindMap(treeFrom(map.root), template, new Set(), direction);
  const plan = planDocument(map, pdfLayout, template, direction);
  const detailName = !plan.usesPrintLayout
    ? templateName
    : plan.detailTemplate === "columns"
      ? "تخطيط طباعي · أعمدة منظمة"
      : "تخطيط طباعي";
  const common: RenderCommon = {
    title,
    templateName,
    detailName,
    totalNodes: pdfLayout.total,
    totalPages: plan.totalPages,
    usesPrintLayout: plan.usesPrintLayout,
  };

  const pages: PdfPageImage[] = [];
  const total = plan.totalPages;
  const progress = (done: number) => options.onProgress?.(done, total);
  const tick = () => new Promise<void>((resolve) => setTimeout(resolve, 0));

  progress(0);

  if (plan.single) {
    if (plan.single === "landscape") {
      const canvas = await renderSingleLandscape(map, pdfLayout, common);
      pages.push(pageToImage(canvas, DETAIL_PDF_W, DETAIL_PDF_H));
    } else {
      const canvas = await renderSinglePage(map, pdfLayout, template, common);
      pages.push(pageToImage(canvas, PDF_W, PDF_H));
    }
    progress(1);
    await tick();
  } else {
    const cover = await renderCoverPage(map, {
      ...common,
      branches: plan.branches,
    });
    pages.push(pageToImage(cover, PDF_W, PDF_H));
    progress(1);
    await tick();

    for (let i = 0; i < plan.detailPages.length; i++) {
      const page = plan.detailPages[i];
      const canvas = await renderDetailPage(page, { ...common, branches: plan.branches, map }, i + 2);
      pages.push(pageToImage(canvas, DETAIL_PDF_W, DETAIL_PDF_H));
      progress(i + 2);
      await tick();
    }
  }

  const blob = buildPdf(
    pages,
    title,
    `خريطة ذهنية: ${title} — ${formatNum(plan.branches.length || (map.root.children?.length ?? 0))} فروع، ${formatNum(pdfLayout.total)} عقدة.`,
  );
  downloadBlob(blob, `${safeName(map)}.pdf`);
}