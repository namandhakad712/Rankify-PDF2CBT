// Vercel Serverless — proxy to hide NVIDIA_API_KEY
// POST /api/nvidia/chat  body: {model, messages, temperature, max_tokens, response_format?}
// viaProxy=true path used by src/lib/providers/nvidia.ts:26
// Env fallback: NVIDIA_API_KEY (server-only)
//
// POST https://integrate.api.nvidia.com/v1/chat/completions — OpenAI-compatible (NIM)
// Docs: https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1
// Note: some NVIDIA hosted models don't support response_format json_object; client should handle fallback to text.

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")

  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  const auth: string = req.headers.authorization || req.headers.Authorization || ""
  let key: string | undefined = undefined
  if (auth.startsWith("Bearer ")) key = auth.slice(7).trim()
  if (!key) key = process.env.NVIDIA_API_KEY

  if (!key) {
    return res.status(401).json({
      error: "Missing NVIDIA_API_KEY — set env on Vercel or send Authorization: Bearer <key>",
    })
  }

  let body: unknown = req.body
  if (!body || (typeof body === "object" && Object.keys(body as object).length === 0)) {
    try {
      const chunks: Buffer[] = []
      for await (const c of req) chunks.push(c as Buffer)
      const raw = Buffer.concat(chunks).toString("utf-8")
      body = raw ? JSON.parse(raw) : {}
    } catch {
      // keep original
    }
  }

  if (!body || typeof body !== "object") {
    return res.status(400).json({ error: "Invalid JSON body" })
  }

  try {
    const r = await fetch("https://integrate.api.nvidia.com/v1/chat/completions", {
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
    res.status(502).json({ error: `Upstream fetch failed: ${msg.slice(0, 500)}` })
  }
}
