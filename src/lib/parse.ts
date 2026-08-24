// Paste JSON handler — PRIMARY flow (GEM chat → paste here)
// User gets JSON from Gemini GEM (ishortn.ink/gemini-gem) and pastes here

import type { UniversalPaper } from "@/types"
import { jsonrepair } from "jsonrepair"
import { validatePaper } from "./validate"
import { normalizeText, normalizeOptions } from "./normalize"

export interface ParseResult {
  ok: boolean
  paper?: UniversalPaper
  issues?: ReturnType<typeof validatePaper>
  error?: string
}

function stripFences(s: string): string {
  let t = s.replace(/^\uFEFF/, "").trim()
  // ```json ... ``` or ``` ... ```
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  // if LLM added prose, extract first {...} or [...]
  if (!t.startsWith("{") && !t.startsWith("[")) {
    const m = t.match(/(\{[\s\S]*\}|\[[\s\S]*\])/)
    if (m) t = m[1]
  }
  return t
}

export function parsePastedJSON(raw: string): ParseResult {
  const stripped = stripFences(raw)
  let json: unknown
  try {
    json = JSON.parse(stripped)
  } catch {
    // LLM output often has trailing commas / single quotes / smart quotes / truncation — repair then retry
    try {
      json = JSON.parse(jsonrepair(stripped))
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      return { ok: false, error: `Invalid JSON: ${msg}` }
    }
  }

  // Support both {questions:[]} and full UniversalPaper {meta, sections, questions}
  // Normalize to UniversalPaper
  let paper: UniversalPaper
  if (isUniversalPaper(json)) {
    paper = json
  } else if (isQuestionsArray(json)) {
    const qs = (json as { questions: unknown[] }).questions as UniversalPaper["questions"]
    paper = {
      meta: {
        title: "Pasted Test",
        durationMinutes: 180,
        totalQuestions: qs.length,
        createdAt: new Date().toISOString(),
      },
      sections: [],
      questions: qs as UniversalPaper["questions"],
    }
  } else {
    return { ok: false, error: "JSON must be {meta,sections,questions} or {questions:[]}" }
  }

  // normalize — options single-line, text preserve math
  paper.questions = paper.questions.map((q) => ({
    ...q,
    text: normalizeText(q.text),
    options: normalizeOptions(q.options ?? null),
  }))

  // Fill defaults
  paper.questions = paper.questions.map((q, i) => ({
    ...q,
    id: q.id || `q-${q.number || i + 1}`,
    number: q.number || i + 1,
    subject: q.subject ?? null,
    section: q.section ?? null,
    topic: q.topic ?? null,
    type: q.type || "mcq",
    marks: q.marks ?? 4,
    negativeMarks: q.negativeMarks ?? (q.type === "nat" ? 0 : 1),
    hasDiagram: q.hasDiagram ?? false,
    diagrams: q.diagrams ?? null,
    difficulty: q.difficulty ?? null,
    pageNo: q.pageNo ?? null,
    text: normalizeText(q.text),
  }))

  paper.meta.totalQuestions = paper.questions.length

  const issues = validatePaper(paper)
  const hasError = issues.some((x) => x.severity === "error")
  if (hasError) {
    return { ok: false, paper, issues, error: "Validation errors — fix JSON or edit in Review" }
  }
  // warnings allowed — still ok to go to Review
  return { ok: true, paper, issues }
}

function isUniversalPaper(v: unknown): v is UniversalPaper {
  return !!v && typeof v === "object" && "questions" in (v as Record<string, unknown>) && "meta" in (v as Record<string, unknown>)
}
function isQuestionsArray(v: unknown): v is { questions: unknown[] } {
  return !!v && typeof v === "object" && Array.isArray((v as Record<string, unknown>).questions) && !("meta" in (v as Record<string, unknown>))
}

// For paste URL fetch (GEM share link)
export async function fetchAndParse(url: string): Promise<ParseResult> {
  const res = await fetch(url)
  if (!res.ok) return { ok: false, error: `Fetch failed ${res.status}` }
  const text = await res.text()
  return parsePastedJSON(text)
}
