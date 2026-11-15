import { beforeEach, describe, expect, it, vi } from "vitest"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock("../../../utils/llm/llm", () => ({ default: { invoke } }))

import { handleQuiz } from "../index"

const item = (i: number, overrides: Record<string, unknown> = {}) => ({
  id: i,
  question: `ما ناتج جمع العدد ${i + 1} مع العدد ${i + 2} في الرياضيات؟`,
  options: ["العدد ثلاثة", "العدد خمسة", "العدد سبعة", "العدد تسعة"],
  correct: 1,
  hint: "اجمع العددين معًا بعناية.",
  explanation: "نجمع العددين لنحصل على الناتج الصحيح المطلوب.",
  ...overrides,
})

const reply = (value: unknown) => ({ content: typeof value === "string" ? value : JSON.stringify(value) })

describe("handleQuiz", () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it("recovers from a malformed first response and returns real questions", async () => {
    invoke
      .mockResolvedValueOnce(reply("not json"))
      .mockResolvedValueOnce(reply([item(1), item(2)]))

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(out).toHaveLength(2)
    expect(out[0].question).toContain("جمع")
    expect(out[0].options).toHaveLength(4)
    expect(invoke).toHaveBeenCalledTimes(2)
  })

  it("never fills the quiz with placeholder questions", async () => {
    invoke.mockResolvedValue(reply("still not json"))

    await expect(handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })).rejects.toThrow(
      "Invalid quiz JSON from model",
    )
    expect(invoke).toHaveBeenCalledTimes(3)
  })

  it("accepts an object that wraps the questions array", async () => {
    invoke.mockResolvedValue(reply({ questions: [item(1), item(2)] }))

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(out).toHaveLength(2)
    expect(out[1].id).toBe(2)
  })

  it("strips model-added option prefixes because the UI adds its own labels", async () => {
    invoke.mockResolvedValue(
      reply([
        item(1, {
          options: ["A) العدد ثلاثة", "B) العدد خمسة", "C) العدد سبعة", "D) العدد تسعة"],
        }),
        item(2),
      ]),
    )

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(out[0].options).toEqual(["العدد ثلاثة", "العدد خمسة", "العدد سبعة", "العدد تسعة"])
  })

  it("localizes stray English prose in Arabic items", async () => {
    invoke.mockResolvedValue(
      reply([
        item(1, {
          question: "ما هي limit الدالة عند النقطة المحددة في الدرس؟",
          hint: "تأمل monotonicity الدالة على interval المعطى.",
        }),
        item(2),
      ]),
    )

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(out[0].question).toContain("النهاية")
    expect(out[0].question).not.toContain("limit")
    expect(out[0].hint).toContain("الرتابة")
    expect(out[0].hint).toContain("فترة")
  })

  it("fixes a vertical tangent wrongly described as perpendicular to the y-axis", async () => {
    invoke.mockResolvedValue(
      reply([
        item(1, {
          explanation: "عندما يؤول الحد إلى ∞ يكون المماس عموديًا على محور التراتيب.",
        }),
        item(2),
      ]),
    )

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(out[0].explanation).toContain("موازٍ لمحور التراتيب")
    expect(out[0].explanation).not.toContain("عموديًا على محور التراتيب")
  })

  it("rejects half-tangent items where two options are mathematically correct", async () => {
    invoke
      .mockResolvedValueOnce(
        reply([
          item(1, {
            question: "ماذا يحدث عند وجود نصف مماس للدالة عند نقطة؟",
            options: [
              "الحد الأيسر والحد الأيمن مختلفان",
              "المشتقة غير موجودة عند تلك النقطة",
              "المماس يصبح أفقيًا تمامًا",
              "الدالة تكون متصلة فقط",
            ],
          }),
          item(2),
        ]),
      )
      .mockResolvedValueOnce(reply([item(1), item(2)]))

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(invoke).toHaveBeenCalledTimes(2)
    expect(out).toHaveLength(2)
    expect(out.some((q) => q.question.includes("نصف مماس"))).toBe(false)
  })

  it("rejects domain items with several contextually correct partial expressions", async () => {
    invoke
      .mockResolvedValueOnce(
        reply([
          item(1, {
            question: "الدالة معرفة على ℝ لكنها غير قابلة للاشتقاق عند نقطتين، ما التفسير؟",
            options: ["√x غير معرفة عند الصفر", "ln(x) غير معرفة عند الصفر", "1/x غير معرفة عند الصفر", "الدالة متصلة"],
          }),
          item(2),
        ]),
      )
      .mockResolvedValueOnce(reply([item(1), item(2)]))

    const out = await handleQuiz("رياضيات", { count: 2, optionsCount: 4, hints: true })

    expect(invoke).toHaveBeenCalledTimes(2)
    expect(out).toHaveLength(2)
    expect(out.some((q) => q.question.includes("ℝ"))).toBe(false)
  })

  it("uses the requested language and passes source context to the model", async () => {
    const frenchItem = item(1, {
      question: "La dérivée de x² est 2x.",
      options: ["Vrai", "Faux"],
      correct: 1,
      hint: "",
      explanation: "La règle de puissance donne bien 2x.",
    })
    invoke.mockResolvedValue(reply([frenchItem]))

    const context = "معلومة فريدة: مشروع نورس 2026 يستخدم محركًا اسمه زُلفى."
    const out = await handleQuiz("الاشتقاق", {
      count: 1,
      questionType: "truefalse",
      language: "fr",
      hints: false,
      context,
    })

    expect(out).toHaveLength(1)
    expect(out[0].options).toEqual(["Vrai", "Faux"])
    const [messages] = invoke.mock.calls[0]
    expect(messages[0].content).toContain("in French")
    expect(messages[0].content).toContain('("Vrai", "Faux")')
    expect(messages[1].content).toContain("SOURCE MATERIAL")
    expect(messages[1].content).toContain(context)
  })
})