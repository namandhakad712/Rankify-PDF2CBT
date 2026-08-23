// Light validator — generic, not JEE 33-check heavy AGENT.md:1173
import type { UniversalPaper } from "@/types"

export interface ValidationIssue {
  qId?: string
  field: string
  severity: "error" | "warning"
  message: string
}

export function validatePaper(paper: UniversalPaper): ValidationIssue[] {
  const issues: ValidationIssue[] = []
  if (!paper.meta.title) issues.push({ field: "meta.title", severity: "error", message: "title missing" })
  if (paper.questions.length === 0) issues.push({ field: "questions", severity: "error", message: "no questions" })
  if (paper.meta.totalQuestions && paper.questions.length !== paper.meta.totalQuestions) {
    issues.push({ field: "meta.totalQuestions", severity: "warning", message: `expected ${paper.meta.totalQuestions} got ${paper.questions.length}` })
  }

  const numbers = new Set<number>()
  for (const q of paper.questions) {
    if (!q.text?.trim()) issues.push({ qId: q.id, field: "text", severity: "error", message: "empty text" })
    if (numbers.has(q.number)) issues.push({ qId: q.id, field: "number", severity: "error", message: `duplicate number ${q.number}` })
    numbers.add(q.number)

    // MCQ/MSQ must have options
    if ((q.type === "mcq" || q.type === "msq" || q.type === "match") && (!q.options || q.options.length < 2)) {
      issues.push({ qId: q.id, field: "options", severity: "error", message: `${q.type} needs >=2 options` })
    }
    if (q.type === "nat" && q.options !== null) {
      issues.push({ qId: q.id, field: "options", severity: "warning", message: "NAT should have options null" })
    }
    // answer checks generic
    if (q.type === "mcq" && !/^[1-9]\d*$/.test(q.answer) && q.answer !== "") {
      issues.push({ qId: q.id, field: "answer", severity: "warning", message: `mcq answer "${q.answer}" expected "1"-"N"` })
    }
    if (q.type === "msq" && q.answer !== "") {
      issues.push({ qId: q.id, field: "answer", severity: "error", message: 'msq answer must be "" use answers[]' })
    }
    if (q.type === "msq" && (!q.answers || q.answers.length === 0)) {
      issues.push({ qId: q.id, field: "answers", severity: "error", message: "msq needs answers[]" })
    }
    // diagram audit light
    if (q.hasDiagram && (!q._imageRefs || q._imageRefs.length === 0) && (!q.diagrams || q.diagrams.length === 0)) {
      issues.push({ qId: q.id, field: "hasDiagram", severity: "warning", message: "hasDiagram but no _imageRefs/diagrams" })
    }
  }
  return issues
}
