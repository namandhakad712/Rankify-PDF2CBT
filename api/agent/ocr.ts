// Vercel Serverless — Mistral OCR proxy for scanned PDFs (no text layer)
// POST /api/agent/ocr   multipart/form-data: file=<pdf>
//
// Official flow (docs.mistral.ai/capabilities/document_ai/basic_ocr):
//   1. POST /v1/files        purpose="ocr"          → { id }
//   2. GET  /v1/files/{id}/url                      → { url }  (signed, 24h)
//   3. POST /v1/ocr          model=mistral-ocr-latest, document=document_url
//                                                   → { pages: [{markdown}] }
// Key comes from MISTRAL_API_KEY env (server-only) or user Authorization header.
// Free tier budget: 625 pages/min.

export const maxDuration = 60

const BASE = "https://api.mistral.ai/v1"

export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  const auth: string = req.headers.authorization || ""
  let key = auth.startsWith("Bearer ") ? auth.slice(7).trim() : ""
  if (!key) key = process.env.MISTRAL_API_KEY || ""
  if (!key) return res.status(401).json({ error: "401 Missing MISTRAL_API_KEY — set it on Vercel to use OCR for scanned PDFs" })

  try {
    // Node serverless: req.body is a Buffer when content-type is not JSON
    const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "")
    if (!buf.length) return res.status(400).json({ error: "Empty PDF body" })
    if (buf.length > 45 * 1024 * 1024) return res.status(413).json({ error: "PDF too large for OCR proxy (<45MB)" })

    const H = { Authorization: `Bearer ${key}` }

    // 1. upload
    const fd = new FormData()
    fd.append("purpose", "ocr")
    fd.append("file", new Blob([new Uint8Array(buf)], { type: "application/pdf" }), "paper.pdf")
    const up = await fetch(`${BASE}/files`, { method: "POST", headers: H, body: fd })
    if (!up.ok) return res.status(up.status === 429 ? 429 : 502).json({ error: `${up.status} ${(await up.text()).slice(0, 300)}` })
    const fileId = ((await up.json()) as { id: string }).id

    // 2. signed url
    const su = await fetch(`${BASE}/files/${fileId}/url`, { headers: H })
    if (!su.ok) return res.status(502).json({ error: `${su.status} ${(await su.text()).slice(0, 300)}` })
    const signedUrl = ((await su.json()) as { url: string }).url

    // 3. OCR
    const oc = await fetch(`${BASE}/ocr`, {
      method: "POST",
      headers: { ...H, "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "mistral-ocr-latest",
        document: { type: "document_url", document_name: "paper.pdf", document_url: signedUrl },
      }),
    })
    if (!oc.ok) {
      const t = await oc.text()
      return res.status(oc.status === 429 ? 429 : 502).json({ error: `${oc.status} ${t.slice(0, 300)}` })
    }
    const j = (await oc.json()) as { pages?: { index: number; markdown?: string }[] }
    const pages = (j.pages || [])
      .sort((a, b) => a.index - b.index)
      .map((p) => (p.markdown || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim()) // strip inline image refs
    return res.status(200).json({ pages })
  } catch (e: unknown) {
    return res.status(502).json({ error: e instanceof Error ? e.message : String(e) })
  }
}
