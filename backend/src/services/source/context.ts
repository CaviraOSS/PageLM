import crypto from "crypto"

/**
 * Maximum number of source characters sent to the model for one generation.
 *
 * The value is deliberately kept modest so that a large PDF cannot blow the
 * model context window or the provider's per-minute token budget. It can be
 * raised from the environment without touching the generation code.
 */
const configuredContext = Number(process.env.SOURCE_CONTEXT_CHARS || 5600)
export const DEFAULT_SOURCE_CONTEXT =
  Number.isFinite(configuredContext) && configuredContext >= 500 ? configuredContext : 5600

function snapForward(text: string, index: number) {
  if (index <= 0) return 0
  let i = index
  while (i < text.length && !/\s/.test(text[i - 1] || "")) i++
  return i
}

function snapBack(text: string, index: number, floor: number) {
  let i = index
  while (i > floor && !/\s/.test(text[i - 1] || "")) i--
  return i
}

/**
 * Build a source excerpt that covers the whole document instead of only its
 * first pages. Short sources are returned verbatim. Long sources are sampled
 * from evenly spaced windows (start, middle, end) with explicit omission
 * markers, so the model still sees the conclusion, examples and exercises.
 */
export function sourceContext(text: string, max = DEFAULT_SOURCE_CONTEXT) {
  const full = String(text ?? "").replace(/\r\n?/g, "\n").trim()
  if (!full) return ""
  if (full.length <= max) return full

  const slots = max >= 3000 ? 6 : max >= 1200 ? 4 : 2
  const marker = "\n\n[…] \n\n"
  const budget = Math.max(80, Math.floor((max - marker.length * (slots - 1)) / slots))
  const step = slots > 1 ? (full.length - budget) / (slots - 1) : 0
  const chunks: string[] = []

  for (let i = 0; i < slots; i++) {
    const rawStart = Math.floor(step * i)
    const rawEnd = Math.min(full.length, rawStart + budget)
    const start = i === 0 ? 0 : snapForward(full, rawStart)
    const end = i === slots - 1 ? full.length : snapBack(full, rawEnd, start + 1)
    const chunk = full.slice(start, Math.max(start, end)).trim()
    if (chunk) chunks.push(chunk)
  }

  const out = chunks.join(marker)
  return out.length > max ? out.slice(0, max).trimEnd() : out
}

export function sourceHash(text: string) {
  return crypto.createHash("sha256").update(String(text ?? ""), "utf8").digest("hex")
}

export function sourceStats(text: string) {
  const value = String(text ?? "")
  return {
    chars: value.length,
    words: value.trim() ? value.trim().split(/\s+/).length : 0,
    hash: sourceHash(value),
  }
}