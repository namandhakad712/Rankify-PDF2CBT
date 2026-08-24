import type { UniversalPaper, UniversalQuestion } from "@/types"
import { chat as providerChat, limitsFor, type ProviderEntry, type ProviderMessage } from "./providers"
import { normalizeText, normalizeOptions } from "./normalize"
import { validatePaper } from "./validate"
import { jsonrepair } from "jsonrepair"

// ── Page-chunked agent extraction ──────────────────────────────────────────
// Free models = stateless + rate-limited + small output budgets.
// Strategy: 1 page = 1 self-contained request (overlapping CONTEXT_START tail),
// sequential with delay, per-page checkpoints for resume, merge+dedup at end.

export interface ChunkResult {
  questions: UniversalQuestion[]
  lastNum: number
}

export interface AgentJobState {
  id: string // `${fileName}__${fileSize}`
  fileName: string
  pages: string[] // chunk texts by index
  results: Record<string, ChunkResult> // pageIndex (string) → result
  done: boolean
  updatedAt: number
}

export type PageStatus = "pending" | "running" | "done" | "failed"
export interface AgentProgress {
  index: number
  status: PageStatus
  note?: string
}

const SYSTEM_PROMPT = `You are a precise exam-paper JSON extractor working on ONE page slice of a question paper.
Output STRICT JSON only, no markdown fences:
{"questions":[Q...],"lastCompleteQuestionNumber":<int|null>}
Each Q: {"number":int,"subject":string|null,"section":string|null,"topic":string|null,
"type":"mcq"|"msq"|"nat"|"true-false"|"fill-blank"|"match"|"assertion-reason"|"passage",
"text":string,"options":string[]|null,"answer":string,"answers":string[]|null,
"marks":number,"negativeMarks":number,"hasDiagram":boolean,"difficulty":"easy"|"medium"|"hard"|null,"explanation":string|null}
RULES:
- text/options preserve LaTeX verbatim $...$ \\(...\\) $$...$$ — NEVER unicode-convert math.
- options are single-line strings; answer mcq="1"-"4" 1-indexed as displayed; msq answer="" and answers=["0","2"] 0-indexed sorted; nat answer=numeric string; unknown answer="".
- If the first visible question is CONTINUED from the previous page (see CONTEXT_START), emit the continuation part anyway with its number — a later merge step reconciles duplicates.
- Do NOT invent questions. No commentary outside JSON. lastCompleteQuestionNumber = number of the last FULLY visible question on this page.`

function userPrompt(chunkText: string, contextStart: string, expectNext: number): string {
  return `Expected next question number: ${expectNext}
CONTEXT_START (tail of previous page — read-only hint):
"""
${contextStart || "(none — start of paper)"}
"""
PAGE_TEXT:
"""
${chunkText}
"""`
}

/** fence/prose strip + repair fallback parse for chunk responses */
function parseChunkJSON(raw: string): { questions?: unknown[]; lastCompleteQuestionNumber?: number | null } {
  let t = raw.replace(/^\uFEFF/, "").trim()
  t = t.replace(/^```(?:json)?\s*/i, "").replace(/```\s*$/i, "").trim()
  if (!t.startsWith("{")) {
    const m = t.match(/(\{[\s\S]*\})/)
    if (m) t = m[1]
  }
  try {
    return JSON.parse(t)
  } catch {
    return JSON.parse(jsonrepair(t))
  }
}

