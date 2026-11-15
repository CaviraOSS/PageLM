import { beforeEach, describe, expect, it, vi } from "vitest"

const { invoke } = vi.hoisted(() => ({ invoke: vi.fn() }))
vi.mock("../../../utils/llm/llm", () => ({ default: { invoke } }))

import { generateStudio, pruneDuplicateConcepts, qualifySimulatorCues } from "../index"

const item = (i: number) => ({
  id: i,
  question: `Quelle affirmation décrit correctement le projet Nouras ${i + 1} ?`,
  options: ["La réponse A", "La réponse B", "La réponse C", "La réponse D"],
  correct: 1,
  hint: "Relis la section concernée.",
  explanation: "La source indique explicitement cette réponse.",
})

const reply = (value: unknown) => ({ content: JSON.stringify(value) })

describe("generateStudio", () => {
  beforeEach(() => {
    invoke.mockReset()
  })

  it("generates the quiz from the source context with the requested settings", async () => {
    invoke.mockResolvedValue(reply([item(1), item(2)]))
    const context = "معلومة فريدة: مشروع نورس 2026 يستخدم محركًا اسمه زُلفى."

    const out = await generateStudio("quiz", "نورس.pdf", context, {
      count: 2,
      difficulty: "hard",
      questionType: "mcq",
      optionsCount: 4,
      hints: true,
      language: "fr",
    })

    expect(out.kind).toBe("quiz")
    if (out.kind !== "quiz") throw new Error("unexpected kind")
    expect(out.questions).toHaveLength(2)
    expect(out.settings?.language).toBe("fr")
    expect(out.settings?.difficulty).toBe("hard")

    const [messages] = invoke.mock.calls[0]
    expect(messages[0].content).toContain("in French")
    expect(messages[1].content).toContain("SOURCE MATERIAL")
    expect(messages[1].content).toContain(context)
    expect(messages[1].content).toContain("نورس.pdf")
  })
})

describe("pruneDuplicateConcepts", () => {
  it("removes a concept from the introduction when a specific branch explains it", () => {
    const root = {
      label: "Port Security",
      children: [
        {
          label: "Introduction",
          children: [
            { label: "Layer 2 operation", children: [{ label: "Switch uses MAC addresses" }] },
            { label: "CAM table", children: [{ label: "Maps ports to MACs" }] },
            {
              label: "Sticky MAC",
              children: [{ label: "Learns and saves MAC in running-config" }],
            },
          ],
        },
        {
          label: "Security Features",
          children: [
            {
              label: "Sticky MAC",
              children: [{ label: "Auto-learns and stores MAC persistently" }],
            },
          ],
        },
        { label: "Threats", children: [{ label: "MAC Flooding" }] },
      ],
    }

    const pruned = pruneDuplicateConcepts(root)
    const intro = pruned.children?.find((branch) => branch.label === "Introduction")
    const features = pruned.children?.find((branch) => branch.label === "Security Features")

    expect(intro?.children?.map((child) => child.label)).toEqual([
      "Layer 2 operation",
      "CAM table",
    ])
    expect(features?.children?.[0]?.label).toBe("Sticky MAC")
  })

  it("removes exact repeats inside one branch but keeps the first occurrence", () => {
    const root = {
      label: "Root",
      children: [
        {
          label: "Branch",
          children: [
            { label: "Concept", children: [{ label: "Detail" }] },
            { label: "Concept", children: [{ label: "Other detail" }] },
          ],
        },
      ],
    }

    const pruned = pruneDuplicateConcepts(root)
    expect(pruned.children?.[0]?.children?.map((child) => child.label)).toEqual(["Concept"])
    expect(pruned.children?.[0]?.children?.[0]?.children?.[0]?.label).toBe("Detail")
  })

  it("keeps an introduction branch when its concepts are unique", () => {
    const root = {
      label: "Root",
      children: [
        { label: "Introduction", children: [{ label: "Background concept" }] },
        { label: "Core", children: [{ label: "Core concept" }] },
        { label: "Applications", children: [{ label: "Application concept" }] },
      ],
    }

    const pruned = pruneDuplicateConcepts(root)
    expect(pruned.children?.[0]?.children?.[0]?.label).toBe("Background concept")
  })
})

describe("qualifySimulatorCues", () => {
  it("marks a simulator-only red port as Packet Tracer behaviour", () => {
    const root = {
      label: "Port Security",
      children: [
        {
          label: "Violation Modes",
          children: [{ label: "Shutdown", children: [{ label: "Err-disabled, port turns red" }] }],
        },
      ],
    }

    qualifySimulatorCues(root)
    expect(root.children[0].children[0].children[0].label).toBe(
      "Err-disabled, port turns red (Packet Tracer)",
    )
  })

  it("does not duplicate an existing simulator qualifier", () => {
    const node = { label: "Err-disabled, port turns red (Packet Tracer)" }
    qualifySimulatorCues(node)
    expect(node.label).toBe("Err-disabled, port turns red (Packet Tracer)")
  })
})