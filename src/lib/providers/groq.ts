import type { ProviderDef, ProviderChatOpts } from "./types"
import { openAICompatibleChat } from "./types"

// Groq — https://console.groq.com/docs/api-reference | https://console.groq.com/docs/text-chat
// OpenAI-compatible base: https://api.groq.com/openai/v1
// POST https://api.groq.com/openai/v1/chat/completions — fast inference
// SDK: groq-sdk but we use fetch to stay light; GROQ_API_KEY
// Structured outputs: response_format json_schema on supported models (llama-3.3-70b-versatile supports json_object)

export const groqProvider: ProviderDef = {
  id: "groq",
  label: "Groq",
  baseUrl: "https://api.groq.com/openai/v1",
  defaultModel: "llama-3.3-70b-versatile",
  models: [
    "llama-3.3-70b-versatile",
    "openai/gpt-oss-120b",
    "llama-3.1-8b-instant",
    "openai/gpt-oss-20b",
    "qwen/qwen3-32b",
  ],
  docsUrl: "https://console.groq.com/docs/api-reference",
  async chat(opts: ProviderChatOpts): Promise<string> {
    const viaProxy = opts.viaProxy ?? true
    const url = viaProxy ? "/api/groq/chat" : "https://api.groq.com/openai/v1/chat/completions"
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
      const j = (await r.json()) as { choices: { message: { content: string } }[] }
      return j.choices?.[0]?.message?.content ?? ""
    }
    return openAICompatibleChat("https://api.groq.com/openai/v1", opts.apiKey, {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens,
      response_format: opts.responseFormat ?? { type: "json_object" },
    })
  },
}
