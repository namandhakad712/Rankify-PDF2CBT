// Universal content normalize — light port of AGENT.md:440 normalizeLatex
// Generic, no JEE lock. Rules: math preserve, options single-line, no blank runs.

export function normalizeText(s: string): string {
  if (!s) return s
  // token math blocks to preserve
  const math: string[] = []
  const placeholder = (i: number) => `__MATH_${i}__`
  let tmp = s
    // $$...$$ and \[...\] and \begin{env}...\end{env}
    .replace(/\$\$[\s\S]*?\$\$|\\\[[\s\S]*?\\\]|\\begin\{[^}]+\}[\s\S]*?\\end\{[^}]+\}/g, (m) => {
      const i = math.length
      math.push(m)
      return placeholder(i)
    })
    // $...$ and \(...\)
    .replace(/\$[^$]*?\$|\\\([\s\S]*?\\\)/g, (m) => {
      const i = math.length
      math.push(m)
      return placeholder(i)
    })

  // plain text whitespace: collapse \n{2,} → \n, trim lines
  tmp = tmp.replace(/\n{2,}/g, "\n").replace(/[ \t]+/g, " ").trim()

  // restore math verbatim
  math.forEach((m, i) => {
    tmp = tmp.replace(placeholder(i), m)
  })
  return tmp
}

export function normalizeOptions(opts: string[] | null): string[] | null {
  if (!opts) return opts
  // options strictly single-line AGENT.md:442
  return opts.map((o) => o.replace(/\n/g, " ").replace(/\s{2,}/g, " ").trim())
}

// passage-aware: keep single \n for assertion-reason / match-list AGENT.md:450 — we don't strip intentionally
export function normalizeQuestionText(text: string): string {
  return normalizeText(text)
}
