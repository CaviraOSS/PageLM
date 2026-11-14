import fs from 'fs'
import path from 'path'
import crypto from 'crypto'
import mammoth from 'mammoth'
import pdf from 'pdf-parse'
import Busboy from 'busboy'
import { marked } from 'marked'
import { embedTextFromFile } from '../ai/embed'
import { OllamaEmbeddings } from '@langchain/ollama'
import { OpenAIEmbeddings } from '@langchain/openai'

const str = path.join(process.cwd(), 'storage', 'uploads')
if (!fs.existsSync(str)) fs.mkdirSync(str, { recursive: true })

export type UpFile = { path: string; filename: string; mimeType: string }

/**
 * Browsers send multipart filenames as UTF-8, but Busboy historically decoded
 * them as latin1. Depending on the client/proxy this shows Arabic names as
 * mojibake ("Ø¯Ù„ÙŠÙ„..."). Decode the raw bytes back when they form valid
 * UTF-8, while leaving genuine latin1 names untouched.
 */
function decodeUploadName(name: string) {
  if (!name || !/[\u00C0-\u00FF]/.test(name)) return name
  try {
    const decoded = Buffer.from(name, "latin1").toString("utf8")
    if (decoded && !decoded.includes("\uFFFD")) return decoded
  } catch {
    /* keep the original name */
  }
  return name
}

export function parseMultipart(req: any): Promise<{ q: string; chatId?: string; sourceId?: string; files: UpFile[] }> {
  return new Promise((resolve, reject) => {
    const bb = Busboy({ headers: req.headers, defParamCharset: "utf8" })
    let q = ''
    let chatId = ''
    let sourceId = ''
    const files: UpFile[] = []
    let pending = 0
    let ended = false
    let failed = false
    const done = () => { if (!failed && ended && pending === 0) resolve({ q, chatId: chatId || undefined, sourceId: sourceId || undefined, files }) }

    bb.on('field', (n, v) => {
      if (n === 'q') q = v
      if (n === 'chatId') chatId = v
      if (n === 'sourceId') sourceId = v
    })
    bb.on('file', (_n, file, info: any) => {
      pending++
      const filename = path.basename(decodeUploadName(info?.filename || 'file'))
      const mimeType = info?.mimeType || info?.mime || 'application/octet-stream'
      const fp = path.join(str, `${Date.now()}-${crypto.randomUUID()}-${filename}`)
      const ws = fs.createWriteStream(fp)
      file.on('error', e => { failed = true; reject(e) })
      ws.on('error', e => { failed = true; reject(e) })
      ws.on('finish', () => { files.push({ path: fp, filename, mimeType }); pending--; done() })
      file.pipe(ws)
    })
    bb.on('error', e => { failed = true; reject(e) })
    bb.on('finish', () => { ended = true; done() })
    req.pipe(bb)
  })
}

export async function handleUpload(a: { filePath: string; filename?: string; contentType?: string; namespace?: string }): Promise<{ stored: string }> {
  const fp = a.filePath
  const mime = a.contentType || ''
  const ns = a.namespace || 'pagelm'
  const txt = await extractText(fp, mime)
  if (!txt?.trim()) throw new Error('No valid content extracted from file.')
  const out = `${fp}.txt`
  fs.writeFileSync(out, txt)
  const isO = process.env.LLM_PROVIDER === 'ollama'
  const _emb = isO
    ? new OllamaEmbeddings({ model: process.env.OLLAMA_MODEL || 'llama3' })
    : new OpenAIEmbeddings({ model: 'text-embedding-3-small', openAIApiKey: process.env.OPENROUTER_API_KEY, configuration: { baseURL: 'https://openrouter.ai/api/v1' } })
  await embedTextFromFile(out, ns)
  return { stored: out }
}

// Gemini reads PDFs as documents (including scanned pages), which handles Arabic
// and other non-Latin scripts far better than pdf-parse's font decoding.
const GEMINI_INLINE_LIMIT = 15 * 1024 * 1024

function geminiApiKey() {
  return process.env.gemini || process.env.GOOGLE_API_KEY || process.env.GEMINI_API_KEY || ''
}

async function extractPdfWithGemini(raw: Buffer, key: string) {
  const model = process.env.PDF_EXTRACT_MODEL || process.env.gemini_model || 'gemini-2.5-flash'
  const body = {
    contents: [{
      parts: [
        {
          text: 'Extract every piece of text from this PDF in its original language. ' +
            'Preserve headings, lists, tables, and mathematical formulas. Write formulas in LaTeX. ' +
            "Put a line '--- Page N ---' before each page. " +
            'Do not summarize, translate, or add commentary. Return only the extracted text.',
        },
        { inline_data: { mime_type: 'application/pdf', data: raw.toString('base64') } },
      ],
    }],
    generationConfig: { temperature: 0, maxOutputTokens: 32768 },
  }

  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 180_000)
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-goog-api-key': key },
        body: JSON.stringify(body),
        signal: ctrl.signal,
      },
    )
    const json: any = await res.json()
    if (!res.ok) {
      throw new Error(json?.error?.message || `gemini_http_${res.status}`)
    }
    return (json?.candidates?.[0]?.content?.parts || [])
      .map((p: any) => (typeof p?.text === 'string' ? p.text : ''))
      .join('')
      .trim()
  } finally {
    clearTimeout(timer)
  }
}

async function extractPdf(raw: Buffer) {
  const provider = (process.env.PDF_EXTRACT_PROVIDER || 'auto').toLowerCase()
  const key = geminiApiKey()

  // 'local' forces pdf-parse. 'auto' uses Gemini whenever a key is configured.
  if (provider !== 'local' && key && raw.length <= GEMINI_INLINE_LIMIT) {
    try {
      const text = await extractPdfWithGemini(raw, key)
      if (text) return text
      console.warn('[upload] Gemini returned empty PDF text, falling back to pdf-parse')
    } catch (err: any) {
      console.warn('[upload] Gemini PDF extraction failed, falling back to pdf-parse:', err?.message || err)
    }
  }

  const data = await pdf(raw)
  return data.text
}

export async function extractText(filePath: string, mime: string) {
  const raw = fs.readFileSync(filePath)
  if (mime.includes('pdf')) {
    return extractPdf(raw)
  }
  if (mime.includes('markdown')) {
    return marked.parse(raw.toString())
  }
  if (mime.includes('plain')) {
    return raw.toString()
  }
  if (mime.includes('wordprocessingml') || mime.includes('msword') || mime.includes('vnd.oasis.opendocument.text')) {
    const r = await mammoth.extractRawText({ buffer: raw })
    return r.value
  }
  throw new Error('unsupported file type')
}
