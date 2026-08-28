// Shared agent-API core — used by Vercel functions (api/) AND the Vite dev
// shim (vite.config.ts). Pure Node logic, no framework types.
import fs from "node:fs"
import path from "node:path"
import YAML from "yaml"
import OpenAI from "openai"
import { Mistral } from "@mistralai/mistralai"

type YamlFile = { providers?: { id: string; endpoint: string }[] }

export function allowedEndpoints(): string[] {
  const candidates = [
    path.join(process.cwd(), "src/config/providers.yaml"),
    path.join(process.cwd(), "../src/config/providers.yaml"),
    path.join(process.cwd(), "../../src/config/providers.yaml"),
  ]
  for (const p of candidates) {
    try {
      const f = YAML.parse(fs.readFileSync(p, "utf8")) as YamlFile
      return (f.providers || []).map((x) => x.endpoint.replace(/\/+$/, ""))
    } catch { /* next */ }
  }
  return []
}

/** process.env first, then .env files (dev convenience) — quotes stripped */
export function getEnv(name: string): string {
  if (process.env[name]) return process.env[name] as string
  for (const file of [".env.local", ".env", ".env.development", ".env.development.local"]) {
    try {
      const txt = fs.readFileSync(path.join(process.cwd(), file), "utf8")
      const m = new RegExp(`^${name}\\s*=\\s*(.*)$`, "m").exec(txt)
      if (m) {
        const raw = m[1].trim().replace(/^["']|["']$/, "")
        if (raw) return raw // blank value = not set, keep looking
      }
    } catch { /* next file */ }
  }
  return ""
}

const jsonOut = (status: number, json: unknown) => ({ status, json })

/** Which provider env keys are configured (booleans only — values never leave the server) */
export async function handleStatus(): Promise<{ status: number; json: unknown }> {
  type P = { id: string; name: string; endpoint: string; response?: string; envKey?: string; docsUrl?: string; models?: unknown[] }
  let presets: { id: string; name: string; endpoint: string; response: string; envKey: string; docsUrl?: string; models: string[] }[] = []
  let yamlOk = false
  let yamlError: string | null = null
  for (const candidate of [
    path.join(process.cwd(), "src/config/providers.yaml"),
    path.join(process.cwd(), "../src/config/providers.yaml"),
    path.join(process.cwd(), "../../src/config/providers.yaml"),
  ]) {
    try {
      const f = YAML.parse(fs.readFileSync(candidate, "utf8")) as { providers?: P[] }
      presets = (f.providers || []).map((x) => ({
        id: x.id, name: x.name, endpoint: x.endpoint.replace(/\/+$/, ""),
        response: x.response || "openai-completions", envKey: x.envKey || "",
        docsUrl: x.docsUrl, models: (x.models || []).map((m: unknown) => typeof m === "string" ? m : (m as { id: string }).id),
      }))
      yamlOk = true
      break
    } catch (e) { yamlError = e instanceof Error ? e.message.slice(0,120) : String(e) }
  }
  // Fallback hardcoded list so env check works even if yaml bundling fails
  const FIXED_KEYS = ["GROQ_API_KEY","MISTRAL_API_KEY","NVIDIA_API_KEY","POOLSIDE_API_KEY","OPENCODE_API_KEY","INFERX_API_KEY"]
  const allKeys = new Set([...presets.map(p=>p.envKey).filter(Boolean) as string[], ...FIXED_KEYS])
  const envKeys: Record<string, boolean> = {}
  for (const k of allKeys) envKeys[k] = !!getEnv(k)
  // Debug: list which env keys exist in process.env without exposing values
  const envSeen = Object.keys(process.env).filter(k => k.includes("API_KEY")).sort()
  return jsonOut(200, { presets, envKeys, debug: { yamlOk, yamlError, cwd: process.cwd(), envSeen, nodeEnv: process.env.VERCEL_ENV || process.env.NODE_ENV || null } })
}

/** Real provider health — tries tiny request with the server key, not just env presence */
export async function handleHealth(): Promise<{ status: number; json: unknown }> {
  type P = { id: string; name: string; endpoint: string; response?: string; envKey?: string; docsUrl?: string; models?: (string | { id: string })[]; agentId?: string }
  let providers: P[] = []
  for (const candidate of [
    path.join(process.cwd(), "src/config/providers.yaml"),
    path.join(process.cwd(), "../src/config/providers.yaml"),
    path.join(process.cwd(), "../../src/config/providers.yaml"),
  ]) {
    try {
      const f = YAML.parse(fs.readFileSync(candidate, "utf8")) as { providers?: P[] }
      providers = f.providers || []
      break
    } catch {}
  }
  const results: Record<string, { ok: boolean; hasKey: boolean; status?: number; ms?: number; error?: string }> = {}
  const sleep = (ms: number) => new Promise(r => setTimeout(r, ms))
  await Promise.all(providers.map(async (p) => {
    const hasKey = p.envKey ? !!getEnv(p.envKey) : true
    if (!hasKey) { results[p.id] = { ok: false, hasKey: false, error: "no key" }; return }
    const key = p.envKey ? getEnv(p.envKey) : ""
    // mistral-agent uses conversations API — retry 2× if timeout/5xx, then mark not working
    if (p.response === "mistral-agent") {
      for (let attempt = 1; attempt <= 2; attempt++) {
        const start = Date.now()
        try {
          const client = new Mistral({ apiKey: key })
          const r: unknown = await Promise.race([
            client.beta.conversations.start({ agentId: (p as unknown as { agentId: string }).agentId || "ag_01a033a6dd8b729c89877137d609d0fc", agentVersion: 4, inputs: [{ role: "user", content: "hi" }] } as never),
            new Promise((_, rej) => setTimeout(() => rej(new Error("timeout 5s")), 5000))
          ])
          results[p.id] = r ? { ok: true, hasKey: true, ms: Date.now() - start } : { ok: false, hasKey: true, error: "empty" }
          return
        } catch (e: unknown) {
          const msg = e instanceof Error ? e.message : String(e)
          const isRate = /429|rate.?limit/i.test(msg)
          if (isRate) { results[p.id] = { ok: true, hasKey: true, ms: Date.now() - start }; return }
          if (attempt === 2 || /401|403/.test(msg)) {
            results[p.id] = { ok: false, hasKey: true, error: msg.slice(0, 120), ms: Date.now() - start }
            return
          }
          await sleep(1200 * attempt)
        }
      }
      return
    }
    // for openai-compatible, try GET /models (cheapest, no tokens) — retry 2×
    for (let attempt = 1; attempt <= 2; attempt++) {
      const start = Date.now()
      try {
        const base = p.endpoint.replace(/\/+$/, "").replace(/\/chat\/completions$/, "")
        const ctrl = new AbortController()
        const to = setTimeout(() => ctrl.abort(), 4500)
        const r = await fetch(`${base}/models`, { headers: key ? { Authorization: `Bearer ${key}` } : {}, signal: ctrl.signal })
        clearTimeout(to)
        const ms = Date.now() - start
        if (r.ok) { results[p.id] = { ok: true, hasKey: true, status: r.status, ms }; return }
        const txt = (await r.text()).slice(0, 120)
        if (r.status === 429) { results[p.id] = { ok: true, hasKey: true, status: r.status, ms }; return }
        if (r.status === 401 || r.status === 403 || attempt === 2) { results[p.id] = { ok: false, hasKey: true, status: r.status, error: txt, ms }; return }
        await sleep(1200 * attempt)
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e)
        const isTimeout = /abort|timeout/i.test(msg)
        if (attempt === 2) { results[p.id] = { ok: false, hasKey: true, error: isTimeout ? "timeout" : msg.slice(0, 120), ms: Date.now() - start }; return }
        await sleep(1200 * attempt)
      }
    }
  }))
  return jsonOut(200, { health: results })
}

export async function handleChat(opts: {
  endpoint: string; response?: string; envKey?: string; model: string
  messages: { role: string; content: string }[]
  temperature?: number; max_tokens?: number; response_format?: unknown
  authHeader?: string
}): Promise<{ status: number; json: unknown }> {
  const endpoint = String(opts.endpoint || "").replace(/\/+$/, "")
  if (!allowedEndpoints().includes(endpoint)) return jsonOut(403, { error: "Endpoint not in providers.yaml — add it to the repo file first" })
  const authHeader = opts.authHeader ?? ""
  let key = authHeader.startsWith("Bearer ") ? authHeader.slice(7).trim() : ""
  if (!key && opts.envKey && /^[A-Z0-9_]+$/.test(opts.envKey)) key = getEnv(opts.envKey)
  if (!key) return jsonOut(401, { error: `Missing key — set ${opts.envKey || "the env var"} on Vercel/.env.local or send Authorization header` })

  const client = new OpenAI({ apiKey: key, baseURL: endpoint, maxRetries: 2, timeout: 25000 })
  try {
    if (opts.response === "openai-responses") {
      const instructions = opts.messages.filter((m) => m.role === "system").map((m) => m.content).join("\n\n") || undefined
      const input = opts.messages.filter((m) => m.role !== "system").map((m) => ({ role: m.role as "user" | "assistant", content: m.content }))
      const r = await client.responses.create({ model: opts.model, instructions, input, temperature: opts.temperature ?? 0.2, max_output_tokens: Math.min(opts.max_tokens ?? 6000, 65536) } as never)
      const text = r.output_text ?? (r as unknown as { output?: { content?: { text?: string } }[] }).output?.flatMap((o) => o.content || []).map((c) => c.text || "").join("") ?? ""
      return jsonOut(200, { content: text })
    }
    const r = await client.chat.completions.create({ model: opts.model, messages: opts.messages as never, temperature: opts.temperature ?? 0.2, max_tokens: opts.max_tokens, response_format: opts.response_format as never })
    return jsonOut(200, r)
  } catch (e: unknown) {
    const status = (e as { status?: number }).status ?? 502
    return jsonOut(status >= 400 && status < 600 ? status : 502, { error: `${status} ${e instanceof Error ? e.message : String(e)}`.slice(0, 500) })
  }
}

export async function handleOcr(pdfBytes: Buffer, authHeader?: string): Promise<{ status: number; json: unknown }> {
  const ah = authHeader ?? ""
  let key = ah.startsWith("Bearer ") ? ah.slice(7).trim() : ""
  if (!key) key = getEnv("MISTRAL_API_KEY")
  if (!key) return jsonOut(401, { error: "401 Missing MISTRAL_API_KEY — set it in Vercel/.env.local for scanned-PDF OCR" })
  if (!pdfBytes?.length) return jsonOut(400, { error: "Empty PDF body" })
  if (pdfBytes.length > 45 * 1024 * 1024) return jsonOut(413, { error: "PDF too large for OCR proxy (<45MB)" })
  const H = { Authorization: `Bearer ${key}` }
  const BASE = "https://api.mistral.ai/v1"
  try {
    const fd = new FormData()
    fd.append("purpose", "ocr")
    fd.append("file", new Blob([new Uint8Array(pdfBytes)], { type: "application/pdf" }), "paper.pdf")
    const up = await fetch(`${BASE}/files`, { method: "POST", headers: H, body: fd })
    if (!up.ok) return jsonOut(up.status === 429 ? 429 : 502, { error: `${up.status} ${(await up.text()).slice(0, 300)}` })
    const fileId = ((await up.json()) as { id: string }).id
    const su = await fetch(`${BASE}/files/${fileId}/url`, { headers: H })
    if (!su.ok) return jsonOut(502, { error: `${su.status} ${(await su.text()).slice(0, 300)}` })
    const signedUrl = ((await su.json()) as { url: string }).url
    const oc = await fetch(`${BASE}/ocr`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({ model: "mistral-ocr-latest", document: { type: "document_url", document_name: "paper.pdf", document_url: signedUrl } }),
    })
    if (!oc.ok) return jsonOut(oc.status === 429 ? 429 : 502, { error: `${oc.status} ${(await oc.text()).slice(0, 300)}` })
    const j = (await oc.json()) as { pages?: { index: number; markdown?: string }[] }
    const pages = (j.pages || []).sort((a, b) => a.index - b.index).map((p) => (p.markdown || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim())
    return jsonOut(200, { pages })
  } catch (e: unknown) {
    return jsonOut(502, { error: e instanceof Error ? e.message : String(e) })
  }
}
