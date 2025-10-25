import fs from "fs"
import path from "path"
import { askWithContext, BASE_SYSTEM_PROMPT } from "../../lib/ai/ask"

const allowedRoots = [
  path.resolve(process.cwd(), "storage"),
  path.resolve(process.cwd(), "assets")
]

const MAX_BYTES = 1.5 * 1024 * 1024 // 1.5MB guardrail for text reads

type CompanionHistory = { role: string; content: unknown }

function normalizePathInput(input: string): string {
  let trimmed = input.trim()
  if (!trimmed) return ""
  try {
    const url = new URL(trimmed)
    trimmed = url.pathname || ""
  } catch {
    // not a URL, continue with raw string
  }
  return trimmed.replace(/\\/g, "/")
}

function resolveDocumentPath(input: string): string | null {
  if (!input) return null
  const normalized = normalizePathInput(input)
  if (!normalized) return null

  const cleaned = normalized.startsWith("/") ? normalized.slice(1) : normalized
  const candidates: string[] = []

  if (path.isAbsolute(normalized)) {
    candidates.push(path.normalize(normalized))
  } else {
    for (const root of allowedRoots) {
      candidates.push(path.resolve(root, cleaned))
    }
  }

  for (const candidate of candidates) {
    for (const root of allowedRoots) {
      const resolvedRoot = path.resolve(root)
      const prefix = resolvedRoot.endsWith(path.sep) ? resolvedRoot : resolvedRoot + path.sep
      if (candidate === resolvedRoot || candidate.startsWith(prefix)) {
        if (fs.existsSync(candidate) && fs.statSync(candidate).isFile()) {
          return candidate
        }
      }
    }
  }
  return null
}

async function readDocumentText(filePath: string): Promise<string> {
  const stats = await fs.promises.stat(filePath)
  if (!stats.isFile()) throw new Error("document is not a file")
  if (stats.size > MAX_BYTES) throw new Error("document too large for companion (limit 1.5MB)")
  return fs.promises.readFile(filePath, "utf8")
}

function buildCompanionPrompt(label?: string): string {
  const focus = label ? ` for the document "${label}"` : " for this document"
  const extra = `
CONTEXT FOCUS
You are an AI companion${focus}. Use ONLY the supplied context to respond.
If the context is insufficient, say so clearly rather than guessing.
Favor concise, actionable study guidance grounded in the provided material.
`
  return `${BASE_SYSTEM_PROMPT}\n\n${extra.trim()}`
}

export function companionRoutes(app: any) {
  app.post("/api/companion/ask", async (req: any, res: any) => {
    try {
      const body = req.body || {}
      const question = typeof body.question === "string" ? body.question.trim() : ""
      if (!question) return res.status(400).send({ error: "question required" })

      const history = Array.isArray(body.history) ? (body.history as CompanionHistory[]) : undefined
      const documentTitle = typeof body.documentTitle === "string" ? body.documentTitle.trim() : ""

      let contextText = ""
      let filename: string | undefined

      if (typeof body.documentText === "string" && body.documentText.trim()) {
        contextText = body.documentText
      } else if (typeof body.filePath === "string" && body.filePath.trim()) {
        const resolved = resolveDocumentPath(body.filePath)
        if (!resolved) return res.status(404).send({ error: "document not found or not accessible" })
        filename = path.basename(resolved)
        try {
          contextText = await readDocumentText(resolved)
        } catch (err: any) {
          const msg = err?.message || "unable to read document"
          return res.status(400).send({ error: msg })
        }
      } else {
        return res.status(400).send({ error: "documentText or filePath required" })
      }

      if (!contextText.trim()) {
        return res.status(400).send({ error: "document is empty" })
      }

      const prompt = buildCompanionPrompt(filename || documentTitle)
      const answer = await askWithContext({
        question,
        context: contextText,
        topic: typeof body.topic === "string" && body.topic.trim() ? body.topic.trim() : undefined,
        history,
        systemPrompt: prompt,
        cacheScope: "companion"
      })

      res.send({ ok: true, companion: answer })
    } catch (err: any) {
      console.error("[companion] ask failed", err?.message || err)
      res.status(500).send({ error: "failed to run companion request" })
    }
  })
}
