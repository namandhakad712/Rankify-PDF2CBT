// Scanned-PDF handling: text-layer detection + Mistral OCR fallback.
// Free models are text-to-text — a PDF either has an extractable text layer
// (pdf.js path, already chunk-wise) or it's scanned and needs OCR first.

export function needsOcr(pages: string[]): boolean {
  const totalChars = pages.reduce((s, p) => s + p.replace(/\s/g, "").length, 0)
  // ~40 meaningful chars per page is the floor for a real text layer
  return totalChars < Math.max(120, pages.length * 40)
}

export async function ocrPdf(file: File): Promise<string[]> {
  const r = await fetch("/api/agent/ocr", {
    method: "POST",
    headers: { "Content-Type": "application/pdf" },
    body: file,
  })
  if (!r.ok) {
    const t = await r.text().catch(() => "")
    throw new Error(`OCR failed: ${r.status} ${t.slice(0, 300)}`)
  }
  const j = (await r.json()) as { pages: string[] }
  if (!j.pages?.length) throw new Error("OCR returned no pages")
  return j.pages
}
