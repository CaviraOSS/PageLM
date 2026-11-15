import llm from "../../utils/llm/llm"
import { normalizeTopic } from "../../utils/text/normalize"

export type QuizItem = {
  id: number
  question: string
  options: string[]
  correct: number
  hint: string
  explanation: string
}

export type QuizDifficulty = "easy" | "medium" | "hard"
export type QuizLength = "short" | "medium" | "long"
export type QuizQuestionType = "mcq" | "truefalse" | "mixed"
export type QuizLanguage = "auto" | "ar" | "fr" | "en"

export type QuizOptions = {
  context?: string
  count?: number
  difficulty?: QuizDifficulty
  length?: QuizLength
  hints?: boolean
  optionsCount?: number
  questionType?: QuizQuestionType
  language?: QuizLanguage
}

type Normalized = {
  count: number
  difficulty: QuizDifficulty
  length: QuizLength
  hints: boolean
  optionsCount: number
  questionType: QuizQuestionType
  language: QuizLanguage
  arabic: boolean
}

function normalizeOptions(topic: string, options: QuizOptions): Normalized {
  const questionType: QuizQuestionType =
    options.questionType === "truefalse" || options.questionType === "mixed"
      ? options.questionType
      : "mcq"
  const count = Math.max(1, Math.min(20, Math.floor(Number(options.count) || 5)))
  const optionsCount =
    questionType === "truefalse"
      ? 2
      : Math.max(2, Math.min(5, Math.floor(Number(options.optionsCount) || 4)))
  const difficulty: QuizDifficulty =
    options.difficulty === "easy" || options.difficulty === "hard" ? options.difficulty : "medium"
  const length: QuizLength =
    options.length === "short" || options.length === "long" ? options.length : "medium"
  const language: QuizLanguage =
    options.language === "ar" || options.language === "fr" || options.language === "en"
      ? options.language
      : "auto"
  const arabic =
    language === "ar" ||
    (language === "auto" && /[\u0600-\u06FF]/.test(`${topic} ${options.context || ""}`))
  return {
    count,
    difficulty,
    length,
    hints: options.hints !== false,
    optionsCount,
    questionType,
    language,
    arabic,
  }
}

const LANGUAGE_NAME: Record<Exclude<QuizLanguage, "auto">, string> = {
  ar: "Arabic",
  fr: "French",
  en: "English",
}

function trueFalseWords(o: Normalized) {
  if (o.language === "fr") return { true: "Vrai", false: "Faux" }
  if (o.language === "en") return { true: "True", false: "False" }
  if (o.arabic) return { true: "صحيح", false: "خطأ" }
  return { true: "True", false: "False" }
}

function languageRule(o: Normalized) {
  if (o.language === "ar") {
    return "Write every question, option, hint, and explanation in Arabic. Keep numbers, symbols, and mathematical notation unchanged."
  }
  if (o.language === "fr") {
    return "Write every question, option, hint, and explanation in French. Keep numbers, symbols, and mathematical notation unchanged."
  }
  if (o.language === "en") {
    return "Write every question, option, hint, and explanation in English. Keep numbers, symbols, and mathematical notation unchanged."
  }
  return o.arabic
    ? "Write every question, option, hint, and explanation in Arabic. Keep numbers, symbols, and mathematical notation unchanged."
    : "Write every question, option, hint, and explanation in the dominant language of the source material. If no source is provided, use the language of the topic. Keep numbers, symbols, and mathematical notation unchanged."
}

function difficultyRule(d: QuizDifficulty) {
  if (d === "easy") {
    return "Test direct recall and basic comprehension. Use clear wording and plausible but clearly distinguishable distractors."
  }
  if (d === "hard") {
    return "Test analysis, application, and edge cases. Use subtle distractors that require precise understanding, and avoid giveaway wording."
  }
  return "Test understanding and application, not pure recall. Distractors must be plausible and conceptually close to the correct answer."
}

