import { openAICompatibleChat, type ProviderMessage } from "./types"
import YAML from "yaml"
import providersYaml from "@/config/providers.yaml?raw"

// ── GENERIC AI HARNESS ─────────────────────────────────────────────────────
// Two sources of providers:
//   1. PRECONFIGURED — src/config/providers.yaml (edit on GitHub, ships to all)
//   2. LOCAL — user-added in browser, localStorage only, their session only
//
// Secret keys NEVER live in the client for presets: requests route through
// /api/agent/chat which reads process.env[envKey] (Vercel env vars).

export type { ProviderMessage }

export interface ProviderEntry {
  id: string
  name: string
  priority?: number // provider-level — 1 = default, then fallback order
  baseUrl: string
  response?: "openai-completions" | "openai-responses" | string
  apiKey?: string // local providers only; presets use envKey via proxy
  envKey?: string // presets: Vercel env var name
  contextWindow?: number // FALLBACK context window (tokens) when a model has no override
  maxTokens?: number // FALLBACK max output tokens when a model has no override
  models: string[]
  modelParams?: Record<string, { contextWindow?: number; maxTokens?: number }> // per-model overrides
  model?: string
  docsUrl?: string
  isPreset?: boolean
}

/** Effective per-model limits — model override > provider fallback > sane default */
export function limitsFor(entry: ProviderEntry, modelId: string): { contextWindow: number; maxTokens: number } {
  const mp = entry.modelParams?.[modelId]
  return {
    contextWindow: mp?.contextWindow ?? entry.contextWindow ?? 131072,
    maxTokens: mp?.maxTokens ?? entry.maxTokens ?? 6000,
  }
}

export interface ChatOpts {
  model: string
  messages: ProviderMessage[]
  temperature?: number
  maxTokens?: number
  responseFormat?: { type: "json_object" } | { type: "text" }
}

const LS_KEY = "rpdf2cbt-custom-providers-v2"

interface YamlFile {
  version: number
  providers: {
    id: string; name: string; endpoint: string; response?: string; priority?: number
    envKey?: string; docsUrl?: string; contextWindow?: number; maxTokens?: number
    models?: (string | { id: string; contextWindow?: number; maxTokens?: number })[]
  }[]
}

function parsePresets(): ProviderEntry[] {
  try {
    const f = YAML.parse(providersYaml) as YamlFile
    const out = (f.providers || []).map((p) => {
      const models: string[] = []
      const modelParams: Record<string, { contextWindow?: number; maxTokens?: number }> = {}
      for (const m of p.models || []) {
        if (typeof m === "string") { models.push(m); continue }
        if (m && m.id) {
          models.push(m.id)
          if (m.contextWindow != null || m.maxTokens != null) modelParams[m.id] = { contextWindow: m.contextWindow, maxTokens: m.maxTokens }
        }
      }
      return {
        id: p.id,
        name: p.name,
        priority: p.priority ?? 999, // explicit provider priority — 1 = default
        baseUrl: p.endpoint.replace(/\/+$/, ""),
        response: p.response || "openai-completions",
        envKey: p.envKey || "",
        docsUrl: p.docsUrl,
        contextWindow: p.contextWindow,
        maxTokens: p.maxTokens,
        models, // top-to-bottom = default → fallbacks within provider
        modelParams: Object.keys(modelParams).length ? modelParams : undefined,
        model: models[0] || "",
        isPreset: true,
      }
    })
    out.sort((a, b) => (a.priority ?? 999) - (b.priority ?? 999))
    return out
  } catch {
    return []
  }
}

export const PRESET_PROVIDERS: ProviderEntry[] = parsePresets()

export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "")
  u = u.replace(/\/chat\/completions$/, "")
  return u
}

export function loadProviders(): ProviderEntry[] {
  let local: ProviderEntry[] = []
  try {
    local = JSON.parse(localStorage.getItem(LS_KEY) || "[]") as ProviderEntry[]
    if (!Array.isArray(local)) local = []
  } catch { local = [] }
  return [...PRESET_PROVIDERS, ...local]
}

function persistLocal(list: ProviderEntry[]): void {
  localStorage.setItem(LS_KEY, JSON.stringify(list.filter((p) => !p.isPreset)))
}