async function chatWithBackoff(
  entry: ProviderEntry,
  opts: { model: string; messages: ProviderMessage[] },
  signal: AbortSignal,
  maxTries = 4,
): Promise<string> {
  let wait = 4000
  for (let attempt = 1; attempt <= maxTries; attempt++) {
    if (signal.aborted) throw new Error("cancelled")
    try {
      return await providerChat(entry, { ...opts, responseFormat: { type: "json_object" } })
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const retryAfter = /retry-after:\s*(\d+)/i.exec(msg)?.[1]
      const rateLimited = /\b429\b|rate.?limit|too many requests/i.test(msg)
      const serverBlip = /\b5\d\d\b/.test(msg)
      if (!rateLimited && !serverBlip) throw e
      if (attempt === maxTries) throw e
      wait = retryAfter ? Number(retryAfter) * 1000 : wait * 2
      await new Promise((r) => setTimeout(r, Math.min(wait, 60_000)))
    }
  }
  throw new Error("unreachable")
}

/** Process one chunk; on truncation/parse failure recursively split big chunks */
async function processChunk(
  entry: ProviderEntry,
  chunkText: string,
  contextStart: string,
  expectNext: number,
  signal: AbortSignal,
): Promise<ChunkResult> {
  const content = await chatWithBackoff(entry, {
    model: entry.model || "",
    messages: [
      { role: "system", content: SYSTEM_PROMPT },
      { role: "user", content: userPrompt(chunkText, contextStart, expectNext) },
    ],
  }, signal)
  try {
    const j = parseChunkJSON(content)
    const qs = Array.isArray(j.questions) ? (j.questions as UniversalQuestion[]) : []
    return { questions: qs, lastNum: Number(j.lastCompleteQuestionNumber) || expectNext - 1 }
  } catch {
    // likely output-truncation on a dense page → split & conquer
    if (chunkText.length > 4000) {
      const mid = chunkText.lastIndexOf("\n", Math.floor(chunkText.length / 2))
      const cut = mid > 1000 ? mid : Math.floor(chunkText.length / 2)
      const a = await processChunk(entry, chunkText.slice(0, cut), contextStart, expectNext, signal)
      const b = await processChunk(entry, chunkText.slice(cut), chunkText.slice(Math.max(0, cut - 700)), a.lastNum + 1, signal)
      return { questions: [...a.questions, ...b.questions], lastNum: Math.max(a.lastNum, b.lastNum) }
    }
    throw new Error("Chunk unparseable even after repair")
  }
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

/** stem-prefix similarity for boundary duplicate detection */
function sameStem(a: UniversalQuestion, b: UniversalQuestion): boolean {
  const norm = (s: string) => s.replace(/\s+/g, " ").slice(0, 70).toLowerCase()
  return norm(a.text) === norm(b.text)
}

export function mergeChunkResults(results: Record<string, ChunkResult>): UniversalQuestion[] {
  const flat: UniversalQuestion[] = []
  const idxs = Object.keys(results).map(Number).sort((x, y) => x - y)
  for (const i of idxs) flat.push(...results[String(i)].questions)

  // sort stable by number; dedupe identical numbers keeping richest (options + longer text)
  flat.sort((a, b) => a.number - b.number)
  const byNumber = new Map<number, UniversalQuestion>()
  for (const q of flat) {
    const prev = byNumber.get(q.number)
    if (!prev) { byNumber.set(q.number, q); continue }
    const richer = ((q.options?.length ?? 0) > (prev.options?.length ?? 0)) ||
      ((q.options?.length ?? 0) === (prev.options?.length ?? 0) && (q.text?.length ?? 0) >= (prev.text?.length ?? 0))
    if (richer) byNumber.set(q.number, q)
  }
  let merged = [...byNumber.values()]

  // adjacent shifted-number duplicates (continuation re-emitted with next number)
  merged = merged.filter((q, i) => {
    if (i === 0) return true
    const p = merged[i - 1]
    return !(sameStem(p, q) && q.number - p.number <= 1)
  })

  // reindex 1..N
  return merged.map((q, i) => ({
    ...q,
    id: `q-${i + 1}`,
    number: i + 1,
    text: normalizeText(q.text ?? ""),
    options: normalizeOptions(q.options ?? null),
    subject: q.subject ?? null,
    section: q.section ?? null,
    topic: q.topic ?? null,
    type: q.type || "mcq",
    marks: q.marks ?? 4,
    negativeMarks: q.negativeMarks ?? (q.type === "nat" ? 0 : 1),
    hasDiagram: q.hasDiagram ?? false,
    diagrams: null,
    difficulty: q.difficulty ?? null,
  }))
}

export async function runAgentExtract(opts: {
  jobId: string
  pages: string[]
  entry: ProviderEntry
  delayMs?: number
  resumeState?: AgentJobState | null
  onProgress?: (p: AgentProgress[]) => void
  onCheckpoint?: (state: AgentJobState) => Promise<void> | void
  signal?: AbortSignal
}): Promise<{ paper: UniversalPaper; progress: AgentProgress[] }> {
  const { jobId, pages, entry, delayMs = 1500, resumeState, onProgress, onCheckpoint, signal } = opts
  const signalRef = signal ?? new AbortController().signal

  const state: AgentJobState = resumeState?.pages.length === pages.length
    ? { ...resumeState, updatedAt: Date.now(), done: false }
    : { id: jobId, fileName: jobId, pages, results: {}, done: false, updatedAt: Date.now() }

  const progress: AgentProgress[] = pages.map((_, i) => ({
    index: i,
    status: state.results[String(i)] ? "done" : "pending",
  }))
  const emit = () => onProgress?.(progress.map((p) => ({ ...p })))

  for (let i = 0; i < pages.length; i++) {
    if (signalRef.aborted) break
    if (state.results[String(i)]) continue // checkpoint hit — resume
    const rawPage = pages[i].trim()
    // respect the SELECTED MODEL's context window — ~4 chars/token, 25% headroom for output
    const charCap = Math.floor((limitsFor(entry, entry.model || "").contextWindow * 3) / 4)
    const pageText = rawPage.length > charCap ? rawPage.slice(0, charCap) : rawPage
    if (!pageText) { progress[i] = { index: i, status: "done", note: "empty page" }; state.results[String(i)] = { questions: [], lastNum: 0 }; emit(); continue }

    progress[i] = { index: i, status: "running" }; emit()
    try {
      const prevTail = i > 0 ? state.pages[i - 1].slice(-800) : ""
      const knownMax = Object.values(state.results).reduce((m, r) => Math.max(m, r.lastNum), 0)
      const res = await processChunk(entry, pageText, prevTail, knownMax + 1, signalRef)
      if (!res.questions.length && pageText.length > 200) throw new Error("No questions found on this page")
      state.results[String(i)] = res
      progress[i] = { index: i, status: "done" }
    } catch (e: unknown) {
      if (signalRef.aborted) { progress[i] = { index: i, status: "pending" }; break }
      progress[i] = { index: i, status: "failed", note: e instanceof Error ? e.message.slice(0, 140) : String(e) }
      state.updatedAt = Date.now()
      await onCheckpoint?.({ ...state, results: { ...state.results } })
      emit()
      throw e // stop — checkpoint preserved, Resume continues from here
    }
    state.updatedAt = Date.now()
    await onCheckpoint?.({ ...state, results: { ...state.results } })
    emit()
    if (i < pages.length - 1) await sleep(delayMs)
  }

  const allDone = pages.every((_, i) => state.results[String(i)])
  state.done = allDone
  await onCheckpoint?.({ ...state, results: { ...state.results } })

  const questions = mergeChunkResults(state.results)
  if (!questions.length && allDone) throw new Error("Extraction finished but 0 questions found — scanned PDF? Use GEM vision flow.")
  const paper: UniversalPaper = {
    meta: { title: state.fileName.replace(/\.pdf$/i, "") || "AI Extracted Test", durationMinutes: 180, totalQuestions: questions.length, createdAt: new Date().toISOString() },
    sections: [],
    questions,
    source: "ai-agent",
  }
  const issues = validatePaper(paper)
  void issues
  return { paper, progress }
}
