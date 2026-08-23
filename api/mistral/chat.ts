// Vercel Serverless — proxy to hide MISTRAL_API_KEY
// POST /api/mistral/chat  body: {model, messages, temperature, max_tokens, response_format}
// Client: fetch('/api/mistral/chat', {method:'POST', headers:{'Content-Type':'application/json', Authorization:`Bearer ${key}`}, body:JSON.stringify(payload)})
// viaProxy=true path used by src/lib/providers/mistral.ts:24
// Env fallback: MISTRAL_API_KEY (Vercel Project Settings → Environment Variables, server-only, no VITE_ prefix)
//
// Vercel config: vercel.json -> functions["api/mistral/chat.ts"].maxDuration = 30
// Docs: https://docs.mistral.ai/api/endpoint/chat  POST https://api.mistral.ai/v1/chat/completions

export default async function handler(req: any, res: any) {
  // CORS — allow SPA on same origin + localhost dev
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  // Auth: prefer Authorization: Bearer <key> from client (BYOK), fall back to env
  const auth: string = req.headers.authorization || req.headers.Authorization || ""
  let key: string | undefined = undefined
  if (auth.startsWith("Bearer ")) key = auth.slice(7).trim()
  if (!key) key = process.env.MISTRAL_API_KEY

  if (!key) {
    return res.status(401).json({
      error: "Missing MISTRAL_API_KEY — set env on Vercel or send Authorization: Bearer <key>",
    })
  }

  // Vercel parses JSON body automatically when Content-Type is application/json.
  // Fallback to raw stream if body is empty (e.g. when bodyParser disabled).
  let body: unknown = req.body
  if (!body || (typeof body === "object" && Object.keys(body as object).length === 0)) {
    try {
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      const raw = Buffer.concat(chunks).toString("utf-8")
      body = raw ? JSON.parse(raw) : {}
    } catch {
      // keep parsed body if raw parse fails
    }
  }

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid JSON body" })
  }

  try {
    const r = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify(body),
    })

    const text = await r.text()
    const ct = r.headers.get("content-type") || "application/json"
    res.status(r.status).setHeader("Content-Type", ct).send(text)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // Don't leak key; cap length
    res.status(502).json({ error: `Upstream fetch failed: ${msg.slice(0, 500)}` })
  }
}
