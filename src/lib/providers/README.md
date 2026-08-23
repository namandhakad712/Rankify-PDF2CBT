# Providers — Modular

Add/delete a provider = one file + one line in `index.ts`.

- **Mistral** `mistral.ts` — `https://api.mistral.ai/v1` — `mistral-large-latest` — docs https://docs.mistral.ai/api/endpoint/chat
- **Groq** `groq.ts` — `https://api.groq.com/openai/v1` — `llama-3.3-70b-versatile` — docs https://console.groq.com/docs/api-reference
- **NVIDIA** `nvidia.ts` — `https://integrate.api.nvidia.com/v1` — `meta/llama-3.1-8b-instruct` — docs https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1

All are OpenAI-compatible `POST /v1/chat/completions` with `response_format: {type:"json_object"}` for UniversalPaper JSON.

**To add:** copy `mistral.ts` → `cerebras.ts`, change `baseUrl`, `defaultModel`, `docsUrl`, export, then in `index.ts` add `import { cerebrasProvider } from "./cerebras"` + add to `providers` array.

**To delete:** remove file + remove one line from `providers` array — no other changes.

**Direct vs Proxy:** `chat({viaProxy:true})` calls `/api/<id>/chat` (Vercel function hides key). `viaProxy:false` calls direct `https://.../v1/chat/completions` (key visible in DevTools — only for local dev). Default `true` — create `api/<id>/chat.ts` for production.

**Fallback usage (small PDFs <10 Q):** `Extract.vue` → `provider.chat({apiKey, model, messages:[{role:"user", content: prompt + pdfText}], responseFormat:{type:"json_object"}})` → `parsePastedJSON(result)`.
