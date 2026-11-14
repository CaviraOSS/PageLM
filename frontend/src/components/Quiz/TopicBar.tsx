import { Link } from "react-router-dom";
import type {
  QuizDifficulty,
  QuizLanguage,
  QuizQuestionType,
  QuizSettings,
  SourceItem,
} from "../../lib/api";

const DEFAULT_COUNT = 10;

const DIFFICULTIES: Array<{ value: QuizDifficulty; label: string }> = [
  { value: "easy", label: "سهل" },
  { value: "medium", label: "متوسط" },
  { value: "hard", label: "صعب" },
];

const QUESTION_TYPES: Array<{ value: QuizQuestionType; label: string }> = [
  { value: "mcq", label: "اختيار من متعدد" },
  { value: "truefalse", label: "صواب أو خطأ" },
  { value: "mixed", label: "مختلط" },
];

const LANGUAGES: Array<{ value: QuizLanguage; label: string }> = [
  { value: "auto", label: "تلقائي" },
  { value: "ar", label: "العربية" },
  { value: "fr", label: "الفرنسية" },
  { value: "en", label: "الإنجليزية" },
];

function fmtChars(n: number) {
  if (!Number.isFinite(n) || n <= 0) return "0";
  return n >= 1000 ? `${Math.round(n / 1000)}k` : String(n);
}

function Choice<T extends string>({
  value,
  current,
  label,
  onClick,
}: {
  value: T;
  current: T;
  label: string;
  onClick: (v: T) => void;
}) {
  const active = value === current;
  return (
    <button
      type="button"
      onClick={() => onClick(value)}
      aria-pressed={active}
      className={`rounded-xl border px-3 py-2 text-xs font-medium transition-colors ${
        active
          ? "border-sky-500/50 bg-sky-500/15 text-sky-200"
          : "border-stone-800 bg-stone-900/60 text-stone-400 hover:border-stone-700 hover:text-stone-200"
      }`}
    >
      {label}
    </button>
  );
}

