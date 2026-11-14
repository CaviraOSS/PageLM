import llm from "../../utils/llm/llm"
import { handleQuiz, type QuizItem, type QuizLanguage } from "../quiz"
import { makeLearningFile, type LearningMode, type LearningTemplate } from "./learning"
import { cleanMarkdown } from "./markdown"
import { sourceContext } from "../source/context"

export type StudioKind = "quiz" | "qcm" | "flashcards" | "summary" | "mindmap" | "learning"

export type QuizDifficulty = "easy" | "medium" | "hard"
export type QuizLength = "short" | "medium" | "long"
export type QuizQuestionType = "mcq" | "truefalse" | "mixed"

export type StudioQuizSettings = {
  count: number
  difficulty: QuizDifficulty
  length: QuizLength
  hints: boolean
  optionsCount: number
  questionType: QuizQuestionType
  language: QuizLanguage
  mode: "practice" | "exam"
}

export type StudioOptions = Partial<StudioQuizSettings> & {
  learningMode?: LearningMode
  template?: LearningTemplate
  answers?: boolean
}

export type StudioFlashcard = {
  q: string
  a: string
  tags: string[]
}

export type MindMapNode = {
  label: string
  children?: MindMapNode[]
}

export type MindMapTemplate =
  | "tree"
  | "balanced"
  | "org"
  | "radial"
  | "arc"
  | "timeline"
  | "stairs"
  | "outline"
  | "fishbone"
  | "columns"
  | "lanes"
  | "matrix"

export type StudioMindMap = {
  title: string
  template?: MindMapTemplate
  root: MindMapNode
}

export type StudioPayload =
  | { kind: "quiz" | "qcm"; questions: QuizItem[]; settings?: StudioQuizSettings }
  | { kind: "flashcards"; cards: StudioFlashcard[] }
  | { kind: "summary"; markdown: string }
  | { kind: "mindmap"; mindmap: StudioMindMap }
  | { kind: "learning"; mode: LearningMode; template: LearningTemplate; markdown: string }

function stripFences(s: string) {
  return s.replace(/^\s*```(?:json|markdown|md)?\s*/i, "").replace(/\s*```\s*$/i, "").trim()
}

function tryParse<T = unknown>(s: string): T | null {
  try { return JSON.parse(s) as T } catch { return null }
}

// Model output can contain LaTeX/markdown backslashes that are not valid JSON.
function repairLooseJson(raw: string): string {
  let out = "", inStr = false
  for (let i = 0; i < raw.length; i++) {
    const ch = raw[i]
    if (!inStr) {
      out += ch
      if (ch === '"') inStr = true
      continue
    }
    if (ch === '"') { out += ch; inStr = false; continue }
    if (ch === "\\") {
      const next = raw[i + 1]
      if (next === undefined) { out += "\\\\"; continue }
      if (next === "u") {
        const hex = raw.slice(i + 2, i + 6)
        if (/^[0-9a-fA-F]{4}$/.test(hex)) { out += "\\u" + hex; i += 5 }
        else out += "\\\\"
        continue
      }
      if ('"\\/bfnrt'.includes(next)) { out += "\\" + next; i++; continue }
      out += "\\\\"
      continue
    }
    if (ch === "\n") { out += "\\n"; continue }
    if (ch === "\r") { out += "\\r"; continue }
    if (ch === "\t") { out += "\\t"; continue }
    if (ch < " ") { out += "\\u" + ch.charCodeAt(0).toString(16).padStart(4, "0"); continue }
    out += ch
  }
  return out
}

function parseJson(s: string): any | null {
  const t = stripFences(String(s || ""))
  if (!t) return null
  const direct = tryParse<any>(repairLooseJson(t))
  if (direct) return direct
  const arr = t.match(/\[[\s\S]*\]/)
  if (arr) {
    const parsed = tryParse<any>(repairLooseJson(arr[0]))
    if (parsed) return parsed
  }
  const obj = t.match(/\{[\s\S]*\}/)
  if (obj) {
    const parsed = tryParse<any>(repairLooseJson(obj[0]))
    if (parsed) return parsed
  }
  return null
}

function answerText(r: any) {
  return typeof r === "string" ? r : String((r as any)?.content ?? "")
}

