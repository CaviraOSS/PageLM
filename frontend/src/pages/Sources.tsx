import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { deleteSource, listSources, uploadSources, type SourceItem } from "../lib/api";

const ACCEPT = ".pdf,.doc,.docx,.md,.markdown,.txt,.odt";

function fmtBytes(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.min(units.length - 1, Math.floor(Math.log(n) / Math.log(1024)));
  const v = n / Math.pow(1024, i);
  return `${v >= 10 || i === 0 ? Math.round(v) : v.toFixed(1)} ${units[i]}`;
}

function fmtDate(ts: number) {
  try {
    return new Intl.DateTimeFormat("ar", { dateStyle: "medium", timeStyle: "short" }).format(new Date(ts));
  } catch {
    return new Date(ts).toLocaleString();
  }
}

function fileKind(src: SourceItem) {
  const name = (src.name || "").toLowerCase();
  if (src.mimeType?.includes("pdf") || name.endsWith(".pdf")) return { label: "PDF", cls: "from-red-500/25 to-orange-500/10 text-red-300 border-red-500/30" };
  if (name.endsWith(".doc") || name.endsWith(".docx") || src.mimeType?.includes("word")) return { label: "DOCX", cls: "from-sky-500/25 to-blue-500/10 text-sky-300 border-sky-500/30" };
  if (name.endsWith(".md") || name.endsWith(".markdown")) return { label: "MD", cls: "from-violet-500/25 to-fuchsia-500/10 text-violet-300 border-violet-500/30" };
  if (name.endsWith(".txt")) return { label: "TXT", cls: "from-stone-500/25 to-stone-500/10 text-stone-300 border-stone-500/30" };
  return { label: "FILE", cls: "from-emerald-500/25 to-teal-500/10 text-emerald-300 border-emerald-500/30" };
}

function FileIcon({ cls = "" }: { cls?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className={cls}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 0 0-3.375-3.375h-1.5A1.125 1.125 0 0 1 13.5 7.125v-1.5A3.375 3.375 0 0 0 10.125 2.25h-3.5A2.25 2.25 0 0 0 4.375 4.5v15A2.25 2.25 0 0 0 6.625 21.75h10.75a2.25 2.25 0 0 0 2.25-2.25v-3.375" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 12h7.5M8.25 15.75h4.5" />
    </svg>
  );
}

