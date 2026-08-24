import type { ProviderDef } from "./types"
import { openAICompatibleChat } from "./types"

// GENERIC HARNESS — any OpenAI-compatible provider without writing a new file.
// Base URL + API key → GET /models → chat/completions. New free provider = paste URL, done.
// Works with: OpenRouter, Groq, Mistral, Together, Fireworks, DeepInfra, Cerebras,
// xAI, Vercel AI Gateway, Ollama/LM Studio (local), any /v1 clone.

export interface CustomProviderConfig {
  baseUrl: string
  apiKey: string
  model: string
}

const LS_KEY = "rpdf2cbt-custom-provider"

export function normalizeBaseUrl(raw: string): string {
  let u = raw.trim().replace(/\/+$/, "")
  u = u.replace(/\/chat\/completions$/, "") // user pasted full endpoint
  return u
}

export function loadCustomConfig(): CustomProviderConfig | null {
  try {
    const raw = localStorage.getItem(LS_KEY)
    if (!raw) return null
    const cfg = JSON.parse(raw) as CustomProviderConfig
    if (!cfg?.baseUrl) return null
    return { baseUrl: normalizeBaseUrl(cfg.baseUrl), apiKey: cfg.apiKey || "", model: cfg.model || "" }
  } catch {
    return null
  }
}

export function saveCustomConfig(cfg: CustomProviderConfig): void {
  localStorage.setItem(LS_KEY, JSON.stringify({ ...cfg, baseUrl: normalizeBaseUrl(cfg.baseUrl) }))
}

export function clearCustomConfig(): void {
  localStorage.removeItem(LS_KEY)
}

export function createCustomProvider(cfg: CustomProviderConfig): ProviderDef {
  const baseUrl = normalizeBaseUrl(cfg.baseUrl)
  const key = cfg.apiKey.trim()
  return {
    id: "custom",
    label: "Custom",
    baseUrl,
    defaultModel: cfg.model || "",
    models: cfg.model ? [cfg.model] : [],
    docsUrl: "https://openrouter.ai/docs",
    async chat(opts) {
      // Direct browser call — arbitrary base URLs can't use our fixed proxies.
      // Most providers (OpenRouter/Groq/Mistral/local) allow CORS; key stays client-side like builtins.
      return openAICompatibleChat(baseUrl, opts.apiKey || key, {
        model: opts.model,
        messages: opts.messages,
        temperature: opts.temperature ?? 0.2,
        max_tokens: opts.maxTokens,
        response_format: opts.responseFormat ?? { type: "json_object" },
      })
    },
    async listModels(apiKey?: string): Promise<string[]> {
      const headers: Record<string, string> = {}
      const k = apiKey || key
      if (k) headers.Authorization = `Bearer ${k}`
      const r = await fetch(`${baseUrl}/models`, { headers })
      if (!r.ok) throw new Error(`${r.status} ${(await r.text()).slice(0, 200)}`)
      const j = (await r.json()) as { data?: { id?: string }[] } | { models?: { name?: string; id?: string }[] }
      // OpenAI style {data:[{id}]} | Ollama style {models:[{name}]}
      const list =
        ("data" in j && j.data?.map((x) => x.id).filter(Boolean)) ||
        ("models" in j && j.models?.map((x) => x.name || x.id).filter(Boolean)) ||
        []
      return (list as string[]).sort()
    },
  } as ProviderDef & { listModels: (apiKey?: string) => Promise<string[]> }
}

// Quick-fill presets for the UI
export const CUSTOM_PRESETS: { label: string; baseUrl: string; hint: string }[] = [
  { label: "OpenRouter", baseUrl: "https://openrouter.ai/api/v1", hint: "100s of models incl :free" },
  { label: "Groq", baseUrl: "https://api.groq.com/openai/v1", hint: "fastest free tier" },
  { label: "Vercel AI Gateway", baseUrl: "https://ai-gateway.vercel.sh/v1", hint: "200+ models, BYOK" },
  { label: "Ollama (local)", baseUrl: "http://localhost:11434/v1", hint: "no key needed" },
  { label: "LM Studio (local)", baseUrl: "http://localhost:1234/v1", hint: "no key needed" },
]
