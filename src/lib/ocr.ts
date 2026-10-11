// Scanned-PDF handling: text-layer detection + Mistral OCR fallback.
// Free models are text-to-text — a PDF either has an extractable text layer
// (pdf.js path, already chunk-wise) or it's scanned and needs OCR first.

import { loadProviders } from "@/lib/providers"

let pdfjsLib: typeof import("pdfjs-dist") | null = null
export async function getPdfjs(): Promise<typeof import("pdfjs-dist")> {
  if (pdfjsLib) return pdfjsLib
  const mod = await import("pdfjs-dist")
  // Vite handles worker via ?url
  const workerUrl = (await import("pdfjs-dist/build/pdf.worker.min.mjs?url")).default
  if (typeof window !== "undefined") {
    // @ts-ignore
    mod.GlobalWorkerOptions.workerSrc = workerUrl
  }
  pdfjsLib = mod
  return mod
}

export function needsOcr(pages: string[]): boolean {
  const totalChars = pages.reduce((s, p) => s + p.replace(/\s/g, "").length, 0)
  // ~40 meaningful chars per page is the floor for a real text layer
  return totalChars < Math.max(120, pages.length * 40)
}

async function getMistralKey(): Promise<string | null> {
  try {
    const providers = await loadProviders()
    const mistral = providers.find(p => p.id === "mistral")
    if (mistral?.apiKey?.trim()) return mistral.apiKey.trim()
    // Also check for any preset with Mistral endpoint that has a key
    const preset = providers.find(p => p.isPreset && p.baseUrl?.includes("mistral") && p.apiKey?.trim())
    if (preset?.apiKey?.trim()) return preset.apiKey.trim()
  } catch {}
  return null
}

async function uploadToMistral(file: File, key: string): Promise<string> {
  const fd = new FormData()
  fd.append("purpose", "ocr")
  fd.append("file", file, file.name || "paper.pdf")
  
  const up = await fetch("https://api.mistral.ai/v1/files", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}` },
    body: fd,
  })
  
  if (!up.ok) {
    const err = await up.text().catch(() => "")
    throw new Error(`Mistral upload failed: ${up.status} ${err.slice(0, 300)}`)
  }
  
  const { id } = await up.json()
  
  // Get signed URL
  const su = await fetch(`https://api.mistral.ai/v1/files/${id}/url`, {
    headers: { Authorization: `Bearer ${key}` },
  })
  
  if (!su.ok) {
    const err = await su.text().catch(() => "")
    throw new Error(`Mistral URL fetch failed: ${su.status} ${err.slice(0, 300)}`)
  }
  
  const { url } = await su.json()
  return url
}

async function runMistralOcr(documentUrl: string, key: string): Promise<string[]> {
  const oc = await fetch("https://api.mistral.ai/v1/ocr", {
    method: "POST",
    headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "mistral-ocr-latest",
      document: { type: "document_url", document_name: "paper.pdf", document_url: documentUrl },
    }),
  })
  
  if (!oc.ok) {
    const err = await oc.text().catch(() => "")
    throw new Error(`Mistral OCR failed: ${oc.status} ${err.slice(0, 300)}`)
  }
  
  const j = (await oc.json()) as { pages?: { index: number; markdown?: string }[] }
  const pages = (j.pages || []).sort((a, b) => a.index - b.index).map((p) => 
    (p.markdown || "").replace(/!\[[^\]]*\]\([^)]*\)/g, "").trim()
  )
  return pages
}

async function ocrViaProxy(file: File): Promise<string[]> {
  const r = await fetch("/api/agent/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`OCR proxy failed: ${r.status} ${t.slice(0, 300)}`)
  }
  const j = (await r.json()) as { pages: string[] }
  if (!j.pages?.length) throw new Error("OCR returned no pages")
  return j.pages
}

export async function ocrPdf(file: File): Promise<string[]> {
  // Try browser-direct with user's key first
  const key = await getMistralKey()
  
  if (key) {
    try {
      const documentUrl = await uploadToMistral(file, key)
      return await runMistralOcr(documentUrl, key)
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e)
      // If CORS or network error, fall back to proxy
      if (/failed to fetch|network|cors/i.test(msg)) {
        console.warn("Direct Mistral OCR failed (CORS/network), falling back to proxy:", msg)
        return ocrViaProxy(file)
      }
      throw e
    }
  }
  
  // No key: fall back to proxy (will use shared key or return 401 with friendly message)
  try {
    return await ocrViaProxy(file)
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e)
    if (msg.includes("401") || msg.includes("Missing MISTRAL_API_KEY")) {
      throw new Error("OCR needs a Mistral API key. Add one in AI Agent → Settings, or use the GEM paste path (no key needed).")
    }
    throw e
  }
}