const FLASHCARD_SYS = `PRIMARY OBJECTIVE
Create exactly 8 high-quality study flashcards from the provided source material.

OUTPUT CONTRACT
Return only a JSON array with 8 objects. No markdown, no code fences, no prose outside the JSON.

LANGUAGE
Write every question and answer in the dominant language of the source material.
Keep numbers, symbols, and mathematical notation unchanged.

SCHEMA
{
  "q": "a focused question or prompt (8..220 chars)",
  "a": "a clear, complete answer or explanation (10..500 chars)",
  "tags": ["2 to 4 short lowercase tags"]
}

STYLE
Plain text only. UTF-8. No markdown. No LaTeX delimiters.
Questions must test understanding, application, or connections — not pure recall.

FAIL-SAFE
If uncertain, use the most important concepts from the source.
Output only the JSON array.`

const FLASHCARD_STRICT = `RETRY: STRICT FORMAT ONLY
Return only a JSON array with exactly 8 objects. Each object has "q", "a", "tags" (array of 2-4 strings).
No markdown, no code fences, no extra text. Use the source language.`

const SUMMARY_SYS = `You are an expert study-notes writer.

TASK
Create a structured, high-quality study summary of the provided source material.

OUTPUT
GitHub-flavored Markdown only. No code fences around the whole answer.
Use $...$ for inline math and $$...$$ for display math. Never use \(...\) or \[...\].

LANGUAGE
Write in the dominant language of the source material.

STRUCTURE
# <a clear title in the source language>
## Overview / نظرة عامة
A short paragraph explaining what the source covers and why it matters.
## Key Concepts / المفاهيم الأساسية
3-6 sections with bolded terms, short explanations, and examples or formulas when relevant.
## Quick Review / نقاط للمراجعة السريعة
5-8 bullet points that capture the most important facts and relationships.
## Check Your Understanding / أسئلة لفهم أعمق
3-5 open questions that require reasoning, not memorization.

Keep it accurate to the source. Do not invent facts.`

const MINDMAP_SYS = `PRIMARY OBJECTIVE
Build a clear, accurate, well-structured mind map from the provided source material.

OUTPUT CONTRACT
Return only a JSON object. No markdown, no code fences, no prose outside the JSON.

SCHEMA
{
  "title": "short title of the mind map (3..80 chars)",
  "template": "tree | balanced | org | radial | arc | timeline | stairs | outline | fishbone | columns | lanes | matrix",
  "root": {
    "label": "central concept (2..60 chars)",
    "children": [
      {
        "label": "main branch (2..60 chars)",
        "children": [
          { "label": "sub-idea (2..70 chars)", "children": [{ "label": "detail (2..70 chars)" }] }
        ]
      }
    ]
  }
}

TEMPLATE RULES
Choose the single template that best fits the content and return its exact English name:
- tree: general topics, explanations, cause and effect.
- balanced: comparisons or two-sided topics with two natural groups.
- org: classifications, taxonomies, or strict hierarchies.
- radial: one central concept with many facets radiating from it.
- arc: a central topic with a few balanced facets that read best as an open fan above the root.
- timeline: chronological processes, historical sequences, stages, or step-by-step methods along one line.
- stairs: progressive levels, maturity stages, or increasing difficulty where each step builds on the previous one.
- outline: structured notes or study summaries best read top-to-bottom as an indented list.
- fishbone: causes, factors, or contributors to a problem or result.
- columns: many parallel branches or categories that need a compact, aligned strip.
- lanes: several independent parallel categories or factors, each best read as its own horizontal track.
- matrix: four to six parallel categories that compare naturally in a compact two-column grid.
The template changes only the visual layout, never the node structure.

STRUCTURE RULES
- 4 to 7 main branches directly under the root.
- 2 to 4 sub-ideas under each main branch.
- Optional third level: at most 3 short details per sub-idea.
- Maximum depth: root -> branch -> sub-idea -> detail. Never deeper.
- Total nodes: 35 to 70.
- Group ideas logically: definitions, causes, types, steps, examples, comparisons, conclusions — as fits the source.
- Order the main branches as a learning path: prerequisites and foundations first, then core concepts, applications, and advanced material. For mathematics, put limits and continuity before derivatives and integrals, even if the source presents them in a different order.
- Never repeat the same concept in two different branches. Place each concept once in the most specific branch; an introduction may name a concept but must not re-explain it.
- When the source describes a simulator or a GUI, distinguish simulated visual indicators (for example a Packet Tracer port turning red) from real hardware behaviour (amber/off LEDs, err-disabled state). If the source itself contains a simulator-only visual cue without naming the simulator, keep the cue but add a short qualifier such as "(Packet Tracer)" or use the real hardware wording.

LABEL RULES
- Short noun phrases, not sentences. No markdown, no bullets, no LaTeX delimiters.
- Labels must be informative on their own and understandable without the parent.
- Write in the dominant language of the source material. Keep numbers and symbols unchanged.

GROUNDING
- Every node must be supported by the source material. Never invent facts.
- Prefer the most important concepts over trivia.

FAIL-SAFE
If the source is short, fewer nodes are acceptable, but the root must still have at least 3 main branches.
Output only the JSON object.`