export function upsertProvider(entry: ProviderEntry): void {
  if (entry.isPreset) return // presets are read-only, controlled by YAML
  const list = loadProviders().filter((p) => !p.isPreset)
  const i = list.findIndex((p) => p.id === entry.id)
  if (i >= 0) list[i] = entry
  else list.push(entry)
  persistLocal(list)
}

export function deleteProvider(id: string): void {
  persistLocal(loadProviders().filter((p) => !p.isPreset && p.id !== id))
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

/** Which preset env keys exist server-side (true/false map; values never exposed) */
export async function fetchEnvStatus(): Promise<Record<string, boolean>> {
  try {
    const r = await fetch("/api/agent/status")
    if (!r.ok) return {}
    const j = (await r.json()) as { envKeys?: Record<string, boolean> }
    return j.envKeys || {}
  } catch {
    return {}
  }
}

const HEALTH_CACHE_KEY = "rpdf2cbt-health-cache"
const HEALTH_TTL = 24 * 60 * 60 * 1000 // once a day, as you said
/** Real health — cached 24h, with retries: fail → retry 2× (2s, 5s), then mark not working, re-check after 10m in background */
export async function fetchHealthStatus(force = false): Promise<Record<string, { ok: boolean; hasKey: boolean; error?: string }>> {
  try {
    if (!force) {
      const raw = localStorage.getItem(HEALTH_CACHE_KEY)
      if (raw) {
        const c = JSON.parse(raw) as { ts: number; data: Record<string, { ok: boolean; hasKey: boolean; error?: string }> }
        if (c?.ts && Date.now() - c.ts < HEALTH_TTL && c.data) {
          // background refresh if stale >12h and some provider is not ok
          if (Date.now() - c.ts > 12 * 60 * 60 * 1000) {
            const hasFail = Object.values(c.data).some(v => v.hasKey && !v.ok)
            if (hasFail) setTimeout(() => { void fetchHealthStatus(true) }, 10_000)
          }
          return c.data
        }
      }
    }
  } catch {}
  // fetch with retries (fail → retry after 2s, 5s, then mark not working)
  for (let attempt = 1; attempt <= 3; attempt++) {
    try {
      const r = await fetch("/api/agent/health")
      if (!r.ok) throw new Error(String(r.status))
      const j = (await r.json()) as { health?: Record<string, { ok: boolean; hasKey: boolean; error?: string }> }
      const data = j.health || {}
      try { localStorage.setItem(HEALTH_CACHE_KEY, JSON.stringify({ ts: Date.now(), data })) } catch {}
      // if some provider failed but we have retries left, wait a bit and re-check (maybe transient 429)
      const hasFail = Object.values(data).some(v => v.hasKey && !v.ok && !/429|rate/i.test(v.error || ""))
      if (hasFail && attempt < 3) {
        await new Promise(res => setTimeout(res, attempt === 1 ? 2000 : 5000))
        continue
      }
      return data
    } catch {
      if (attempt < 3) await new Promise(res => setTimeout(res, attempt === 1 ? 2000 : 5000))
    }
  }
  try {
    const raw = localStorage.getItem(HEALTH_CACHE_KEY)
    if (raw) {
      const c = JSON.parse(raw) as { ts: number; data: Record<string, { ok: boolean; hasKey: boolean; error?: string }> }
      if (c?.data) return c.data
    }
  } catch {}
  return {}
}

/**
 * The ONE chat function.
 *  - preset + no client key → /api/agent/chat proxy (server reads envKey secret)
 *  - everything else        → direct call with the key the user saved locally
 */
export async function chat(entry: ProviderEntry, opts: ChatOpts): Promise<string> {
  const key = (entry.apiKey || "").trim()
  const lim = limitsFor(entry, opts.model)
  const body = {
    model: opts.model,
    messages: opts.messages,
    temperature: opts.temperature ?? 0.2,
    max_tokens: opts.maxTokens ?? lim.maxTokens,
    response_format: opts.responseFormat ?? { type: "json_object" },
  }
  if (entry.isPreset && !key) {
    const r = await fetch("/api/agent/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ endpoint: entry.baseUrl, response: entry.response, envKey: entry.envKey, ...body }),
    })
    if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 400)}`)
    const j = (await r.json()) as { choices?: { message?: { content?: string } }[]; content?: string; output_text?: string }
    return j.content ?? j.output_text ?? j.choices?.[0]?.message?.content ?? ""
  }
  return openAICompatibleChat(normalizeBaseUrl(entry.baseUrl), key, body)
}
