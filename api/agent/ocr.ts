// Vercel Serverless — thin wrapper over server/core.ts (shared with Vite dev shim)
export const maxDuration = 60
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { handleOcr } from "../../server/core.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.status(204).end()
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })
  const buf: Buffer = Buffer.isBuffer(req.body) ? req.body : Buffer.from(req.body || "")
  const out = await handleOcr(buf, (req.headers.authorization as string) || "")
  return res.status(out.status).json(out.json)
}
