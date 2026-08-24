// Vercel Serverless — reports which provider env keys are configured (booleans only)
import type { VercelRequest, VercelResponse } from "@vercel/node"
import { handleStatus } from "../../server/core"

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (req.method === "OPTIONS") return res.status(204).end()
  const out = await handleStatus()
  return res.status(out.status).json(out.json)
}
