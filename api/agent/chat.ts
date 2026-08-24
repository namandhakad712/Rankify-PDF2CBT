// Vercel Serverless — generic secure proxy for preconfigured providers
// POST /api/agent/chat  body: {endpoint, response, envKey, model, messages, temperature, max_tokens, response_format}
//
// Uses the OFFICIAL OpenAI SDK for both wire formats:
//   - "openai-completions" → client.chat.completions.create()
//   - "openai-responses"   → client.responses.create()   (Responses API)
// The SDK is pointed at the provider's base URL — every OpenAI-compatible
// provider works. Retries + timeouts are handled by the SDK.
//
// Security: the endpoint MUST be one of the providers listed in
// src/config/providers.yaml (prevents relaying env secrets to random hosts).
// The key never reaches the browser: it is read from process.env[envKey]
// (Vercel dashboard), or from an optional user-supplied Authorization header.

import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"
import OpenAI from "openai"

type YamlFile = { providers?: { id: string; endpoint: string }[] }

function allowedEndpoints(): string[] {
  const candidates = [
    path.join(process.cwd(), "src/config/providers.yaml"),
    path.join(process.cwd(), "../src/config/providers.yaml"),
    path.join(process.cwd(), "../../src/config/providers.yaml"),
  ]
  for (const p of candidates) {
    try {
      const f = YAML.parse(fs.readFileSync(p, "utf8")) as YamlFile
      return (f.providers || []).map((x) => x.endpoint.replace(/\/+$/, ""))
    } catch { /* try next */ }
  }
  return []
}

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : req.body || {}
  const endpoint = String(body.endpoint || "").replace(/\/+$/, "")
  if (!allowedEndpoints().includes(endpoint)) {
    return res.status(403).json({ error: "Endpoint not in providers.yaml — add it to the repo file first" })
  }

  const auth: string = req.headers.authorization || ""
  let key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!key && body.envKey && /^[A-Z0-9_]+$/.test(body.envKey)) {
    key = process.env[body.envKey] || ""
  }
  if (!key) return res.status(401).json({ error: `Missing key — set ${body.envKey || "the env var"} on Vercel or send Authorization header` })

  const client = new OpenAI({
    apiKey: key,
    baseURL: endpoint,
    maxRetries: 2,
    timeout: 25000, // stay under maxDuration 30
  })

  try {
    if (body.response === "openai-responses") {
      // Responses API — system messages become top-level instructions
      const msgs: { role: string; content: string }[] = body.messages || []
      const instructions = msgs.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || undefined
      const input = msgs
        .filter((m) => m.role !== "system")
        .map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      const r = await client.responses.create({
        model: body.model,
        instructions,
        input,
        temperature: body.temperature ?? 0.2,
        max_output_tokens: Math.min(body.max_tokens ?? 6000, 65536),
      } as any)
      const text =
        r.output_text ??
        (r as any).output?.flatMap((o: any) => o.content || []).map((c: any) => c.text || "").join("") ??
        ""
      return res.status(200).json({ content: text })
    }

    // Chat Completions API
    const r = await client.chat.completions.create({
      model: body.model,
      messages: body.messages,
      temperature: body.temperature ?? 0.2,
      max_tokens: body.max_tokens,
      response_format: body.response_format,
    } as any)
    return res.status(200).json(r)
  } catch (e: unknown) {
    // Forward status so the client's rate-limit/backoff regex keeps working
    const status = (e as { status?: number }).status ?? 502
    const msg = e instanceof Error ? e.message : String(e)
    return res.status(status >= 400 && status < 600 ? status : 502).json({ error: `${status} ${msg}`.slice(0, 500) })
  }
}
