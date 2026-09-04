import type { VercelRequest, VercelResponse } from "@vercel/node"

// Free-tier + open-source safe: no DB, no paid service.
// If owner sets FEEDBACK_WEBHOOK_URL (Discord/Telegram/Sheet), we forward; else we just accept (no secrets in repo).
export default async function handler(req: VercelRequest, res: VercelResponse) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Origin", "*")
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS")
    res.setHeader("Access-Control-Allow-Headers", "Content-Type")
    return res.status(204).end()
  }
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" })

  const body = (req.body ?? {}) as Record<string, unknown>
  const text = String(body.text ?? body.message ?? "").slice(0, 2000).trim()
  const mood = String(body.mood ?? "").slice(0, 20)
  const hardest = String(body.hardest ?? "").slice(0, 100)
  const exam = String(body.exam ?? "").slice(0, 100)
  const nps = body.nps != null ? String(body.nps).slice(0, 4) : ""
  const path = String(body.path ?? "").slice(0, 200)
  if (!text && !mood && !hardest) return res.status(400).json({ error: "empty" })

  const payload = `📝 Rankify feedback\nMood: ${mood || "-"} · Hardest: ${hardest || "-"} · Exam: ${exam || "-"} · NPS:${nps || "-"} · Path:${path}\n${text}`.slice(0, 3500)

  const webhook = process.env.FEEDBACK_WEBHOOK_URL?.trim()
  const tgToken = process.env.FEEDBACK_TELEGRAM_BOT_TOKEN?.trim()
  const tgChat = process.env.FEEDBACK_TELEGRAM_CHAT_ID?.trim()

  // fire-and-forget forward — hobby free, no await blocking response
  const forwards: Promise<unknown>[] = []
  if (webhook) {
    const isDiscord = webhook.includes("discord.com/api/webhooks") || webhook.includes("discordapp.com/api/webhooks")
    const discordBody = isDiscord
      ? JSON.stringify({ content: payload.slice(0, 1900), embeds: [{ description: text.slice(0, 1000) || mood || hardest || "feedback", fields: [{ name: "Exam", value: exam || "-", inline: true }, { name: "Hardest", value: hardest || "-", inline: true }, { name: "Mood/NPS", value: `${mood || "-"} / ${nps || "-"}`, inline: true }, { name: "Path", value: path || "-", inline: false }], color: 3092790, timestamp: new Date().toISOString() }] })
      : JSON.stringify({ text: payload, ...body, _at: new Date().toISOString() })
    forwards.push(fetch(webhook, { method: "POST", headers: { "Content-Type": "application/json" }, body: discordBody }).catch(() => {}))
  }
  if (tgToken && tgChat) {
    forwards.push(fetch(`https://api.telegram.org/bot${tgToken}/sendMessage`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ chat_id: tgChat, text: payload }) }).catch(() => {}))
  }
  // best-effort wait 1.5s but don't fail user if webhook down — free-tier friendly
  if (forwards.length) await Promise.race([Promise.allSettled(forwards), new Promise(r => setTimeout(r, 1500))])

  res.setHeader("Access-Control-Allow-Origin", "*")
  return res.status(200).json({ ok: true, forwarded: forwards.length > 0 })
}
