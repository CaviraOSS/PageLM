import crypto from "crypto"
import fs from "fs"
import path from "path"
import { parseMultipart, handleUpload } from "../../lib/parser/upload"
import db from "../../utils/database/keyv"

export type SourceMeta = {
  id: string
  name: string
  originalName: string
  mimeType: string
  size: number
  chars: number
  createdAt: number
  filePath: string
  textPath: string
  preview: string
}

function cleanPreview(text: string) {
  const plain = String(text || "")
    .replace(/--- Page \d+ ---/gi, " ")
    .replace(/\$\$?/g, " ")
    .replace(/\\[a-zA-Z]+/g, " ")
    .replace(/[{}^_]/g, " ")
    .replace(/^\s{0,3}#{1,6}\s*/gm, "")
    .replace(/^\s*[-*+]\s+/gm, "")
    .replace(/[*`>#]/g, "")
    .replace(/\s+/g, " ")
    .trim()
  return plain.slice(0, 300)
}

async function readSource(id: string): Promise<SourceMeta | undefined> {
  return (await db.get(`source:${id}`)) as SourceMeta | undefined
}

export function sourceRoutes(app: any) {
  app.get("/sources", async (_: any, res: any) => {
    try {
      const list = ((await db.get("sources")) as SourceMeta[]) || []
      res.send({
        ok: true,
        sources: list
          .sort((a, b) => b.createdAt - a.createdAt)
          .map((s) => ({ ...s, preview: cleanPreview(s.preview) })),
      })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || "failed" })
    }
  })

  app.get("/sources/:id", async (req: any, res: any) => {
    try {
      const src = await readSource(req.params.id)
      if (!src) return res.status(404).send({ ok: false, error: "source not found" })
      res.send({ ok: true, source: { ...src, preview: cleanPreview(src.preview) } })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || "failed" })
    }
  })

  app.post("/sources", async (req: any, res: any) => {
    try {
      const { files } = await parseMultipart(req)
      if (!files.length) {
        return res.status(400).send({ ok: false, error: "no files uploaded" })
      }

      const created: SourceMeta[] = []
      const errors: string[] = []

      for (const f of files) {
        try {
          const id = crypto.randomUUID()
          const namespace = `source_${id}`
          const { stored } = await handleUpload({
            filePath: f.path,
            filename: f.filename,
            contentType: f.mimeType,
            namespace,
          })
          const text = fs.readFileSync(stored, "utf-8")
          const meta: SourceMeta = {
            id,
            name: f.filename,
            originalName: f.filename,
            mimeType: f.mimeType,
            size: fs.statSync(f.path).size,
            chars: text.length,
            createdAt: Date.now(),
            filePath: f.path,
            textPath: stored,
            preview: cleanPreview(text),
          }
          await db.set(`source:${id}`, meta)
          const list = ((await db.get("sources")) as SourceMeta[]) || []
          list.push(meta)
          await db.set("sources", list)
          created.push(meta)
        } catch (e: any) {
          errors.push(`${f.filename}: ${e?.message || "failed"}`)
        }
      }

      if (!created.length) {
        return res.status(400).send({
          ok: false,
          error: errors.join(" | ") || "could not extract text from the uploaded file",
          errors,
        })
      }

      res.status(201).send({ ok: true, sources: created, errors })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || "failed" })
    }
  })

  app.delete("/sources/:id", async (req: any, res: any) => {
    try {
      const id = req.params.id
      const src = await readSource(id)
      if (!src) return res.status(404).send({ ok: false, error: "source not found" })

      for (const p of [src.filePath, src.textPath]) {
        try { if (p && fs.existsSync(p)) fs.unlinkSync(p) } catch { }
      }

      // Remove this source's vector index too (JSON db mode keeps one file per namespace).
      try {
        const vec = path.join(process.cwd(), "storage", "json", `source_${id}.json`)
        if (fs.existsSync(vec)) fs.unlinkSync(vec)
      } catch { }

      const list = (((await db.get("sources")) as SourceMeta[]) || []).filter((s) => s.id !== id)
      await db.set("sources", list)
      await db.delete(`source:${id}`)
      res.send({ ok: true })
    } catch (e: any) {
      res.status(500).send({ ok: false, error: e?.message || "failed" })
    }
  })
}