function lengthRule(l: QuizLength) {
  if (l === "short") {
    return "Keep it compact: question 20..90 chars, each option 2..70 chars, explanation 20..120 chars, hint 6..80 chars."
  }
  if (l === "long") {
    return "Allow room for reasoning: question 40..240 chars, each option 4..140 chars, explanation 60..340 chars, hint 10..160 chars."
  }
  return "Balanced length: question 30..150 chars, each option 3..100 chars, explanation 40..240 chars, hint 8..120 chars."
}

function formatRule(o: Normalized) {
  const tf = trueFalseWords(o)
  const tfHint = ` ("${tf.true}", "${tf.false}")`
  if (o.questionType === "truefalse") {
    return `Every question is True/False. "options" must contain exactly 2 strings meaning True and False${tfHint}. "correct" is 1 for the true option or 2 for the false option.`
  }
  if (o.questionType === "mixed") {
    return `Mix multiple-choice and True/False questions. Multiple-choice items have exactly ${o.optionsCount} distinct options (1 correct + ${
      o.optionsCount - 1
    } wrong). True/False items have exactly 2 options${tfHint}. "correct" is a 1-based index into that item's options.`
  }
  return `Every question is multiple choice with exactly ${o.optionsCount} distinct options: exactly 1 correct and ${
    o.optionsCount - 1
  } clearly wrong. "correct" is a 1-based index into options.`
}

function schemaBlock(o: Normalized) {
  const hint = o.hints
    ? '"hint": "a short nudge that does not reveal the answer (6..160 chars)"'
    : '"hint": ""'
  return `{
  "id": 1..${o.count},
  "question": "plain text, unambiguous",
  "options": ["first option", "second option", "..."],
  "correct": 1..${o.optionsCount},
  ${hint},
  "explanation": "why the correct option is right and the others are wrong"
}`
}

function buildSystem(o: Normalized) {
  const language = languageRule(o)
  return `PRIMARY OBJECTIVE
Generate exactly ${o.count} high-quality ${o.questionType === "truefalse" ? "True/False" : "quiz"} questions about the given topic.

OUTPUT CONTRACT
Return only a JSON array with exactly ${o.count} objects. No markdown, no code fences, no prose outside the JSON.

LANGUAGE
${language}

DIFFICULTY
${difficultyRule(o.difficulty)}

LENGTH
${lengthRule(o.length)}

QUESTION FORMAT
${formatRule(o)}

SCHEMA
${schemaBlock(o)}

VALIDATION
- Exactly ${o.count} items and exactly the six keys shown above.
- Each item's options respect the question format rule.
- correct is a valid 1-based index into that item's options.
- Exactly one option is correct; never use "all of the above", "none of the above", or "A and B are both correct".
- ${o.hints ? "Every hint is useful but does not reveal the answer." : 'Every "hint" value is an empty string.'}
- All strings are trimmed and non-empty (except hint when disabled).
- Never assert that a two-sided limit exists and then say the one-sided limits differ. If the one-sided limits differ, say so explicitly.
- A vertical tangent is parallel to the y-axis (محور التراتيب). A horizontal tangent is parallel to the x-axis (محور الفواصل). Do not mix the two.
- Theorem names must match their statements. Mean Value Theorem (نظرية القيم المتوسطة / نظرية التزايدات المنتهية): if f is continuous on [a,b] and differentiable on (a,b), there is c in (a,b) with f'(c) = (f(b)-f(a))/(b-a). Intermediate Value Theorem (نظرية القيمة الوسطية): if f is continuous on [a,b], it takes every value between f(a) and f(b); if f(a)·f(b) < 0, it guarantees a root. Root uniqueness additionally needs strict monotonicity; never attribute it to the Mean Value Theorem.
- Phrase a vertical tangent precisely: «عندما يؤول (f(x)-f(x₀))/(x-x₀) إلى +∞ أو -∞، يكون المماس عموديًا موازيًا لمحور التراتيب». A vertical line is perpendicular to the x-axis (محور الفواصل) and parallel to the y-axis (محور التراتيب). Never write «عمودي على محور التراتيب» or a malformed comparison such as ∞ = ∞.
- If a question states a domain such as ℝ, every option must be defined on that whole domain. When asking which function is not defined, continuous, or differentiable on ℝ, exactly one option may have a restricted domain; never offer two partial-domain functions such as √x and ln(x) in the same item. Prefer asking about a specific point or interval instead.
- The correct option must be the only true statement. Every distractor must be false in the given context, not merely incomplete, less precise, or a logical consequence of the correct answer. For example, if the correct answer is «الحدان الأيمن والأيسر للمشتقة مختلفان», do not offer «المشتقة غير موجودة» as a distractor.
- Silently check every item before returning: one true option, all others clearly false.
- Use precise Arabic mathematical terms: دالة/دوال for function, مشتقة الدالة for derivative, مجال for domain, حد for limit, and الرتابة for monotonicity. Do not use تابع for function. Reserve متتالية/متسلسلة for sequences and series.
- Do not leave English prose words such as limit, function, derivative, continuity, tangent, monotonicity, interval, domain, root, or solution inside an Arabic sentence.
- Do not prefix options with letters or numbers; return plain option text only.
- Proofread Arabic spelling before returning the JSON.
- Write math in plain Unicode text (x², √x, 1/(2√x), ≠, ≤, ∞, →). Never use LaTeX commands or $ delimiters.

FAIL-SAFE
If uncertain, choose the standard interpretation of the source. Output only the JSON array.`
}

