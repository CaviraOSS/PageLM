import { describe, expect, it } from "vitest"
import { sourceContext, sourceHash, sourceStats } from "../context"

describe("sourceContext", () => {
  it("returns a short source verbatim", () => {
    const text = "نص قصير وفريد عن مشروع نورس 2026."
    expect(sourceContext(text, 500)).toBe(text)
  })

  it("samples the beginning, middle and end of a long source", () => {
    const text = Array.from({ length: 200 }, (_, i) => `SECTION ${i} ${"x".repeat(30)}`).join("\n")
    const out = sourceContext(text, 2000)

    expect(out.length).toBeLessThanOrEqual(2000)
    expect(out).toContain("SECTION 0")
    expect(out).toContain("SECTION 199")
    expect(out).toContain("[…]")
    expect(out).toMatch(/SECTION (6\d|7\d|8\d|1\d\d)/)
    expect(out).not.toBe(text.slice(0, 2000))
  })

  it("produces a stable content hash and honest stats", () => {
    const a = sourceStats("مشروع نورس 2026")
    const b = sourceStats("مشروع نورس 2026")
    const c = sourceStats("مشروع آخر 2026")

    expect(a).toEqual(b)
    expect(a.hash).toHaveLength(64)
    expect(a.words).toBe(3)
    expect(a.hash).not.toBe(c.hash)
    expect(sourceHash("")).toBe(sourceHash(""))
  })
})