const MINDMAP_STRICT = `RETRY: STRICT FORMAT ONLY
Return only one JSON object shaped as:
{"title":"...","template":"tree|balanced|org|radial|arc|timeline|stairs|outline|fishbone|columns|lanes|matrix","root":{"label":"...","children":[{"label":"...","children":[{"label":"..."}]}]}}
Rules: 4-7 main branches in a logical learning order (foundations first), 2-4 sub-ideas per branch, no repeated concepts across branches, max depth 3 below root, short labels, source language, no markdown, no extra text.`

function cleanLabel(v: any): string {
  return String(v ?? "")
    .replace(/```+/g, "")
    .replace(/[#*_>`~]/g, "")
    .replace(/^\s*[-•]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
}

function cleanNode(input: any, depth: number, budget: { left: number }): MindMapNode | null {
  if (!input || budget.left <= 0) return null
  const label = cleanLabel(input?.label ?? input?.title ?? input?.name ?? input?.text)
  if (!label) return null
  budget.left--
  const node: MindMapNode = { label: label.slice(0, 90) }
  if (depth >= 3) return node
  const rawKids = Array.isArray(input?.children)
    ? input.children
    : Array.isArray(input?.nodes)
      ? input.nodes
      : []
  const maxKids = depth === 0 ? 7 : depth === 1 ? 5 : 3
  const kids: MindMapNode[] = []
  for (const k of rawKids.slice(0, maxKids)) {
    const child = cleanNode(k, depth + 1, budget)
    if (child) kids.push(child)
  }
  if (kids.length) node.children = kids
  return node
}

const INTRO_BRANCH_WORDS = [
  "introduction",
  "overview",
  "intro",
  "background",
  "basics",
  "getting started",
  "مقدمة",
  "مقدمه",
  "نظرة عامة",
  "لمحة عامة",
  "مدخل",
  "تعريف",
  "تمهيد",
  "خلفية",
]

