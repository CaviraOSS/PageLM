const FENCE_RE = /^\s*```(?:json|markdown|md)?\s*/i;
const TAIL_FENCE_RE = /\s*```\s*$/i;

export function stripFences(s: string) {
  return String(s || "").replace(FENCE_RE, "").replace(TAIL_FENCE_RE, "").trim();
}

// Models often emit \( ... \) and \[ ... \] which remark-math does not render.
export function normalizeMath(md: string) {
  return String(md || "")
    .replace(/\\\[([\s\S]*?)\\\]/g, (_, body: string) => `\n\n$$\n${body.trim()}\n$$\n\n`)
    .replace(/\\\(([\s\S]*?)\\\)/g, (_, body: string) => `$${body.trim()}$`)
    .replace(/\\\(/g, "$")
    .replace(/\\\)/g, "$");
}

export function cleanMarkdown(s: string) {
  return normalizeMath(stripFences(s))
    .replace(/^(#{1,6}\s+.*?)\s*\((?:إن وجدت?|إن أمكن|عند الاقتضاء|إن لزم)\)\s*$/gm, "$1")
    .replace(/^(>\s*\*\*المصدر:\*\*.*)$/gm, (line) =>
      line
        .replace(/https?:\/\/\S+|www\.\S+/gi, "")
        .replace(/\bdocument\b/gi, "وثيقة")
        .replace(/[ \t]{2,}/g, " ")
        .trimEnd(),
    )
    .replace(/المستهددة/g, "المستهدفة")
    .replace(/نص التتمرن/g, "نص التمرين")
    .replace(/إذا\s+و\s+فقط/g, "إذا وفقط")
    .replace(/\bmonotone\b/gi, "رتيبة")
    .replace(/monotonicit[éy]|monotonie/gi, "رتابة")
    .replace(/\binterval\b/gi, "فترة")
    .replace(/\bfunction\b/gi, "دالة")
    .replace(/\bincreasing\b/gi, "متزايدة")
    .replace(/\bdecreasing\b/gi, "متناقصة")
    .replace(/\bfinite\b/gi, "منتهٍ")
    .replace(/متصاعدة/g, "متزايدة")
    .replace(/إذا\s+يختلف/g, "إذا اختلف")
    .replace(/مفهومي\s+الاستمرارية/g, "مفهومَي الاستمرارية")
    .replace(/قانون القفل/g, "قانون التركيب")
    .replace(/\.(pdf|docx?|pptx?|txt|md|json)\b/gi, "")
    .replace(/على مجالها المفتوح/g, "على مجال تعريفها")
    .replace(/على المجال المفتوح لتعريفها/g, "على مجال تعريفها")
    .replace(/مجموعة تعريفهما/g, "مجموعة تعريفه")
    .replace(/مستمران على/g, "مستمرتان على")
    .replace(/قابلان للاشتقاق/g, "قابلتان للاشتقاق")
    .replace(/نصفين من المماس/g, "نصفَي مماس")
    .replace(/مستمرة ومشتقة/g, "مستمرة وقابلة للاشتقاق")
    .trim();
}
