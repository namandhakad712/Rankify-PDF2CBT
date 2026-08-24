import type { ProviderDef, ProviderChatOpts } from "./types"
import { openAICompatibleChat } from "./types"

// NVIDIA NIM — https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1
// Also: https://docs.nvidia.com/nim/large-language-models/latest/reference/api-reference.html
// Hosted: https://integrate.api.nvidia.com/v1/chat/completions — OpenAI-compatible
// Self-hosted NIM: http://localhost:8000/v1/chat/completions — same spec
// Auth: Bearer NVIDIA_API_KEY | Model examples: meta/llama-3.1-8b-instruct, nvidia/llama-3.3-nemotron-super-49b-v1

export const nvidiaProvider: ProviderDef = {
  id: "nvidia",
  label: "NVIDIA",
  baseUrl: "https://integrate.api.nvidia.com/v1",
  defaultModel: "meta/llama-3.3-70b-instruct",
  models: [
    "meta/llama-3.3-70b-instruct",
    "meta/llama-3.1-8b-instruct",
    "nvidia/llama-3.3-nemotron-super-49b-v1",
    "deepseek-ai/deepseek-r1",
  ],
  docsUrl: "https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1",
  async chat(opts: ProviderChatOpts): Promise<string> {
    const viaProxy = opts.viaProxy ?? true
    const url = viaProxy ? "/api/nvidia/chat" : "https://integrate.api.nvidia.com/v1/chat/completions"
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
          response_format: opts.responseFormat as unknown as Record<string, unknown> | undefined, // NVIDIA supports text only on some models — fallback to text
        }),
      })
      if (!r.ok) throw new Error(`${r.status} ${await r.text()}`)
      const j = (await r.json()) as { choices: { message: { content: string } }[] }
      return j.choices?.[0]?.message?.content ?? ""
    }
    return openAICompatibleChat("https://integrate.api.nvidia.com/v1", opts.apiKey, {
      model: opts.model,
      messages: opts.messages,
      temperature: opts.temperature ?? 0.2,
      max_tokens: opts.maxTokens,
      // NVIDIA hosted: response_format json_object not always supported — omit to use text + prompt
    })
  },
}
