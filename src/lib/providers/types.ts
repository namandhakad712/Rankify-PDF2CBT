// Universal provider contract — add/delete a file in this folder = add/delete a provider
// All 3 providers (Mistral, Groq, NVIDIA) are OpenAI-compatible POST /v1/chat/completions
// Docs: Mistral https://docs.mistral.ai/api/endpoint/chat | Groq https://console.groq.com/docs/api-reference | NVIDIA https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1

export interface ProviderMessage {
  role: "system" | "user" | "assistant"
  content: string
}

export interface ProviderChatOpts {
  apiKey: string
  model: string
  messages: ProviderMessage[]
  temperature?: number
  maxTokens?: number
  // JSON mode via response_format — all 3 support it 2026
  responseFormat?: { type: "json_object" } | { type: "json_schema"; json_schema: { name: string; schema: unknown } } | { type: "text" }
  // for proxies via /api/<provider>/chat — if true, use server proxy instead of direct
  viaProxy?: boolean
}

export interface ProviderDef {
  id: string // "mistral" | "groq" | "nvidia" — add new by adding file
  label: string
  // For direct browser call (hidden key risk) vs viaProxy server — we default viaProxy true
  baseUrl: string // e.g. https://api.mistral.ai/v1
  defaultModel: string
  models: string[] // for dropdown; can also fetch GET /v1/models
  docsUrl: string
  // Core — must return assistant content string (JSON if json mode)
  chat: (opts: ProviderChatOpts) => Promise<string>
  // Optional — list models from API
  listModels?: (apiKey: string) => Promise<string[]>
}

export function openAICompatibleChat(baseUrl: string, apiKey: string, body: Record<string, unknown>): Promise<string> {
  // Generic fetch for OpenAI-compatible endpoint
  return fetch(`${baseUrl}/chat/completions`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(body),
  }).then(async (r) => {
    if (!r.ok) {
      const t = await r.text()
      throw new Error(`${r.status} ${t.slice(0, 500)}`)
    }
    const j = (await r.json()) as { choices: { message: { content: string } }[] }
    return j.choices?.[0]?.message?.content ?? ""
  })
}
