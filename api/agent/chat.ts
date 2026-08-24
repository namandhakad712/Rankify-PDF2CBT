// Vercel Serverless — generic secure proxy for preconfigured providers
// POST /api/agent/chat  body: {endpoint, response, envKey, model, messages, temperature, max_tokens, response_format}
//
// Security: the endpoint MUST be one of the providers listed in
// src/config/providers.yaml — this prevents the proxy being abused to relay
// our env-var secrets to arbitrary hosts. The key itself never leaves the
// server: it is read from process.env[envKey] (set in Vercel dashboard).
// Users may also send their own "Authorization: Bearer <key>" header instead.

import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"

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

  const mode = body.response === "openai-responses" ? "responses" : "completions"
  try {
    if (mode === "responses") {
      // OpenAI Responses API shape
      const system = (body.messages || []).filter((m: any) => m.role === "system").map((m: any) => m.content).join("\n\n")
      const input = (body.messages || [])
        .filter((m: any) => m.role !== "system")
        .map((m: any) => ({ role: m.role, content: m.content }))
      const r = await fetch(`${endpoint}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
        body: JSON.stringify({
          model: body.model,
          instructions: system || undefined,
          input,
          max_output_tokens: Math.min(body.max_tokens ?? 6000, 6000),
          temperature: body.temperature ?? 0.2,
        }),
      })
      if (!r.ok) return res.status(r.status).send(await r.text())
      const j = await r.json()
      const text =
        j.output_text ??
        (j.output || []).flatMap((o: any) => (o.content || [])).map((c: any) => c.text || "").join("") ??
        ""
      return res.status(200).json({ content: text })
    }
    // OpenAI Chat Completions shape
    const r = await fetch(`${endpoint}/chat/completions`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${key}` },
      body: JSON.stringify({
        model: body.model,
        messages: body.messages,
        temperature: body.temperature ?? 0.2,
        max_tokens: body.max_tokens,
        response_format: body.response_format,
      }),
    })
    if (!r.ok) return res.status(r.status).send(await r.text())
    const j = await r.json()
    return res.status(200).json(j)
  } catch (e: unknown) {
    return res.status(502).json({ error: e instanceof Error ? e.message : String(e) })
  }
}