export default function TopicBar({
  value,
  onChange,
  onStart,
  phase,
  isLoading = false,
  sources,
  sourcesLoading = false,
  sourceId,
  onSourceChange,
  settings,
  onSettingsChange,
  error,
}: {
  value: string;
  onChange: (v: string) => void;
  onStart: () => void;
  phase?: string;
  isLoading?: boolean;
  sources: SourceItem[];
  sourcesLoading?: boolean;
  sourceId: string;
  onSourceChange: (id: string) => void;
  settings: QuizSettings;
  onSettingsChange: (patch: Partial<QuizSettings>) => void;
  error?: string;
}) {
  const selectedSource = sources.find((s) => s.id === sourceId);
  const disabled = (!value.trim() && !sourceId) || isLoading;

  return (
    <div
      dir="rtl"
      className="relative mb-8 overflow-hidden rounded-3xl border border-stone-800 bg-stone-950/85 shadow-2xl shadow-black/30"
    >
      <div className="pointer-events-none absolute -top-24 -left-20 size-64 rounded-full bg-sky-500/10 blur-3xl" />
      <div className="pointer-events-none absolute -bottom-28 -right-16 size-72 rounded-full bg-violet-500/10 blur-3xl" />

      <div className="relative p-4 sm:p-6">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <div className="inline-flex items-center gap-2 rounded-full border border-sky-500/20 bg-sky-500/10 px-3 py-1 text-[11px] font-medium text-sky-300">
              <span className="size-1.5 rounded-full bg-sky-400 animate-pulse" />
              منشئ الاختبار
              <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] text-emerald-300">
                LLM
              </span>
            </div>
            <h2 className="mt-2 text-xl font-semibold text-white">اختبار من مصدرك، بإعداداتك</h2>
            <p className="mt-1 max-w-xl text-xs leading-relaxed text-stone-400">
              اختر مصدرًا أو اكتب موضوعًا، واضبط الأسئلة قبل التوليد. كل سؤال يُبنى الآن من المحتوى المحدد — لا أسئلة محفوظة مسبقًا.
            </p>
          </div>
          <Link
            to="/sources"
            className="inline-flex shrink-0 items-center gap-2 self-start rounded-xl border border-stone-800 bg-stone-900 px-3 py-2 text-xs text-stone-300 transition-colors hover:border-stone-700 hover:bg-stone-800"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
            </svg>
            إدارة المصادر
          </Link>
        </div>

        <div className="mt-5 grid gap-4 lg:grid-cols-[1.05fr_1fr]">
          <div className="space-y-3">
            <div>
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="quiz-source" className="text-xs font-medium text-stone-300">المصدر</label>
                {selectedSource && (
                  <span className="text-[10px] text-stone-500">
                    {fmtChars(selectedSource.chars)} حرف مستخرج
                  </span>
                )}
              </div>
              <div className="relative">
                <select
                  id="quiz-source"
                  value={sourceId}
                  onChange={(e) => onSourceChange(e.target.value)}
                  disabled={isLoading}
                  dir="auto"
                  className="w-full appearance-none rounded-xl border border-stone-800 bg-stone-900/80 px-3 py-2.5 pe-9 text-sm text-stone-200 outline-none transition-colors focus:border-sky-500/50 disabled:opacity-60"
                >
                  <option value="">بدون مصدر — موضوع حر</option>
                  {sources.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name} — {fmtChars(s.chars)} حرف
                    </option>
                  ))}
                </select>
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-stone-500">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m19.5 8.25-7.5 7.5-7.5-7.5" />
                </svg>
              </div>
              <div className="mt-1.5 flex items-center justify-between gap-2 text-[10px] text-stone-500">
                <span>{sourcesLoading ? "جارٍ تحميل المصادر…" : sources.length ? `${sources.length} مصدر متاح` : "لا توجد مصادر بعد"}</span>
                {!sourcesLoading && !sources.length && (
                  <Link to="/sources" className="text-sky-300 hover:text-sky-200">ارفع ملفك الأول</Link>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="quiz-topic" className="mb-1.5 block text-xs font-medium text-stone-300">الموضوع</label>
              <input
                id="quiz-topic"
                value={value}
                onChange={(e) => onChange(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter" && !disabled) onStart(); }}
                dir="auto"
                placeholder={selectedSource ? "اتركه فارغًا لاستخدام عنوان المصدر" : "اكتب موضوعًا لاختبار حر (مثال: الاستمرارية والاشتقاقية)"}
                className="w-full rounded-xl border border-stone-800 bg-stone-900/80 px-3 py-2.5 text-sm text-stone-100 outline-none transition-colors placeholder:text-stone-600 focus:border-sky-500/50"
              />
            </div>

            {error && (
              <div className="rounded-xl border border-red-500/30 bg-red-500/10 px-3 py-2 text-xs text-red-300">
                {error}
              </div>
            )}
          </div>

          <div className="space-y-3">
            <div className="rounded-2xl border border-stone-800 bg-stone-900/40 p-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-xs font-medium text-stone-200">عدد الأسئلة</div>
                  <div className="mt-0.5 text-[10px] text-stone-500">من 1 إلى 20 سؤالًا</div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ count: Math.max(1, settings.count - 1) })}
                    disabled={settings.count <= 1 || isLoading}
                    aria-label="تقليل عدد الأسئلة"
                    className="size-8 rounded-lg border border-stone-700 bg-stone-900 text-lg text-stone-200 transition-colors hover:bg-stone-800 disabled:opacity-40"
                  >
                    −
                  </button>
                  <span className="min-w-8 text-center text-lg font-semibold tabular-nums text-sky-300">{settings.count}</span>
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ count: Math.min(20, settings.count + 1) })}
                    disabled={settings.count >= 20 || isLoading}
                    aria-label="زيادة عدد الأسئلة"
                    className="size-8 rounded-lg border border-stone-700 bg-stone-900 text-lg text-stone-200 transition-colors hover:bg-stone-800 disabled:opacity-40"
                  >
                    +
                  </button>
                  <button
                    type="button"
                    onClick={() => onSettingsChange({ count: DEFAULT_COUNT })}
                    disabled={settings.count === DEFAULT_COUNT || isLoading}
                    className="ms-1 rounded-lg border border-stone-800 px-2 py-1 text-[10px] text-stone-400 transition-colors hover:bg-stone-800 disabled:opacity-40"
                  >
                    افتراضي {DEFAULT_COUNT}
                  </button>
                </div>
              </div>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {[5, 10, 15, 20].map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => onSettingsChange({ count: n })}
                    disabled={isLoading}
                    className={`rounded-lg border px-2 py-1 text-[10px] transition-colors ${
                      settings.count === n
                        ? "border-sky-500/40 bg-sky-500/10 text-sky-200"
                        : "border-stone-800 text-stone-500 hover:text-stone-300"
                    }`}
                  >
                    {n}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-stone-300">مستوى الصعوبة</div>
              <div className="flex flex-wrap gap-1.5">
                {DIFFICULTIES.map((d) => (
                  <Choice
                    key={d.value}
                    value={d.value}
                    current={settings.difficulty}
                    label={d.label}
                    onClick={(v) => onSettingsChange({ difficulty: v })}
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 text-xs font-medium text-stone-300">أنواع الأسئلة</div>
              <div className="flex flex-wrap gap-1.5">
                {QUESTION_TYPES.map((t) => (
                  <Choice
                    key={t.value}
                    value={t.value}
                    current={settings.questionType}
                    label={t.label}
                    onClick={(v) =>
                      onSettingsChange({
                        questionType: v,
                        optionsCount: v === "truefalse" ? 2 : 4,
                      })
                    }
                  />
                ))}
              </div>
            </div>

            <div>
              <div className="mb-1.5 flex items-center gap-2">
                <span className="text-xs font-medium text-stone-300">لغة الأسئلة</span>
                <span className="rounded-full border border-emerald-500/30 bg-emerald-500/10 px-1.5 py-0.5 text-[9px] font-medium text-emerald-300">
                  جديد
                </span>
              </div>
              <div className="flex flex-wrap gap-1.5">
                {LANGUAGES.map((l) => (
                  <Choice
                    key={l.value}
                    value={l.value}
                    current={settings.language}
                    label={l.label}
                    onClick={(v) => onSettingsChange({ language: v })}
                  />
                ))}
              </div>
              <p className="mt-1 text-[10px] text-stone-500">
                «تلقائي» يتبع لغة المصدر. اختر لغة محددة إذا أردت ترجمة المفاهيم مع الحفاظ على الرموز.
              </p>
            </div>
          </div>
        </div>

        <div className="mt-5 flex flex-col gap-3 border-t border-stone-800 pt-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="text-[10px] leading-relaxed text-stone-500">
            {selectedSource ? (
              <>سيُبنى الاختبار حصريًا من: <span className="text-stone-300" dir="auto">{selectedSource.name}</span></>
            ) : (
              <>وضع الموضوع الحر — أضف مصدرًا لتصبح الأسئلة موثّقة من ملفك.</>
            )}
          </div>
          <button
            type="button"
            onClick={onStart}
            disabled={disabled}
            className="inline-flex min-w-44 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-sky-500 to-violet-500 px-5 py-2.5 text-sm font-medium text-white transition-all hover:from-sky-400 hover:to-violet-400 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {isLoading ? (
              <>
                <svg className="size-4 animate-spin" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="3" className="opacity-25" />
                  <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
                </svg>
                {phase || "نبني اختبارك…"}
              </>
            ) : (
              <>
                ابدأ الاختبار
                <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="size-4">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
                </svg>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}