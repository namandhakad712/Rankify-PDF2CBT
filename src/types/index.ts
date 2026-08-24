// UNIVERSAL PDF → CBT JSON Schema — Generic for ANY exam
// Subject-agnostic no exam hardcoding.
// Works for SSC, UPSC, Banking, GATE, School, Custom, any language.

export type QuestionType =
  | "mcq"          // single correct, options A-D
  | "msq"          // multiple correct
  | "nat"          // numerical answer
  | "true-false"
  | "fill-blank"
  | "match"        // match-list / matrix
  | "assertion-reason"
  | "passage"      // linked comprehension
  | "essay"        // descriptive

export type Difficulty = "easy" | "medium" | "hard" | null

// Generic question — subject/topic are FREE STRINGS, not enums
export interface UniversalQuestion {
  id: string // "q-1" or "secA__--__1" — stable
  number: number // display order 1..N
  subject: string | null // ANY: "Physics", "Reasoning", "GK", "Maths", "English" —
  section: string | null // ANY: "A", "Section 1", "Part-A" — free
  topic: string | null // free — "Kinematics", "Profit-Loss", "Constitution" — no vocab lock
  chapter?: string | null
  type: QuestionType
  text: string // markdown + LaTeX, preserved as-is
  textAlt?: string | null // second language e.g. Hindi
  options: string[] | null // MCQ/MSQ/Match: ["Opt A", ...], null for NAT/essay/fill-blank
  answer: string // MCQ "1"-"4" (1-indexed as displayed), NAT "42", fill "answer text", essay ""
  answers: string[] | null // MSQ only: ["0","2"] 0-indexed sorted, else null
  marks: number // default 1 or 4 — per question, not normalized
  negativeMarks: number // default 0 — per question
  hasDiagram: boolean
  diagrams: string[] | null // client objectURLs — Gemini puts _imageRefs, client resolves
  difficulty: Difficulty
  pageNo?: number | null // source PDF page (1-based) — jumps cropper straight to it
  tags?: string[]
  explanation?: string | null // solution
  passageId?: string | null
  _imageRefs?: string[] // temp from Gemini: ["img-1.jpg"] → resolved to diagrams
}

export interface UniversalSection {
  id: string
  name: string // "Section A", "Physics", "Part 1"
  subject?: string | null // optional grouping
  description?: string | null
  questionIds?: string[] // optional ordering
}

export interface UniversalPaper {
  meta: {
    title: string // "SSC CGL 2024 Shift 1"
    exam?: string | null // free: "SSC", "UPSC", "Custom Test", null
    language?: string | null // "en", "hi", "bilingual"
    durationMinutes: number // 60/180
    totalQuestions: number
    totalMarks?: number
    instructions?: string | null
    createdAt: string // ISO
    createdBy?: string | null
  }
  sections: UniversalSection[] // empty [] if no sections — flat paper
  questions: UniversalQuestion[]
  // flags for pipeline
  answerKeyFound?: boolean
  source?: string // "pdf-upload", "manual"
}

// Extract cache — what Gemini returns (in-memory)
export interface ExtractCache {
  questions: UniversalQuestion[]
  sections: UniversalSection[]
  answerKeyFound: boolean
  meta: UniversalPaper["meta"]
}

// Handoff types
export type ExtractResult = UniversalPaper

// Helpers
export const EXAM_DEFAULTS_GENERIC = {
  durationMinutes: 180,
  marks: 4,
  negativeMarks: 1, // MCQ
} as const

export function createEmptyPaper(title = "Untitled Test"): UniversalPaper {
  return {
    meta: {
      title,
      exam: null,
      durationMinutes: 180,
      totalQuestions: 0,
      createdAt: new Date().toISOString(),
    },
    sections: [],
    questions: [],
  }
}