function conceptKey(label: string): string {
  return String(label ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/[\u064B-\u065F\u0670\u06D6-\u06ED]/g, "")
    .replace(/\u0640/g, "")
    .replace(/[إأآٱ]/g, "ا")
    .replace(/ى/g, "ي")
    .replace(/ة/g, "ه")
    .replace(/[^\p{L}\p{N}]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function isIntroBranch(label: string): boolean {
  const key = conceptKey(label)
  return INTRO_BRANCH_WORDS.some((word) => key === word || key.startsWith(`${word} `))
}

function collectConceptKeys(node: MindMapNode, out: Set<string>, depth = 0): void {
  if (depth >= 2) {
    const key = conceptKey(node.label)
    if (key) out.add(key)
  }
  for (const child of node.children ?? []) collectConceptKeys(child, out, depth + 1)
}

function pruneBranch(node: MindMapNode, blocked: Set<string>, seen: Set<string>): void {
  if (!node.children?.length) return
  node.children = node.children.filter((child) => {
    const key = conceptKey(child.label)
    if (key && (blocked.has(key) || seen.has(key))) return false
    if (key) seen.add(key)
    pruneBranch(child, blocked, seen)
    return true
  })
}

const SIMULATOR_CUES: Array<{ pattern: RegExp; qualifier: string }> = [
  { pattern: /\bport turns red\b/i, qualifier: "Packet Tracer" },
]

/**
 * A few source guides describe simulator-only visual cues as if they were
 * hardware facts. Keep the source wording but make the simulator context
 * explicit so the map does not teach the wrong LED behaviour.
 */
export function qualifySimulatorCues(node: MindMapNode): void {
  const label = node.label
  if (label && !/packet tracer|simulator|simulation/i.test(label)) {
    for (const cue of SIMULATOR_CUES) {
      if (cue.pattern.test(label)) {
        node.label = `${label} (${cue.qualifier})`.slice(0, 90)
        break
      }
    }
  }
  for (const child of node.children ?? []) qualifySimulatorCues(child)
}

/**
 * Keep each concept in the branch that explains it. Introduction/overview
 * branches often repeat a concept that a later branch covers in detail; those
 * repeats are removed from the introduction. Exact repeats inside one branch
 * are removed everywhere.
 */
export function pruneDuplicateConcepts(root: MindMapNode): MindMapNode {
  const branches = root.children ?? []
  const intro = branches.map((branch) => isIntroBranch(branch.label))
  if (!intro.some(Boolean)) {
    for (const branch of branches) pruneBranch(branch, new Set(), new Set([conceptKey(branch.label)]))
    return root
  }

  const elsewhere = new Set<string>()
  branches.forEach((branch, index) => {
    if (intro[index]) return
    const key = conceptKey(branch.label)
    if (key) elsewhere.add(key)
    collectConceptKeys(branch, elsewhere, 1)
  })

  branches.forEach((branch, index) => {
    const blocked = intro[index] ? elsewhere : new Set<string>()
    pruneBranch(branch, blocked, new Set([conceptKey(branch.label)]))
  })

  const kept = branches.filter(
    (branch, index) => !intro[index] || (branch.children?.length ?? 0) > 0,
  )
  if (kept.length >= 3) root.children = kept
  return root
}

const MINDMAP_TEMPLATES: MindMapTemplate[] = [
  "tree",
  "balanced",
  "org",
  "radial",
  "arc",
  "timeline",
  "stairs",
  "outline",
  "fishbone",
  "columns",
  "lanes",
  "matrix",
]

function normalizeTemplate(v: any): MindMapTemplate {
  const t = String(v ?? "").trim().toLowerCase()
  return (MINDMAP_TEMPLATES as string[]).includes(t) ? (t as MindMapTemplate) : "tree"
}

function cleanMindMap(input: any, fallbackTitle: string): StudioMindMap | null {
  const src = input?.mindmap ?? input?.map ?? input
  if (!src || typeof src !== "object") return null
  const rootRaw = src?.root ?? src?.center ?? (Array.isArray(src?.children) ? src : null)
  if (!rootRaw) return null
  const root = cleanNode(rootRaw, 0, { left: 70 })
  if (!root) return null
  pruneDuplicateConcepts(root)
  qualifySimulatorCues(root)
  const cleanTitle = cleanLabel(src?.title ?? fallbackTitle)
    .replace(/\.(pdf|docx?|txt|pptx?|md)$/i, "")
    .slice(0, 100)
  return { title: cleanTitle || fallbackTitle, template: normalizeTemplate(src?.template), root }
}

async function makeMindMap(title: string, context: string): Promise<StudioMindMap> {
  const user = `SOURCE TITLE:\n${title}\n\nSOURCE MATERIAL:\n${context}\n\nReturn only the JSON object.`
  const first = cleanMindMap(parseJson(answerText(await llm.invoke([
    { role: "system", content: MINDMAP_SYS },
    { role: "user", content: user },
  ] as any))), title)
  if (first && (first.root.children?.length ?? 0) >= 3) return first

  const second = cleanMindMap(parseJson(answerText(await llm.invoke([
    { role: "system", content: MINDMAP_STRICT },
    { role: "user", content: user },
  ] as any))), title)
  if (second && (second.root.children?.length ?? 0) >= 2) return second
  throw new Error("Invalid mind map JSON from model")
}

function cleanCards(input: any): StudioFlashcard[] {
  const raw = Array.isArray(input) ? input : Array.isArray(input?.flashcards) ? input.flashcards : []
  const out: StudioFlashcard[] = []
  for (const item of raw) {
    const q = String(item?.q ?? item?.question ?? "").replace(/\s+/g, " ").trim()
    const a = String(item?.a ?? item?.answer ?? "").replace(/\s+/g, " ").trim()
    if (!q || !a) continue
    const tags = Array.isArray(item?.tags)
      ? item.tags.map((t: any) => String(t).trim().toLowerCase()).filter(Boolean).slice(0, 4)
      : []
    out.push({ q: q.slice(0, 260), a: a.slice(0, 700), tags })
    if (out.length === 8) break
  }
  return out
}

async function makeFlashcards(title: string, context: string): Promise<StudioFlashcard[]> {
  const user = `SOURCE TITLE:\n${title}\n\nSOURCE MATERIAL:\n${context}\n\nReturn only the JSON array.`
  const first = parseJson(answerText(await llm.invoke([
    { role: "system", content: FLASHCARD_SYS },
    { role: "user", content: user },
  ] as any)))
  const cards = cleanCards(first)
  if (cards.length >= 4) return cards

  const second = parseJson(answerText(await llm.invoke([
    { role: "system", content: FLASHCARD_STRICT },
    { role: "user", content: user },
  ] as any)))
  const retry = cleanCards(second)
  if (!retry.length) throw new Error("Invalid flashcards JSON from model")
  return retry
}

async function makeSummary(title: string, context: string): Promise<string> {
  const r = await llm.invoke([
    { role: "system", content: SUMMARY_SYS },
    { role: "user", content: `SOURCE TITLE:\n${title}\n\nSOURCE MATERIAL:\n${context}\n\nWrite the Markdown summary now.` },
  ] as any)
  const md = cleanMarkdown(answerText(r))
  if (!md) throw new Error("Empty summary from model")
  return md
}

function resolveQuizSettings(kind: StudioKind, options: StudioOptions): StudioQuizSettings {
  const questionType: QuizQuestionType =
    options.questionType === "truefalse" || options.questionType === "mixed"
      ? options.questionType
      : "mcq"
  const rawCount = Number(options.count)
  const count = Math.max(1, Math.min(20, Math.floor(Number.isFinite(rawCount) && rawCount > 0 ? rawCount : 10)))
  const rawOptions = Number(options.optionsCount)
  const optionsCount =
    questionType === "truefalse"
      ? 2
      : Math.max(2, Math.min(5, Math.floor(Number.isFinite(rawOptions) && rawOptions > 0 ? rawOptions : 4)))
  const difficulty: QuizDifficulty =
    options.difficulty === "easy" || options.difficulty === "hard" ? options.difficulty : "medium"
  const length: QuizLength =
    options.length === "short" || options.length === "long" ? options.length : "medium"
  const language: QuizLanguage =
    options.language === "ar" || options.language === "fr" || options.language === "en"
      ? options.language
      : "auto"
  return {
    count,
    difficulty,
    length,
    hints: options.hints !== false,
    optionsCount,
    questionType,
    language,
    mode: options.mode === "exam" || kind === "qcm" ? "exam" : "practice",
  }
}

export async function generateStudio(
  kind: StudioKind,
  title: string,
  text: string,
  options: StudioOptions = {},
): Promise<StudioPayload> {
  const context = sourceContext(text)
  if (!context) throw new Error("source is empty")

  if (kind === "quiz" || kind === "qcm") {
    const settings = resolveQuizSettings(kind, options)
    const questions = await handleQuiz(title, {
      context,
      count: settings.count,
      difficulty: settings.difficulty,
      length: settings.length,
      hints: settings.hints,
      optionsCount: settings.optionsCount,
      questionType: settings.questionType,
      language: settings.language,
    })
    return { kind, questions, settings }
  }
  if (kind === "flashcards") {
    const cards = await makeFlashcards(title, context)
    return { kind, cards }
  }
  if (kind === "summary") {
    const markdown = await makeSummary(title, context)
    return { kind, markdown }
  }
  if (kind === "mindmap") {
    const mindmap = await makeMindMap(title, context)
    return { kind, mindmap }
  }
  if (kind === "learning") {
    const { mode, template, markdown } = await makeLearningFile(title, context, options)
    return { kind, mode, template, markdown }
  }
  throw new Error(`unknown studio kind: ${kind}`)
}
