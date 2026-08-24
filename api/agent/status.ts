// Vercel Serverless — reports which provider env keys are configured (booleans only)
export default async function handler(req: any, res: any) {
  res.setHeader("Access-Control-Allow-Origin", "*")
  if (req.method === "OPTIONS") return res.status(204).end()
  const { handleStatus } = await import("../../server/core")
  const out = await handleStatus()
  return res.status(out.status).json(out.json)
}
