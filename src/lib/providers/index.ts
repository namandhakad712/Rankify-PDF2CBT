import { openAICompatibleChat, type ProviderMessage } from "./types"

// ── GENERIC AI HARNESS ─────────────────────────────────────────────────────
// One engine, infinite providers. No per-provider code files anymore.
// A provider = { name, endpoint, apiKey } — add it at runtime from the UI,
// hit "Fetch models", done. Works with ANY OpenAI-compatible endpoint:
// Groq, Mistral, NVIDIA, OpenRouter, Together, Cerebras, xAI, Vercel AI
// Gateway, Ollama/LM Studio, or whatever launches tomorrow.
//
// Seeded presets ship ready-to-go — paste a key (or set the matching
// server env var and leave the key blank to route via /api/<id>/chat).

export interface ProviderMessage0 extends ProviderMessage {}
export type { ProviderMessage }

export interface ProviderEntry {
  id: string
  name: string
  baseUrl: string
  apiKey: string
  models: string[]
  model?: string // last used / default pick
  docsUrl?: string
}

export interface ChatOpts {
  model: string
  messages: ProviderMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" } | { type: "text" }
}

const LS_KEY = "rpdf2cbt-providers-v1"

/** ids eligible for server-proxy routing (env keys on Vercel) */
const PROXY_IDS = ["groq", "mistral", "nvidia"]

export const SEED_PROVIDERS: ProviderEntry[] = [
  {
    id: "groq",
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    apiKey: "",
    model: "llama-3.3-70b-versatile",
    models: [
      "llama-3.3-70b-versatile",
      "openai/gpt-oss-120b",
      "llama-3.1-8b-instant",
      "openai/gpt-oss-20b",
      "qwen/qwen3-32b",
    ],
    docsUrl: "https://console.groq.com/docs/rate-limits",
  },
  {
    id: "mistral",
    name: "Mistral",
    baseUrl: "https://api.mistral.ai/v1",
    apiKey: "",
    model: "mistral-medium-2508",
    models: ["mistral-medium-2508", "mistral-medium-2505", "ministral-8b-2512", "mistral-small-2603"],
    docsUrl: "https://docs.mistral.ai/getting-started/models",
  },
  {
    id: "nvidia",
    name: "NVIDIA NIM",
    baseUrl: "https://integrate.api.nvidia.com/v1",
    apiKey: "",
    model: "meta/llama-3.3-70b-instruct",
    models: ["meta/llama-3.3-70b-instruct", "meta/llama-3.1-8b-instruct", "deepseek-ai/deepseek-r1"],
    docsUrl: "https://build.nvidia.com/explore",
  },
]

export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "")
  u = u.replace(/\/chat\/completions$/, "")
  return u
}

export function loadProviders(): ProviderEntry[] {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) {
      localStorage.setItem(LS_KEY, JSON.stringify(SEED_PROVIDERS))
      return structuredClone(SEED_PROVIDERS)
    }
    const list = JSON.parse(raw) as ProviderEntry[]
    if (!Array.isArray(list)) throw new Error("bad shape")
    return list.map((p) => ({ ...p, baseUrl: normalizeBaseUrl(p.baseUrl) }))
  } catch {
    return structuredClone(SEED_PROVIDERS)
  }
}

function persist(list: ProviderEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list))
}

export function saveProviders(list: ProviderEntry[]): void {
  persist(list)
}

export function upsertProvider(entry: ProviderEntry): ProviderEntry[] {
  const list = loadProviders()
  const i = list.findIndex((p) => p.id === entry.id)
  if (i >= 0) list[i] = entry
  else list.push(entry)
  persist(list)
  return list
}

export function deleteProvider(id: string): ProviderEntry[] {
  const list = loadProviders().filter((p) => p.id !== id)
  persist(list)
  return list
}

export function getProvider(id: string): ProviderEntry | undefined {
  return loadProviders().find((p) => p.id === id)
}

/** Fetch model list — OpenAI shape {data:[{id}]} or Ollama shape {models:[{name}]} */
export async function fetchModels(baseUrl: string, apiKey?: string): Promise<string[]> {
  const headers: Record<string, string> = {}
  const k = (apiKey || "").trim()
  if (k) headers.Authorization = `Bearer ${k}`
  const r = await fetch(`${normalizeBaseUrl(baseUrl)}/models`, { headers })
  if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
  const j = (await r.json()) as { data?: { id?: string }[]; models?: { name?: string; id?: string }[] }
  const list =
    j.data?.map((x) => x.id).filter(Boolean) ||
    j.models?.map((x) => x.name || x.id).filter(Boolean) ||
    []
  return (list as string[]).sort()
}

/**
 * The ONE chat function. Routing:
 *  - key present            → direct browser call with Bearer key
 *  - key blank + seed id    → /api/<id>/chat proxy (server env var hides the key)
 *  - key blank + custom     → direct call unauthenticated (local Ollama etc.)
 */
export async function chat(entry: ProviderEntry, opts: ChatOpts): Promise<string> {
  const key = (entry.apiKey || "").trim()
  const canProxy = !key && PROXY_IDS.includes(entry.id)
  if (canProxy) {
    const r = await fetch(`/api/${entry.id}/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens,
        response_format: opts.responseFormat ?? { type: "json_object" },
      }),
    })
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 400)}`)
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; content?: string }
    return j.content ?? j.choices?.[0]?.message?.content ?? ""
  }
  return openAICompatibleChat(normalizeBaseUrl(entry.baseUrl), key, {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens,
    response_format: opts.responseFormat ?? { type: "json_object" },
  })
}
