import type { Msg } from './types'

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

function statusOf(e: any): number | undefined {
  const s = e?.status ?? e?.response?.status ?? e?.statusCode ?? e?.code
  return typeof s === 'number' ? s : undefined
}

function isRetryable(e: any): boolean {
  const status = statusOf(e)
  if (status && [408, 429, 500, 502, 503, 504].includes(status)) return true
  const msg = String(e?.message || e || '')
  return /429|too many requests|resource[_ ]exhausted|rate limit|quota|overloaded|temporarily unavailable|503|502|timed? ?out|ETIMEDOUT|ECONNRESET|ECONNREFUSED|fetch failed/i.test(
    msg,
  )
}

function retryAfterMs(e: any): number | undefined {
  const headers = e?.response?.headers ?? e?.headers
  let raw: any
  try {
    raw = typeof headers?.get === 'function' ? headers.get('retry-after') : headers?.['retry-after']
  } catch {
    raw = undefined
  }
  const secs = Number(raw)
  if (Number.isFinite(secs) && secs > 0) return Math.min(secs * 1000, 30000)

  const msg = String(e?.message || e || '')
  const m = msg.match(/(?:try again|retry) in\s+([\d.]+)\s*(ms|s)\b/i)
  if (m) {
    const n = Number(m[1])
    const ms = /ms/i.test(m[2]) ? n : n * 1000
    if (Number.isFinite(ms) && ms > 0) return Math.min(ms, 30000)
  }
  return undefined
}

// Groq counts prompt tokens + max_tokens against its per-minute budget. A 413
// tells us both the requested total and the limit, so we can derive the real
// prompt size and shrink max_tokens just enough to fit. The rejected request
// still consumes the minute window, so we must wait before retrying.
function tpmOverflow(e: any): { requested: number; limit: number } | undefined {
  const msg = String(e?.message || e || '')
  if (!/tokens per minute|\bTPM\b|request too large/i.test(msg)) return undefined
  const req = msg.match(/Requested\s+([\d,]+)/i)
  const lim = msg.match(/Limit\s+([\d,]+)/i)
  if (!req || !lim) return undefined
  const requested = Number(req[1].replace(/,/g, ''))
  const limit = Number(lim[1].replace(/,/g, ''))
  if (!Number.isFinite(requested) || !Number.isFinite(limit) || requested <= limit) return undefined
  return { requested, limit }
}

const TPM_WAIT_MS = Number(process.env.LLM_TPM_WAIT_MS || 61000)

async function invokeWithRetry(m: any, ms: Msg[], attempts = 3) {
  const originalMax = typeof m.maxTokens === 'number' ? m.maxTokens : undefined
  let lastErr: any
  let adjusted = false
  try {
    for (let i = 0; i < attempts; i++) {
      try {
        return await m.invoke(ms)
      } catch (e: any) {
        lastErr = e
        const tpm = tpmOverflow(e)
        if (process.env.LLM_DEBUG) {
          console.warn('[llm] attempt failed', {
            status: statusOf(e),
            maxTokens: m.maxTokens,
            tpm,
            message: String(e?.message || e || '').slice(0, 220),
          })
        }
        if (tpm && !adjusted && typeof m.maxTokens === 'number') {
          const promptTokens = Math.max(0, tpm.requested - m.maxTokens)
          const next = Math.floor(tpm.limit - promptTokens - 160)
          if (next >= 1024 && next < m.maxTokens) m.maxTokens = next
          adjusted = true
          if (process.env.LLM_DEBUG) {
            console.warn('[llm] tpm wait', TPM_WAIT_MS, 'maxTokens', m.maxTokens)
          }
          await sleep(TPM_WAIT_MS)
          i--
          continue
        }
        if (i === attempts - 1 || !isRetryable(e)) throw e
        const wait = retryAfterMs(e) ?? 1500 * Math.pow(2, i) + Math.floor(Math.random() * 500)
        await sleep(wait)
      }
    }
    throw lastErr
  } finally {
    if (originalMax !== undefined && m.maxTokens !== originalMax) m.maxTokens = originalMax
  }
}

export const wrapChat = (m: any) => ({
  invoke: (ms: Msg[]) => invokeWithRetry(m, ms),
  call: (ms: Msg[]) => invokeWithRetry(m, ms),
})
