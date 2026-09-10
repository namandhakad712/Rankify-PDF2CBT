// GTM loader — open-source + free-tier safe.
// - GTM ID is PUBLIC (visible in page source anyway), but we NEVER hardcode it.
//   Forks set their own VITE_GTM_ID; empty = no-op (dev/forks send nothing to you).
// - Disabled when: no ID, opt-out flag, or `?no-track=1`.
// - Vercel Analytics (inject() in main.ts) stays as-is — anonymous, no cookies.

declare global {
  interface Window {
    dataLayer?: Record<string, unknown>[]
    __gtmLoaded?: boolean
  }
}

const OPT_OUT_KEY = "rpdf2cbt-analytics-optout"

export function isOptedOut(): boolean {
  try {
    if (typeof window === "undefined") return true
    if (new URLSearchParams(window.location.search).get("no-track") === "1") return true
    if (localStorage.getItem(OPT_OUT_KEY) === "1") return true
    if (navigator.doNotTrack === "1") return true
  } catch { /* allow */ }
  return false
}

export function setOptOut(v: boolean) {
  try { localStorage.setItem(OPT_OUT_KEY, v ? "1" : "0") } catch {}
}

export function gtmId(): string {
  // Build-time env — set ONLY in Vercel dashboard, never commit the real ID.
  const id = (import.meta.env.VITE_GTM_ID as string | undefined)?.trim() || ""
  return /^GTM-[A-Z0-9]+$/.test(id) ? id : ""
}

export function initGtm() {
  if (typeof window === "undefined" || typeof document === "undefined") return
  const id = gtmId()
  if (!id || window.__gtmLoaded || isOptedOut()) return
  window.dataLayer = window.dataLayer || []
  window.dataLayer.push({ "gtm.start": Date.now(), event: "gtm.js" })
  const s = document.createElement("script")
  s.async = true
  s.src = `https://www.googletagmanager.com/gtm.js?id=${id}`
  document.head.appendChild(s)
  window.__gtmLoaded = true
}

export function trackPage(path: string) {
  if (!gtmId() || isOptedOut()) return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: "page_view", page_path: path })
  } catch {}
}

export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (!gtmId() || isOptedOut()) return
  try {
    window.dataLayer = window.dataLayer || []
    window.dataLayer.push({ event: name, ...params })
  } catch {}
}
