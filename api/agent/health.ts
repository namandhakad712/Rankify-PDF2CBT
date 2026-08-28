// Vercel Serverless — real provider health (tiny ping)
export const maxDuration = 10
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { handleHealth } from "../../server/core.js"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  res.setHeader("Access-Control-Allow-Methods", "GET, OPTIONS")
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, Authorization")
  if (req.method === "OPTIONS") return res.status(204).end()
  const out = await handleHealth()
  return res.status(out.status).json(out.json)
}