export default function Sources() {
  const [sources, setSources] = useState<SourceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deleting, setDeleting] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = async () => {
    try {
      const res = await listSources();
      setSources(res.sources || []);
    } catch (e: any) {
      setError(e?.message || "تعذر تحميل المصادر");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const upload = async (picked: FileList | File[]) => {
    const files = Array.from(picked || []);
    if (!files.length || uploading) return;
    setError("");
    setNotice("");
    setUploading(true);
    try {
      const res = await uploadSources(files);
      const added = res.sources || [];
      setSources((prev) => [...added, ...prev]);
      setNotice(
        added.length === 1
          ? `تمت إضافة «${added[0].name}» بنجاح.`
          : `تمت إضافة ${added.length} مصادر بنجاح.`,
      );
      if (res.errors?.length) setError(res.errors.join(" | "));
    } catch (e: any) {
      setError(e?.message || "فشل رفع الملف. تأكد من أن الصيغة مدعومة.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const remove = async (src: SourceItem) => {
    if (deleting) return;
    if (!window.confirm(`حذف المصدر «${src.name}»؟ سيختفي من كل البوابات.`)) return;
    setDeleting(src.id);
    setError("");
    try {
      await deleteSource(src.id);
      setSources((prev) => prev.filter((s) => s.id !== src.id));
      setNotice(`تم حذف «${src.name}».`);
    } catch (e: any) {
      setError(e?.message || "تعذر حذف المصدر");
    } finally {
      setDeleting(null);
    }
  };

  const totalChars = sources.reduce((n, s) => n + (s.chars || 0), 0);

  return (
    <div dir="rtl" className="min-h-screen w-full pl-4 pr-4 md:pl-32">
      <div className="max-w-6xl mx-auto pt-8 pb-24">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between mb-8">
          <div>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/10 border border-sky-500/20 text-sky-300 text-xs font-medium mb-3">
              <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
              البوابة الأولى · المصادر
            </div>
            <h1 className="text-3xl sm:text-4xl font-semibold text-white tracking-tight">مصادرك الدراسية</h1>
            <p className="text-stone-400 mt-2 max-w-2xl leading-relaxed">
              ارفع ملفاتك مرة واحدة، ثم اسألها في المحادثة أو حوّلها في الاستوديو إلى اختبارات، QCM، بطاقات مراجعة وملخصات.
            </p>
          </div>
          <div className="flex items-center gap-4 text-sm text-stone-400">
            <div className="text-center">
              <div className="text-2xl font-semibold text-white">{sources.length}</div>
              <div className="text-xs">مصدر</div>
            </div>
            <div className="w-px h-10 bg-stone-800" />
            <div className="text-center">
              <div className="text-2xl font-semibold text-white">{totalChars > 1000 ? `${Math.round(totalChars / 1000)}k` : totalChars}</div>
              <div className="text-xs">حرف مستخرج</div>
            </div>
          </div>
        </div>

        <div
          onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
          onDragEnter={(e) => { e.preventDefault(); setDrag(true); }}
          onDragLeave={(e) => { e.preventDefault(); setDrag(false); }}
          onDrop={(e) => { e.preventDefault(); setDrag(false); upload(e.dataTransfer.files); }}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`group relative overflow-hidden rounded-3xl border-2 border-dashed p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 ${
            drag
              ? "border-sky-400 bg-sky-500/10 scale-[1.01]"
              : "border-stone-800 bg-stone-950/70 hover:border-sky-500/50 hover:bg-stone-950"
          }`}
        >
          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none">
            <div className="absolute -top-24 left-1/2 -translate-x-1/2 w-96 h-48 bg-sky-500/20 blur-3xl rounded-full" />
          </div>
          <input
            ref={inputRef}
            type="file"
            multiple
            accept={ACCEPT}
            className="hidden"
            onChange={(e) => e.target.files && upload(e.target.files)}
          />
          <div className="relative flex flex-col items-center gap-4">
            <div className={`p-4 rounded-2xl border transition-all duration-300 ${drag ? "border-sky-400 bg-sky-500/20" : "border-stone-800 bg-stone-900/70 group-hover:border-sky-500/40"}`}>
              {uploading ? (
                <svg className="size-8 text-sky-400 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.2" strokeWidth="3" />
                  <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
              ) : (
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-8 text-sky-300">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75V16.5M16.5 12 12 7.5 7.5 12M12 16.5V7.5" />
                </svg>
              )}
            </div>
            <div>
              <div className="text-white font-semibold text-lg">
                {uploading ? "جارٍ استخراج النص من ملفاتك…" : "اسحب ملفاتك هنا أو اضغط للاختيار"}
              </div>
              <div className="text-stone-500 text-sm mt-1">
                PDF · DOCX · MD · TXT — ويدعم العربية والملفات الممسوحة ضوئيًا
              </div>
            </div>
            {uploading && (
              <div className="w-full max-w-sm h-1.5 rounded-full bg-stone-800 overflow-hidden">
                <div className="h-full w-1/2 rounded-full bg-gradient-to-r from-sky-500 to-violet-500 animate-[shimmer_1.4s_ease-in-out_infinite]" />
              </div>
            )}
          </div>
        </div>

        {(error || notice) && (
          <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${error ? "border-red-500/30 bg-red-500/10 text-red-300" : "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"}`}>
            {error || notice}
          </div>
        )}

        <div className="mt-8 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-white">المكتبة</h2>
          {sources.length > 0 && <span className="text-xs text-stone-500">مرتبة من الأحدث</span>}
        </div>

        {loading ? (
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {[0, 1].map((i) => (
              <div key={i} className="h-48 rounded-3xl bg-stone-950 border border-stone-900 animate-pulse" />
            ))}
          </div>
        ) : sources.length === 0 ? (
          <div className="mt-4 rounded-3xl border border-stone-900 bg-stone-950/60 p-10 text-center">
            <div className="mx-auto size-16 rounded-2xl bg-stone-900 border border-stone-800 flex items-center justify-center mb-4">
              <FileIcon cls="size-8 text-stone-500" />
            </div>
            <div className="text-white font-semibold">لا توجد مصادر بعد</div>
            <p className="text-stone-500 text-sm mt-1">ارفع أول ملف لتبدأ رحلة الدراسة من مصدرك الخاص.</p>
          </div>
        ) : (
          <div className="mt-4 grid md:grid-cols-2 gap-4">
            {sources.map((src) => {
              const kind = fileKind(src);
              return (
                <article key={src.id} className="group relative rounded-3xl border border-stone-900 bg-stone-950/80 p-5 transition-all duration-300 hover:border-stone-700 hover:shadow-[0_18px_50px_rgba(0,0,0,0.45)]">
                  <div className="flex items-start gap-4">
                    <div className={`shrink-0 size-14 rounded-2xl bg-gradient-to-br border flex items-center justify-center ${kind.cls}`}>
                      <FileIcon cls="size-7" />
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <h3 className="text-white font-semibold leading-snug break-words line-clamp-2" dir="auto">{src.name}</h3>
                        <span className={`shrink-0 text-[10px] font-semibold tracking-wide px-2 py-0.5 rounded-full border ${kind.cls}`}>{kind.label}</span>
                      </div>
                      <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-stone-500">
                        <span>{fmtBytes(src.size)}</span>
                        <span className="size-1 rounded-full bg-stone-700" />
                        <span>{src.chars.toLocaleString("ar")} حرف</span>
                        <span className="size-1 rounded-full bg-stone-700" />
                        <span>{fmtDate(src.createdAt)}</span>
                      </div>
                    </div>
                  </div>

                  <p className="mt-4 text-sm text-stone-400 leading-relaxed line-clamp-3 min-h-[3.9rem]" dir="auto">
                    {src.preview || "تم استخراج النص بنجاح."}
                  </p>

                  <div className="mt-4 flex items-center gap-2">
                    <Link
                      to={`/chat?sourceId=${encodeURIComponent(src.id)}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-stone-900 hover:bg-stone-800 border border-stone-800 hover:border-stone-700 px-3 py-2 text-sm text-stone-200 transition-colors"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 8.25h9m-9 3.75h6.75M21 12c0 4.556-4.03 8.25-9 8.25a9.76 9.76 0 0 1-2.555-.337A5.972 5.972 0 0 1 5.41 20.97a5.969 5.969 0 0 1-.474-.065 4.48 4.48 0 0 0 .978-2.025c.09-.457-.133-.901-.467-1.226C3.93 16.178 3 14.189 3 12c0-4.556 4.03-8.25 9-8.25s9 3.694 9 8.25Z" />
                      </svg>
                      اسأل المصدر
                    </Link>
                    <Link
                      to={`/studio?sourceId=${encodeURIComponent(src.id)}`}
                      className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500/90 to-violet-500/90 hover:from-sky-400 hover:to-violet-400 px-3 py-2 text-sm text-white font-medium transition-all duration-300"
                    >
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904 9 18.75l-.813-2.846a4.5 4.5 0 0 0-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 0 0 3.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 0 0 3.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 0 0-3.09 3.09ZM18.259 8.715 18 9.75l-.259-1.035a3.375 3.375 0 0 0-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 0 0 2.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 0 0 2.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 0 0-2.456 2.456Z" />
                      </svg>
                      استوديو
                    </Link>
                    <button
                      onClick={() => remove(src)}
                      disabled={deleting === src.id}
                      className="p-2 rounded-xl border border-stone-800 text-stone-500 hover:text-red-300 hover:border-red-500/30 hover:bg-red-500/10 transition-colors disabled:opacity-50"
                      title="حذف المصدر"
                      aria-label="حذف المصدر"
                    >
                      {deleting === src.id ? (
                        <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                          <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
                          <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
                        </svg>
                      ) : (
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" className="size-4">
                          <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                        </svg>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
