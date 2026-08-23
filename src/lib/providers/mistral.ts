import type { ProviderDef, ProviderChatOpts } from "./types"
import { openAICompatibleChat } from "./types"

// Mistral — https://docs.mistral.ai/api/endpoint/chat
// POST https://api.mistral.ai/v1/chat/completions
// Auth: Bearer MISTRAL_API_KEY | Model: mistral-large-latest (flagship 2026)
// Supports response_format: {type:"json_object"} and {type:"json_schema"} — use for UniversalPaper JSON

export const mistralProvider: ProviderDef = {
  id: "mistral",
  label: "Mistral",
  baseUrl: "https://api.mistral.ai/v1",
  defaultModel: "mistral-large-latest",
  models: [
    "mistral-large-latest",
    "mistral-small-latest",
    "mistral-nemo",
    "open-mistral-nemo",
    "open-mixtral-8x22b",
  ],
  docsUrl: "https://docs.mistral.ai/api/endpoint/chat",
  async chat(opts: ProviderChatOpts): Promise<string> {
    const viaProxy = opts.viaProxy ?? true
    const url = viaProxy ? "/api/mistral/chat" : "https://api.mistral.ai/v1/chat/completions"
    if (viaProxy) {
      const headers: Record<string, string> = { "Content-Type": "application/json" }
      if (opts.apiKey) headers.Authorization = `Bearer ${opts.apiKey}`
      const r = await fetch(url, {
        method: "POST",
        headers,
        body: JSON.stringify({
          model: opts.model,
          messages: opts.messages,
          temperature: opts.temperature ?? 0.2,
          max_tokens: opts.maxTokens,
          response_format: opts.responseFormat ?? { type: "json_object" },
        }),
      })
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
      const j = (await r.json()) as { choices: { message: { content: string } }[] } & { content?: string }
      // proxy may return {choices} or direct
      return (j as { content?: string }).content ?? j.choices?.[0]?.message?.content ?? ""
    }
    return openAICompatibleChat("https://api.mistral.ai/v1", opts.apiKey, {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens,
      response_format: opts.responseFormat ?? { type: "json_object" },
    })
  },
  async listModels(apiKey: string): Promise<string[]> {
    // GET https://api.mistral.ai/v1/models
    const r = await fetch("https://api.mistral.ai/v1/models", { headers: { Authorization: `Bearer ${apiKey}` } })
    if (!r.ok) return []
    const j = (await r.json()) as { data: { id: string }[] }
    return j.data?.map((x) => x.id) ?? []
  },
}
