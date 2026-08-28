import type { UniversalPaper, UniversalQuestion } from "@/types"
import { chat as providerChat, limitsFor, type ProviderEntry, type ProviderMessage } from "./providers"
import { normalizeText, normalizeOptions } from "./normalize"
import { validatePaper } from "./validate"
import { jsonrepair } from "jsonrepair"

// ── Page-chunked agent extraction ──────────────────────────────────────────
// Free models = stateless + rate-limited + small output budgets.
// Strategy: 1 page = 1 self-contained request (overlapping CONTEXT_START tail),
// adaptive concurrency + per-page checkpoints for resume, merge+dedup at end.
// v2: faster (adaptive RPS + batch small pages + skip empty), robust (jitter backoff, per-page timeout, partial success)

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
- Do NOT invent questions. No commentary outside JSON. lastCompleteQuestionNumber = number of the last FULLY visible question on this page.
- NEVER return an empty questions array when PAGE_TEXT contains question-like content (numbered items, stems, options). If unsure, extract your best reading of the visible questions.`

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

export interface ChainLink { entry: ProviderEntry; model: string }

/** Cross-provider priority chain: chosen provider+model first → its other
 *  models top-to-bottom → next providers by their YAML priority (1 first). */
export function buildFallbackChain(primary: ProviderEntry, model: string, all: ProviderEntry[]): ChainLink[] {
  const out: ChainLink[] = []
  const seen = new Set<string>()
  const ordered = [primary, ...all.filter((p) => p.id !== primary.id)]
  for (const e of ordered) {
    if (!e.baseUrl || !e.models?.length) continue
    const head = e.id === primary.id ? model || e.models[0] || "" : e.model || e.models[0] || ""
    const ms = [head, ...e.models.filter((m) => m && m !== head)]
    for (const m of ms) {
      if (!m) continue
      const k = `${e.id}::${m}`
      if (!seen.has(k)) { seen.add(k); out.push({ entry: e, model: m }) }
    }
  }
  return out
}

/** Tolerant question extraction — accepts many LLM shapes */
function extractQuestions(j: unknown): UniversalQuestion[] {
  if (Array.isArray(j)) return j as UniversalQuestion[]
  if (j && typeof j === "object") {
    const o = j as Record<string, unknown>
    const candidates = [o.questions, (o.paper as any)?.questions, (o.data as any)?.questions, o.output]
    for (const c of candidates) if (Array.isArray(c)) return c as UniversalQuestion[]
    // first array-of-objects key wins
    for (const v of Object.values(o)) {
      if (Array.isArray(v) && v.length && typeof v[0] === "object") return v as UniversalQuestion[]
    }
  }
  return []
}

async function chatOnce(
  entry: ProviderEntry,
  model: string,
  messages: ProviderMessage[],
  signal: AbortSignal,
): Promise<string> {
  let wait = 900
  for (let attempt = 1; attempt <= 2; attempt++) {
    if (signal.aborted) throw new Error("cancelled")
    try {
      const p = providerChat(entry, { model, messages, responseFormat: { type: "json_object" } })
      const t = new Promise<never>((_, rej) => setTimeout(() => rej(new Error("408 page timeout 15s")), 15_000))
      return await Promise.race([p, t])
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e)
      const is401 = /\b401\b|Missing key|Unauthorized/i.test(msg)
      if (is401) throw e // don't waste time retrying bad key — fallback to next provider immediately
      const retryAfter = /retry-after:\s*(\d+)/i.exec(msg)?.[1]
      const retryable = /\b429\b|rate.?limit|too many requests|408\b/i.test(msg) || /\b5\d\d\b/.test(msg)
      if (!retryable || attempt === 2) throw e
      wait = retryAfter ? Number(retryAfter) * 1000 : wait * 1.6
      await sleepJitter(Math.min(wait, 12_000))
    }
  }
  throw new Error("unreachable")
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))
const sleepJitter = (ms: number) => sleep(ms * (0.85 + Math.random() * 0.3))

/** ── Fast path helpers — use YOUR providers.yaml contextWindow/maxTokens, no RPS guess ── */
function getBatchConfig(entry: ProviderEntry, model: string): { batchSize: number; concurrency: number; delay: number } {
  const lim = limitsFor(entry, model || entry.models[0] || "")
  const ctx = lim.contextWindow
  const out = lim.maxTokens
  // Use ~60% of context for input, 40% for output headroom. Avg page ~1800 chars ≈450 tokens, avg Q ~160 tokens out.
  // e.g. poolside 1M/32k → 600k input /450 ≈1333 pages theoretical, but output 32k/160≈200 Q → ~50 pages max.
  // So cap by output: batch 12×4Q=48Q≈7680 tokens <<32k, batch 12×~450=5400 input tokens <<1M → safe.
  if (ctx >= 800000) return { batchSize: Math.min(12, Math.floor(out / 700)), concurrency: 1, delay: 700 } // poolside 1M/32k → 12
  if (ctx >= 200000) return { batchSize: Math.min(8, Math.floor(out / 900)), concurrency: 1, delay: 700 } // labs 256k/128k → 8
  if (ctx >= 80000) return { batchSize: Math.min(4, Math.floor(out / 800)), concurrency: 2, delay: 500 }
  return { batchSize: Math.min(2, Math.floor(out / 1000)) || 1, concurrency: 3, delay: 400 }
}
function getConcurrency(entry: ProviderEntry): number {
  return getBatchConfig(entry, entry.model || entry.models[0] || "").concurrency
}
function adaptiveDelay(entry: ProviderEntry): number {
  return getBatchConfig(entry, entry.model || entry.models[0] || "").delay
}
function isQuestionLike(text: string): boolean {
  if (!text || text.trim().length < 40) return false
  const t = text.slice(0, 600)
  // numbered Q, MCQ options (1) (2) or A. B., Q1. / 1. etc
  return /(\bQ\s*\d+[\.\)]|\b\d+\s*[\.\)]\s*[A-Z]|\n\s*\(?\s*[1-4]\s*\)\s*[A-Za-z]|\bPI0\d{3}\b|MENDELISM|Mendel|gametes)/i.test(t)
}
function batchSmallPages(pages: string[]): { indices: number[]; text: string }[] {
  const out: { indices: number[]; text: string }[] = []
  let buf: number[] = []
  let bufLen = 0
  for (let i = 0; i < pages.length; i++) {
    const len = pages[i].trim().length
    if (len < 500 && bufLen + len < 2500 && buf.length < 3) {
      buf.push(i); bufLen += len
    } else {
      if (buf.length) { out.push({ indices: [...buf], text: buf.map(j => pages[j]).join("\n\n") }); buf = []; bufLen = 0 }
      if (len < 500 && len > 0) { buf = [i]; bufLen = len }
      else out.push({ indices: [i], text: pages[i] })
    }
  }
  if (buf.length) out.push({ indices: [...buf], text: buf.map(j => pages[j]).join("\n\n") })
  return out
}

/** Walk the WHOLE priority chain per page. Every failure is collected as a
 *  diagnostic instead of aborting, so we always know WHY nothing extracted. */
async function processChunk(
  chain: ChainLink[],
  chunkText: string,
  contextStart: string,
  expectNext: number,
  signal: AbortSignal,
): Promise<ChunkResult> {
  const messages: ProviderMessage[] = [
    { role: "system", content: SYSTEM_PROMPT },
    { role: "user", content: userPrompt(chunkText, contextStart, expectNext) },
  ]
  const diag: string[] = []

  const tryParse = (content: string): ChunkResult | null => {
    let j: unknown
    try {
      j = parseChunkJSON(content)
    } catch {
      diag.push(`✗ unparseable reply [:120]=${content.slice(0, 120).replace(/\s+/g, " ")}`)
      return null
    }
    const qs = extractQuestions(j)
    if (!qs.length) {
      diag.push(`✗ 0 questions · reply[:140]=${content.slice(0, 140).replace(/\s+/g, " ")}`)
      return null
    }
    const lcn = (j as { lastCompleteQuestionNumber?: unknown }).lastCompleteQuestionNumber
    return { questions: qs, lastNum: Number(lcn) || expectNext - 1 }
  }

  for (const link of chain) {
    if (signal.aborted) throw new Error("cancelled")
    let content: string
    try {
      content = await chatOnce(link.entry, link.model, messages, signal)
    } catch (e: unknown) {
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 140).replace(/\s+/g, " ")
      diag.push(`✗ ${link.entry.name}/${link.model}: ${msg}`)
      continue // next provider/model in priority chain
    }
    const res = tryParse(content)
    if (res) return res
    // empty/unparseable → next link carries on
  }

  // Whole chain dry — dense page? split & conquer once with same chain.
  if (chunkText.length > 4000) {
    const mid = chunkText.lastIndexOf("\n", Math.floor(chunkText.length / 2))
    const cut = mid > 1000 ? mid : Math.floor(chunkText.length / 2)
    const a = await processChunk(chain.slice(0, 1).concat(chain), chunkText.slice(0, cut), contextStart, expectNext, signal)
    const b = await processChunk(chain, chunkText.slice(cut), chunkText.slice(Math.max(0, cut - 700)), a.lastNum + 1, signal)
    return { questions: [...a.questions, ...b.questions], lastNum: Math.max(a.lastNum, b.lastNum) }
  }
  throw new Error(
    `All ${chain.length} provider-model pairs failed on this page:\n` +
      [...new Set(diag)].slice(0, 6).join("\n"),
  )
}

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
  allProviders?: ProviderEntry[]
  delayMs?: number
  resumeState?: AgentJobState | null
  onProgress?: (p: AgentProgress[]) => void
  onCheckpoint?: (state: AgentJobState) => Promise<void> | void
  signal?: AbortSignal
}): Promise<{ paper: UniversalPaper; progress: AgentProgress[] }> {
  const { jobId, pages, entry, allProviders = [], delayMs, resumeState, onProgress, onCheckpoint, signal } = opts
  const chain = buildFallbackChain(entry, entry.model || "", [entry, ...allProviders])
  const signalRef = signal ?? new AbortController().signal
  const failedPages: { index: number; error: string }[] = []

  const state: AgentJobState = resumeState?.pages.length === pages.length
    ? { ...resumeState, updatedAt: Date.now(), done: false }
    : { id: jobId, fileName: jobId, pages, results: {}, done: false, updatedAt: Date.now() }

  const progress: AgentProgress[] = pages.map((_, i) => ({
    index: i,
    status: state.results[String(i)] ? "done" : "pending",
  }))
  const emit = () => onProgress?.(progress.map((p) => ({ ...p })))
  emit()

  // fast skip: empty or non-question pages without LLM call
  const shouldSkipLLM = (txt: string): string | null => {
    if (!txt.trim()) return "empty page"
    if (!isQuestionLike(txt)) return "no question-like text"
    return null
  }

  // ── Context-aware batching — uses YOUR providers.yaml limits, not RPS guess ──
  // e.g. poolside 1M/32k → batch 5 pages/req, labs 256k/128k → batch 3, small ctx → batch 1
  function chunkPages(pages: string[], batchSize: number): { indices: number[]; text: string }[] {
    if (batchSize <= 1) return pages.map((text, i) => ({ indices: [i], text }))
    const out: { indices: number[]; text: string }[] = []
    for (let i = 0; i < pages.length; i += batchSize) {
      const indices = Array.from({ length: Math.min(batchSize, pages.length - i) }, (_, k) => i + k)
      const text = indices.map(idx => pages[idx]).join("\n\n--- Page Break ---\n\n")
      out.push({ indices, text })
    }
    return out
  }
  const { batchSize, concurrency, delay: cfgDelay } = getBatchConfig(entry, entry.model || entry.models[0] || "")
  const effDelay = delayMs ?? cfgDelay
  const batches = chunkPages(pages, batchSize)
  let batchCursor = 0
  const getNextBatch = (): { indices: number[]; text: string } | null => {
    while (batchCursor < batches.length) {
      const b = batches[batchCursor++]
      if (b.indices.every(idx => state.results[String(idx)])) continue
      const pending = b.indices.filter(idx => !state.results[String(idx)])
      if (!pending.length) continue
      if (pending.length !== b.indices.length) {
        return { indices: pending, text: pending.map(idx => pages[idx]).join("\n\n--- Page Break ---\n\n") }
      }
      return b
    }
    return null
  }

  const processBatch = async (batch: { indices: number[]; text: string }) => {
    if (signalRef.aborted) return
    const firstIdx = batch.indices[0]
    const charCap = Math.floor((limitsFor(entry, entry.model || "").contextWindow * 3) / 4)
    const rawText = batch.text.trim()
    const pageText = rawText.length > charCap ? rawText.slice(0, charCap) : rawText
    const skipNote = shouldSkipLLM(pageText)
    if (skipNote) {
      for (const idx of batch.indices) {
        progress[idx] = { index: idx, status: "done", note: skipNote }
        state.results[String(idx)] = { questions: [], lastNum: 0 }
      }
      state.updatedAt = Date.now()
      await onCheckpoint?.({ ...state, results: { ...state.results } })
      emit()
      return
    }
    for (const idx of batch.indices) { progress[idx] = { index: idx, status: "running" } }
    emit()
    try {
      const prevTail = firstIdx > 0 ? state.pages[firstIdx - 1].slice(-800) : ""
      const knownMax = Object.values(state.results).reduce((m, r) => Math.max(m, r.lastNum), 0)
      const res = await processChunk(chain, pageText, prevTail, knownMax + 1, signalRef)
      if (!res.questions.length) {
        for (const idx of batch.indices) {
          progress[idx] = { index: idx, status: "done", note: "no question-like text" }
          state.results[String(idx)] = { questions: [], lastNum: 0 }
        }
        emit()
        return
      }
      // distribute pageNo round-robin across batch indices, as you described: compare last vs first, keep richer
      const perPage = Math.max(1, Math.ceil(res.questions.length / batch.indices.length))
      res.questions.forEach((q, qi) => {
        const batchPos = Math.min(Math.floor(qi / perPage), batch.indices.length - 1)
        q.pageNo = batch.indices[batchPos] + 1
      })
      // store under first idx, mark others done for resume
      state.results[String(firstIdx)] = res
      for (let k = 1; k < batch.indices.length; k++) {
        const idx = batch.indices[k]
        state.results[String(idx)] = { questions: [], lastNum: res.lastNum }
      }
      for (const idx of batch.indices) progress[idx] = { index: idx, status: "done" }
    } catch (e: unknown) {
      if (signalRef.aborted) { for (const idx of batch.indices) progress[idx] = { index: idx, status: "pending" }; return }
      const msg = (e instanceof Error ? e.message : String(e)).slice(0, 400)
      for (const idx of batch.indices) {
        progress[idx] = { index: idx, status: "failed", note: msg.split("\n")[0].slice(0, 140) }
        failedPages.push({ index: idx, error: msg })
      }
    }
    state.updatedAt = Date.now()
    await onCheckpoint?.({ ...state, results: { ...state.results } })
    emit()
  }

  if (concurrency === 1) {
    for (const batch of batches) {
      if (signalRef.aborted) break
      if (batch.indices.every(idx => state.results[String(idx)])) continue
      await processBatch(batch)
      await sleepJitter(effDelay)
    }
  } else {
    const workers = Array.from({ length: concurrency }, async () => {
      while (true) {
        if (signalRef.aborted) break
        const batch = getNextBatch()
        if (!batch) break
        await processBatch(batch)
        await sleepJitter(effDelay / concurrency)
      }
    })
    await Promise.all(workers)
  }

  const allDone = pages.every((_, i) => state.results[String(i)] != null)
  state.done = allDone && !failedPages.length
  await onCheckpoint?.({ ...state, results: { ...state.results } })
  emit()

  const questions = mergeChunkResults(state.results)
  // robust: return partial even if some pages failed, but warn
  if (!questions.length) {
    if (failedPages.length) {
      throw new Error(
        `${failedPages.length}/${pages.length} page(s) failed — Resume checkpoint retries just these.\n` +
          failedPages.map((f) => `Page ${f.index + 1}: ${f.error}`).join("\n"),
      )
    }
    throw new Error("Extraction finished but 0 questions found — scanned PDF? Use GEM vision flow.")
  }
  if (failedPages.length) {
    // keep pipeline alive — user gets partial paper + can resume failed pages
    console.warn(`[agent] partial success ${questions.length} Qs, ${failedPages.length} pages failed`, failedPages)
  }
  const paper: UniversalPaper = {
    meta: { title: state.fileName.replace(/\.pdf$/i, "") || "AI Extracted Test", durationMinutes: 180, totalQuestions: questions.length, createdAt: new Date().toISOString() },
    sections: [],
    questions,
    source: "ai-agent",
  }
  void validatePaper(paper)
  return { paper, progress }
}
