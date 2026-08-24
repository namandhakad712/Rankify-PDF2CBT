import * as pdfjs from "pdfjs-dist"
// Vite handles worker via ?url
import workerUrl from "pdfjs-dist/build/pdf.worker.min.mjs?url"

if (typeof window !== "undefined") {
  // @ts-ignore
  pdfjs.GlobalWorkerOptions.workerSrc = workerUrl
}

export async function loadPdfFromFile(file: File) {
  const buf = await file.arrayBuffer()
  return loadPdfFromBuffer(buf)
}

export async function loadPdfFromBuffer(buf: ArrayBuffer) {
  const doc = await pdfjs.getDocument({ data: buf }).promise
  return doc
}

export async function renderPageToCanvas(doc: pdfjs.PDFDocumentProxy, pageNum: number, scale = 1.5): Promise<HTMLCanvasElement> {
  const page = await doc.getPage(pageNum)
  const viewport = page.getViewport({ scale })
  const canvas = document.createElement("canvas")
  canvas.width = viewport.width
  canvas.height = viewport.height
  const ctx = canvas.getContext("2d")!
  await page.render({ canvasContext: ctx, viewport } as any).promise
  return canvas
}

export async function getPageCount(buf: ArrayBuffer): Promise<number> {
  const doc = await loadPdfFromBuffer(buf)
  try {
    return doc.numPages
  } finally {
    doc.destroy()
  }
}

export async function extractPdfPages(buf: ArrayBuffer): Promise<string[]> {
  const doc = await loadPdfFromBuffer(buf)
  try {
    const out: string[] = []
    for (let i = 1; i <= doc.numPages; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      // join with newline but keep item order; trim heavy whitespace runs
      const text = (content.items as { str: string }[])
        .map((x) => x.str)
        .join(" ")
        .replace(/[ \t]{2,}/g, " ")
        .trim()
      out.push(text)
    }
    return out
  } finally {
    doc.destroy()
  }
}

export async function extractPdfText(buf: ArrayBuffer, maxPages = 5): Promise<string> {
  const doc = await loadPdfFromBuffer(buf)
  try {
    const n = Math.min(doc.numPages, maxPages)
    let out = ""
    for (let i = 1; i <= n; i++) {
      const page = await doc.getPage(i)
      const content = await page.getTextContent()
      const text = (content.items as { str: string }[]).map((x) => x.str).join(" ")
      out += `\n--- Page ${i} ---\n` + text
    }
    return out.slice(0, 15000) // cap
  } finally {
    doc.destroy()
  }
}
