import Dexie, { type Table } from "dexie"
import type { UniversalPaper } from "@/types"

// Single DB, 4 tables — papers, results, settings, pdfs
export interface StoredPaper {
  id: string // "current" | uuid
  paper: UniversalPaper
  state?: {
    currentQ: number
    answers: Record<string, string> // qId -> answer
    timeSpent: Record<string, number>
    status: Record<string, "notVisited" | "answered" | "notAnswered" | "marked" | "markedAnswered">
    remainingSeconds: number
  }
  updatedAt: number
}

export interface Result {
  id?: number
  paperId: string
  score: { total: number; obtained: number; percentage: number }
  breakdown: { subject: string | null; total: number; correct: number }[]
  createdAt: number
  paper: UniversalPaper
}

export interface Settings {
  id: string // "app"
  theme: "light" | "dark"
  lastExtractAt?: number
}

export interface PdfCache {
  id: string // "__pdf"
  name: string
  buffer: ArrayBuffer
  updatedAt: number
}

export interface ExtractJob {
  id: string // `${fileName}__${fileSize}`
  fileName: string
  pages: string[] // chunk texts
  results: Record<string, { questions: unknown[]; lastNum: number }>
  done: boolean
  updatedAt: number
}

export class RankifyPDF2CBTDB extends Dexie {
  papers!: Table<StoredPaper, string>
  results!: Table<Result, number>
  settings!: Table<Settings, string>
  pdfs!: Table<PdfCache, string>
  extractJobs!: Table<ExtractJob, string>

  constructor() {
    super("RankifyPDF2CBT")
    this.version(1).stores({
      papers: "id",
      results: "++id, paperId, createdAt",
      settings: "id",
    })
    this.version(2).stores({
      papers: "id",
      results: "++id, paperId, createdAt",
      settings: "id",
      pdfs: "id",
    })
    this.version(3).stores({
      papers: "id",
      results: "++id, paperId, createdAt",
      settings: "id",
      pdfs: "id",
      extractJobs: "id",
    })
  }
}

let db: RankifyPDF2CBTDB | null = null
export function getDB() {
  if (!db) db = new RankifyPDF2CBTDB()
  return db
}
