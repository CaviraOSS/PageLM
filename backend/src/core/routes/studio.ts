import crypto from "crypto"
import fs from "fs"
import db from "../../utils/database/keyv"
import { generateStudio, type StudioKind } from "../../services/studio"
import { sourceStats } from "../../services/source/context"
import { emitToAll } from "../../utils/chat/ws"
import { withTimeout } from "../../utils/quiz/promise"

type Job = {
  id: string
  sourceId: string
  sourceName: string
  kind: StudioKind
  status: "running" | "done" | "error"
  payload?: any
  error?: string
}

const jobs = new Map<string, Job>()
const sockets = new Map<string, Set<any>>()

const KINDS: StudioKind[] = ["quiz", "qcm", "flashcards", "summary", "mindmap", "learning"]
const log = (...a: any[]) => console.log("[studio]", ...a)

function payloadSummary(payload: any) {
  switch (payload?.kind) {
    case "quiz":
    case "qcm":
      return { questions: payload.questions?.length ?? 0, settings: payload.settings }
    case "flashcards":
      return { cards: payload.cards?.length ?? 0 }
    case "mindmap":
      return {
        template: payload.mindmap?.template,
        branches: payload.mindmap?.root?.children?.length ?? 0,
      }
    case "learning":
      return { mode: payload.mode, template: payload.template, chars: payload.markdown?.length ?? 0 }
    case "summary":
      return { chars: payload.markdown?.length ?? 0 }
    default:
      return undefined
  }
}

function emit(jobId: string, msg: any) {
  emitToAll(sockets.get(jobId), msg)
}

export function studioRoutes(app: any) {
  app.ws("/ws/studio", (ws: any, req: any) => {
    const u = new URL(req.url, "http://localhost")
    const jobId = u.searchParams.get("jobId")
    if (!jobId) return ws.close(1008, "jobId required")

    let set = sockets.get(jobId)
    if (!set) {
      set = new Set()
      sockets.set(jobId, set)
    }
    set.add(ws)
    ws.send(JSON.stringify({ type: "ready", jobId }))

    const job = jobs.get(jobId)
    if (job?.status === "done" && job.payload) {
      ws.send(JSON.stringify({ type: "result", kind: job.kind, payload: job.payload }))
      ws.send(JSON.stringify({ type: "done" }))
    }
    if (job?.status === "error") {
      ws.send(JSON.stringify({ type: "error", error: job.error || "failed" }))
    }

    ws.on("error", (e: any) => log("ws err", jobId, e?.message || e))
    ws.on("close", () => {
      set!.delete(ws)
      if (set!.size === 0) sockets.delete(jobId)
    })

    const iv = setInterval(() => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping", t: Date.now() }))
      } catch { }
    }, 15000)
    ws.on("close", () => clearInterval(iv))
  })

  app.post("/studio/generate", async (req: any, res: any) => {
    try {
      const sourceId = String(req.body?.sourceId || "").trim()
      const kind = String(req.body?.kind || "").trim() as StudioKind
      const options = req.body?.options && typeof req.body.options === "object" ? req.body.options : {}
      if (!sourceId) return res.status(400).send({ ok: false, error: "sourceId required" })
      if (!KINDS.includes(kind)) return res.status(400).send({ ok: false, error: "invalid kind" })

      const src: any = await db.get(`source:${sourceId}`)
      if (!src) return res.status(404).send({ ok: false, error: "source not found" })
      if (!src.textPath || !fs.existsSync(src.textPath)) {
        return res.status(400).send({ ok: false, error: "source text is missing; upload it again" })
      }

      const jobId = crypto.randomUUID()
      const job: Job = {
        id: jobId,
        sourceId,
        sourceName: src.name || src.originalName || "Source",
        kind,
        status: "running",
      }
      jobs.set(jobId, job)
      log("start", jobId, kind, "source:", job.sourceName)

      res.status(202).send({ ok: true, jobId, kind, sourceName: job.sourceName, stream: `/ws/studio?jobId=${jobId}` })

      setTimeout(async () => {
        try {
          emit(jobId, { type: "phase", value: "reading" })
          const text = fs.readFileSync(src.textPath, "utf-8")
          const stats = sourceStats(text)
          log("source", jobId, {
            chars: stats.chars,
            words: stats.words,
            hash: stats.hash.slice(0, 12),
            options,
          })

          await new Promise((r) => setTimeout(r, 450))
          emit(jobId, { type: "phase", value: "analyzing" })

          await new Promise((r) => setTimeout(r, 650))
          emit(jobId, { type: "phase", value: "generating" })

          const started = Date.now()
          const payload = await withTimeout(
            generateStudio(kind, job.sourceName, text, options),
            210000,
            "generateStudio",
          )

          job.status = "done"
          job.payload = payload
          log("done", jobId, kind, `${Date.now() - started}ms`, payloadSummary(payload))
          emit(jobId, { type: "result", kind, payload })
          emit(jobId, { type: "done" })

          setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000)
        } catch (e: any) {
          const msg = e?.message || "failed"
          job.status = "error"
          job.error = msg
          log("error", jobId, msg)
          emit(jobId, { type: "error", error: msg })
          setTimeout(() => jobs.delete(jobId), 30 * 60 * 1000)
        }
      }, 300)
    } catch (e: any) {
      log("route err", e?.message || e)
      res.status(500).send({ ok: false, error: e?.message || "internal" })
    }
  })
}