function buildStrict(o: Normalized) {
  const language = o.language === "auto" ? (o.arabic ? "Arabic" : "the source language") : LANGUAGE_NAME[o.language]
  return `RETRY: STRICT FORMAT ONLY
Return only a JSON array with exactly ${o.count} objects, no markdown and no extra text.
Each object has: id (1..${o.count}), question, options, correct (1-based), hint (${o.hints ? "6..160 chars" : "empty string"}), explanation.
${formatRule(o)}
Use ${language}; keep symbols unchanged.
Keep every mathematical statement and Arabic term accurate. Never mix theorem names. Every option must be defined on the stated domain. Every distractor must be false, not merely incomplete or a consequence of the correct answer. No English prose inside Arabic text. No letter or number prefixes on options.`
}

function stripFences(s: string) {
  return s.replace(/^\s*```(?:json)?\s*|\s*```\s*$/g, "").trim()
}
function extractArray(s: string) {
  const m = s.match(/\[[\s\S]*\]/)
  return m ? m[0] : s
}
function tryParse<T = unknown>(s: string): T | null {
  try {
    return JSON.parse(s) as T
  } catch {
    return null
  }
}
function plainMath(s: string) {
  let t = String(s ?? "")
  const group = "((?:[^{}]|\\{[^{}]*\\})*)"
  const frac = new RegExp(`\\\\[dt]?frac\\s*\\{${group}\\}\\s*\\{${group}\\}`, "g")
  const sqrt = new RegExp(`\\\\sqrt\\s*\\{${group}\\}`, "g")
  for (let i = 0; i < 3; i++) t = t.replace(frac, "($1)/($2)")
  t = t
    .replace(/\\text\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\operatorname\s*\{([^{}]*)\}/g, "$1")
    .replace(/\\mathrm\s*\{([^{}]*)\}/g, "$1")
    .replace(sqrt, "√($1)")
    .replace(/\\sqrt\s*([a-zA-Z0-9])/g, "√$1")
    .replace(/\\mathbb\s*\{\s*R\s*\}/g, "ℝ")
    .replace(/\\mathbb\s*\{\s*N\s*\}/g, "ℕ")
    .replace(/\\mathbb\s*\{\s*Z\s*\}/g, "ℤ")
    .replace(/\\ell/g, "ℓ")
    .replace(/\\phi/g, "φ")
    .replace(/\\theta/g, "θ")
    .replace(/\\alpha/g, "α")
    .replace(/\\beta/g, "β")
    .replace(/\\pi/g, "π")
    .replace(/\\Delta/g, "Δ")
    .replace(/\\delta/g, "δ")
    .replace(/\\infty/g, "∞")
    .replace(/\\cdot/g, "·")
    .replace(/\\times/g, "×")
    .replace(/\\div/g, "÷")
    .replace(/\\neq\b|\\ne\b/g, "≠")
    .replace(/\\leq?\b/g, "≤")
    .replace(/\\geq?\b/g, "≥")
    .replace(/\\approx/g, "≈")
    .replace(/\\to\b|\\rightarrow/g, "→")
    .replace(/\\Rightarrow|\\Longrightarrow/g, "⇒")
    .replace(/\\pm/g, "±")
    .replace(/\\(sin|cos|tan|ln|log|lim|max|min|exp)\b/g, "$1")
    .replace(/\\displaystyle|\\qquad|\\quad|\\,|\\;|\\!/g, " ")
    .replace(/\\left|\\right/g, "")
    .replace(/\^\s*\{?2\}?/g, "²")
    .replace(/\^\s*\{?3\}?/g, "³")
    .replace(/_\s*\{([^{}]*)\}/g, "$1")
    .replace(/\$+/g, "")
    .replace(/[{}]/g, "")
    .replace(/\\[a-zA-Z]+/g, "")
    .replace(/\s{2,}/g, " ")
    .trim()
  return t
}
function nstr(x: any, min = 1, max = 240) {
  const t = plainMath(String(x ?? "")).replace(/\s+/g, " ").trim()
  return t.length < min ? "" : t.slice(0, max)
}
function localizeArabic(s: string) {
  if (!/[\u0600-\u06FF]/.test(s)) return s
  return s
    .replace(/\bmonotonicity\b/gi, "الرتابة")
    .replace(/\binterval\b/gi, "فترة")
    .replace(/\bdifferentiable\b/gi, "قابلة للاشتقاق")
    .replace(/\bcontinuous\b/gi, "مستمرة")
    .replace(/\bcontinuity\b/gi, "الاستمرارية")
    .replace(/\bderivative\b/gi, "المشتقة")
    .replace(/\bfunction\b/gi, "الدالة")
    .replace(/\blimit\b/gi, "النهاية")
    .replace(/\btangent\b/gi, "المماس")
    .replace(/\bdomain\b/gi, "مجال التعريف")
    .replace(/\brange\b/gi, "المدى")
    .replace(/\broot\b/gi, "جذر")
    .replace(/\bequation\b/gi, "معادلة")
    .replace(/\bsolution\b/gi, "حل")
    .replace(/المشتق للتابع/g, "مشتقة الدالة")
    .replace(/مشتق التابع/g, "مشتقة الدالة")
    .replace(/للتابع(?![ةين])/g, "للدالة")
    .replace(/التابع(?![ةين])/g, "الدالة")
    .replace(/إذا وت فقط إذا/g, "إذا وفقط إذا")
    .replace(/المماس\s+عمودي(?:ًا|اً|ة)?\s+على\s+محور\s+التراتيب/g, "المماس موازٍ لمحور التراتيب")
    .replace(/المماس\s+أفقي(?:ًا|اً|ة)?\s+على\s+محور\s+الفواصل/g, "المماس موازٍ لمحور الفواصل")
    .replace(/الوظائف/g, "الدوال")
    .replace(/وظيفة/g, "دالة")
    .replace(/ممس/g, "مماس")
    .replace(/الجدور/g, "الجذور")
    .replace(/المعاداة/g, "المعادلة")
}
function toIndex(v: any, n: number) {
  const clamp = (x: number) => (x < 1 ? 1 : x > n ? n : x)
  if (typeof v === "number" && Number.isFinite(v)) return clamp(Math.round(v))
  const t = String(v ?? "").trim().toUpperCase()
  if (/^\d+$/.test(t)) return clamp(Number(t))
  const letter = t.match(/^[A-E]/)
  if (letter) return clamp(letter[0].charCodeAt(0) - 64)
  const d = t.match(/\d+/)
  if (d) return clamp(Number(d[0]))
  return 1
}
function splitOptions(v: any) {
  if (Array.isArray(v)) return v
  if (typeof v === "string") return v.split(/[,;|\n]\s*/).map((s) => s.trim()).filter(Boolean)
  return []
}
function dedupeOptions(v: any, n: number) {
  const seen = new Set<string>()
  const out: string[] = []
  for (const raw of splitOptions(v)) {
    const t = plainMath(
      String(raw ?? "")
        .replace(/^\s*(?:(?:[A-E]\)|[1-5][.)])\s*)+/i, "")
        .trim(),
    )
    const k = t.toLowerCase()
    if (!t || seen.has(k)) continue
    seen.add(k)
    out.push(t)
    if (out.length === n) break
  }
  return out.slice(0, n)
}
function trueFalseOptions(o: Normalized) {
  const tf = trueFalseWords(o)
  return [tf.true, tf.false]
}
function cleanOptions(v: any, target: number, isTrueFalse: boolean, o: Normalized) {
  if (isTrueFalse) {
    const raw = splitOptions(v).map((x: any) => String(x).trim().toLowerCase())
    const looksTF = raw.length === 2 && raw.some((x: string) => /true|false|vrai|faux|صحيح|خطأ|صح|خطا/.test(x))
    return looksTF ? splitOptions(v).slice(0, 2).map((x: any) => String(x).trim()) : trueFalseOptions(o)
  }
  return dedupeOptions(v, target)
}
function isTrueFalseItem(item: any) {
  const opts = splitOptions(item?.options).map((x: any) => String(x).trim().toLowerCase())
  if (opts.length !== 2) return false
  return opts.some((x: string) => /true|false|vrai|faux|صحيح|خطأ|صح|خطا/.test(x))
}
function ambiguousCorrectSet(question: string, options: string[]) {
  if (/نصفي?\s*مماس|نصفا\s+مماس|نصفَي\s+مماس/.test(question)) {
    const different = options.some((x) => /(?:الحد|الحدين|الحدان).{0,40}(?:مختلف|مختلفان|يختلف)/.test(x))
    const missing = options.some((x) => /المشتقة\s*(?:غير\s+موجودة|لا\s+وجود|غير\s+معرفة|معدومة)/.test(x))
    if (different && missing) return true
  }
  if (/ℝ|كامل\s+المجال|المجال\s+كله/.test(question) && /(?:غير|ليست)\s+(?:معرف|مستمر|قابل)/.test(question)) {
    const partial = options.filter((x) => /√|ln\s*\(|log\s*\(|1\s*\/\s*x/.test(x))
    if (partial.length > 1) return true
  }
  return false
}
function coerce(items: any, o: Normalized): QuizItem[] {
  const arr = Array.isArray(items) ? items : []
  const out: QuizItem[] = []
  const fix = (s: string) => (o.arabic ? localizeArabic(s) : s)
  for (const item of arr) {
    if (out.length >= o.count) break
    const question = fix(nstr(item?.question, 12, 260))
    if (!question) continue
    const isTF = o.questionType === "truefalse" || (o.questionType === "mixed" && isTrueFalseItem(item))
    const target = isTF ? 2 : o.optionsCount
    const options = cleanOptions(item?.options, target, isTF, o).map(fix)
    if (options.length !== target) continue
    if (new Set(options.map((x) => x.toLowerCase())).size !== options.length) continue
    if (ambiguousCorrectSet(question, options)) continue
    const correct = toIndex(item?.correct, options.length)
    const hint = o.hints ? fix(nstr(item?.hint, 6, 180)) || (o.arabic ? "راجع الفكرة الأساسية في المصدر." : "Use the core idea.") : ""
    const explanation =
      fix(nstr(item?.explanation, 12, 360)) ||
      (o.arabic ? "الخيار الصحيح يطابق الفكرة الأساسية، وبقية الخيارات لا تطابقها." : "The correct option matches the main idea; the others do not.")
    out.push({ id: out.length + 1, question, options, correct, hint, explanation })
  }
  return out
}
function validItem(x: any, o: Normalized) {
  if (!x || typeof x.id !== "number" || typeof x.question !== "string") return false
  if (!x.question.trim()) return false
  if (/^(?:سؤال|question)\s*\d+$/i.test(x.question.trim())) return false
  if (!Array.isArray(x.options) || !x.options.length || !x.options.every((o2: any) => typeof o2 === "string" && o2.trim())) return false
  if (new Set(x.options.map((o2: string) => o2.trim().toLowerCase())).size !== x.options.length) return false
  if (x.options.every((o2: string) => /^(?:option|خيار)\s*\d+$/i.test(o2.trim()))) return false
  if (o.questionType === "truefalse" && x.options.length !== 2) return false
  if (o.questionType === "mcq" && x.options.length !== o.optionsCount) return false
  if (o.questionType === "mixed" && x.options.length !== 2 && x.options.length !== o.optionsCount) return false
  if (typeof x.correct !== "number" || x.correct < 1 || x.correct > x.options.length) return false
  if (typeof x.hint !== "string" || typeof x.explanation !== "string") return false
  if (!o.hints && x.hint !== "") return false
  return true
}
function validQuiz(a: any, o: Normalized): a is QuizItem[] {
  return Array.isArray(a) && a.length === o.count && a.every((x) => validItem(x, o))
}

function contentText(r: any) {
  if (typeof r === "string") return r
  const c = r?.content
  if (typeof c === "string") return c
  if (Array.isArray(c)) {
    return c
      .map((p: any) => (typeof p === "string" ? p : typeof p?.text === "string" ? p.text : ""))
      .join("")
  }
  return c == null ? "" : String(c)
}

function asItems(v: any): any[] {
  if (Array.isArray(v)) return v
  if (!v || typeof v !== "object") return []
  for (const key of ["questions", "items", "quiz", "data", "results"]) {
    if (Array.isArray((v as any)[key])) return (v as any)[key]
  }
  if (typeof (v as any).question === "string" && (v as any).options) return [v]
  const arrays = Object.values(v).filter(Array.isArray)
  return arrays.length === 1 ? (arrays[0] as any[]) : []
}

async function ask(topicIn: any, sys: string, context = "", o: Normalized) {
  const topic = normalizeTopic(topicIn)
  const source = context.trim()
    ? `\nSOURCE MATERIAL:\n${context.trim()}\n\nBase every question on the source material above.\n`
    : ""
  const msgs = [
    { role: "system", content: sys },
    {
      role: "user",
      content: `Topic:\n${topic}\n${source}\nGenerate exactly ${o.count} questions.\nReturn only the JSON array.`,
    },
  ] as const
  const r = await llm.invoke([...msgs] as any)
  const raw = contentText(r)
  const txt = extractArray(stripFences(raw))
  const parsed = tryParse<any>(txt)
  if (!parsed) {
    console.warn(`[quiz] unparsed model response (${raw.length} chars)`)
  }
  return asItems(parsed)
}

export async function handleQuiz(topic: string, options: QuizOptions = {}): Promise<QuizItem[]> {
  const o = normalizeOptions(topic, options)
  const context = options.context || ""

  const prompts = [buildSystem(o), buildStrict(o), buildStrict(o)]
  for (let attempt = 0; attempt < prompts.length; attempt++) {
    const parsed = await ask(topic, prompts[attempt], context, o)
    const items = coerce(parsed, o)
    if (validQuiz(items, o)) return items
    console.warn(`[quiz] attempt ${attempt + 1}/${prompts.length} produced invalid quiz (${parsed.length} raw items)`)
  }
  throw new Error("Invalid quiz JSON from model")
}
