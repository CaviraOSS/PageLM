import crypto from "crypto"
import fs from "fs"
import db from "../../utils/database/keyv"
import { handleQuiz, type QuizItem, type QuizOptions } from "../../services/quiz"
import { sourceContext, sourceStats } from "../../services/source/context"
import { emitToAll } from "../../utils/chat/ws"
import { withTimeout } from "../../utils/quiz/promise"

type QuizJob = {
  status: "running" | "done" | "error"
  quiz?: QuizItem[]
  error?: string
  createdAt: number
}

const sockets = new Map<string, Set<any>>()
const jobs = new Map<string, QuizJob>()
const qlog = (...a: any[]) => console.log("[quiz]", ...a)

function emit(quizId: string, msg: any) {
  emitToAll(sockets.get(quizId), msg)
}

export function quizRoutes(app: any) {
  app.ws("/ws/quiz", (ws: any, req: any) => {
    const u = new URL(req.url, "http://localhost")
    const id = u.searchParams.get("quizId")
    if (!id) return ws.close(1008, "quizId required")

    let s = sockets.get(id)
    if (!s) {
      s = new Set()
      sockets.set(id, s)
    }
    s.add(ws)

    qlog("ws open", id, "clients:", s.size)
    ws.send(JSON.stringify({ type: "ready", quizId: id }))

    // The generation may finish before the browser finishes opening the
    // socket. Replay the stored result instead of leaving the UI stuck.
    const job = jobs.get(id)
    if (job?.status === "done" && job.quiz) {
      ws.send(JSON.stringify({ type: "quiz", quiz: job.quiz }))
      ws.send(JSON.stringify({ type: "done" }))
    } else if (job?.status === "error") {
      ws.send(JSON.stringify({ type: "error", error: job.error || "failed" }))
    }

    ws.on("error", (e: any) => qlog("ws err", id, e?.message || e))
    ws.on("close", () => {
      s!.delete(ws)
      if (s!.size === 0) sockets.delete(id)
      qlog("ws close", id, "left:", s!.size)
    })

    const iv = setInterval(() => {
      try {
        if (ws.readyState === 1) ws.send(JSON.stringify({ type: "ping", t: Date.now() }))
      } catch { }
    }, 15000)
    ws.on("close", () => clearInterval(iv))
  })

  app.post("/quiz", async (req: any, res: any) => {
    try {
      const body = req.body && typeof req.body === "object" ? req.body : {}
      const sourceId = String(body.sourceId || "").trim()
      const rawOptions: QuizOptions =
        body.options && typeof body.options === "object" ? (body.options as QuizOptions) : {}

      let topic = String(body.topic || "").trim()
      let text = ""
      let sourceName = ""

      if (sourceId) {
        const src: any = await db.get(`source:${sourceId}`)
        if (!src) return res.status(404).send({ ok: false, error: "source not found" })
        if (!src.textPath || !fs.existsSync(src.textPath)) {
          return res.status(400).send({ ok: false, error: "source text is missing; upload it again" })
        }
        text = fs.readFileSync(src.textPath, "utf-8")
        if (!text.trim()) {
          return res.status(400).send({ ok: false, error: "source is empty; upload a readable file" })
        }
        sourceName = String(src.name || src.originalName || "Source")
        if (!topic) topic = sourceName.replace(/\.[^.]+$/, "").trim() || "المصدر"
      }

      if (!topic) return res.status(400).send({ ok: false, error: "topic required" })

      const options: QuizOptions = {
        ...rawOptions,
        context: sourceId ? sourceContext(text) : String(rawOptions.context || ""),
      }

      const quizId = crypto.randomUUID()
      const stats = sourceId ? sourceStats(text) : null
      jobs.set(quizId, { status: "running", createdAt: Date.now() })
      qlog("start", quizId, {
        topic,
        sourceId: sourceId || null,
        sourceName: sourceName || null,
        sourceChars: stats?.chars ?? 0,
        sourceHash: stats?.hash.slice(0, 12) ?? null,
        count: options.count,
        difficulty: options.difficulty,
        questionType: options.questionType,
        language: options.language,
        hints: options.hints,
        optionsCount: options.optionsCount,
      })

      res.status(202).send({
        ok: true,
        quizId,
        sourceName: sourceName || undefined,
        stream: `/ws/quiz?quizId=${quizId}`,
      })

      setTimeout(() => jobs.delete(quizId), 30 * 60 * 1000)

      setImmediate(async () => {
        try {
          emit(quizId, { type: "phase", value: "generating" })
          const qz = await withTimeout(handleQuiz(topic, options), 180000, "handleQuiz")
          jobs.set(quizId, { status: "done", quiz: qz, createdAt: Date.now() })
          qlog("generated", quizId, Array.isArray(qz) ? qz.length : "n/a")
          emit(quizId, { type: "quiz", quiz: qz })
          emit(quizId, { type: "done" })
          qlog("done", quizId)
        } catch (e: any) {
          const msg = e?.message || "failed"
          jobs.set(quizId, { status: "error", error: msg, createdAt: Date.now() })
          qlog("error", quizId, msg)
          emit(quizId, { type: "error", error: msg })
        }
      })
    } catch (e: any) {
      qlog("500 route err", e?.message || e)
      res.status(500).send({ ok: false, error: e?.message || "internal" })
    }
  })
}