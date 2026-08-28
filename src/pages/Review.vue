<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper, UniversalQuestion, QuestionType } from "@/types"
import { getDB } from "@/lib/db"
import DiagramCropper from "@/components/review/DiagramCropper.vue"
import MathText from "@/components/MathText.vue"

/** is this option index the correct one for q? (mcq: 1-based answer, msq: 0-indexed answers[]) */
function isCorrect(q: UniversalQuestion, oi: number): boolean {
  if (q.type === "msq") return (q.answers || []).includes(String(oi))
  if (q.type === "mcq" || q.type === "true-false") return String(oi + 1) === String(q.answer).trim()
  return false
}

const showRendered = ref(true)
/** short options → compact 2×2 grid; long ones stack full-width */
function optionsCompact(q: UniversalQuestion): boolean {
  return !!q.options?.length && q.options.every((o) => (o || "").length <= 26)
}
import gsap from "gsap"
import katex from "katex"
import { t } from "@/lib/i18n"

const router = useRouter()
const paper = ref<UniversalPaper | null>(null)
const pdfName = ref<string | null>(null)
const pdfBuffer = ref<ArrayBuffer | null>(null)
const cropFor = ref<number | null>(null)
const selIdx = ref(0)
const showPanel = ref(false) // collapsed by default — expand via toolbar or edge rail
const showMobileNav = ref(false)
const showMobileVal = ref(false)
const showExportDialog = ref(false)
const exportFormat = ref('student') // 'student' | 'teacher' | 'blank'
const exportBusy = ref(false)

/* ── Session dirty-tracking ── */
const dirtyIds = ref<Set<number>>(new Set())
function markDirty(idx?: number) {
  const s = new Set(dirtyIds.value)
  s.add(idx ?? selIdx.value)
  dirtyIds.value = s
  autoSave()
}
const dirtyCount = computed(() => dirtyIds.value.size)

let saveTimer: ReturnType<typeof setTimeout> | null = null
function autoSave() {
  if (saveTimer) clearTimeout(saveTimer)
  saveTimer = setTimeout(() => {
    if (!paper.value) return
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(paper.value))
    getDB().papers.put({ id: "review", paper: paper.value, updatedAt: Date.now() })
  }, 500)
}
watch(paper, () => { if (paper.value) autoSave() }, { deep: true })

onMounted(async () => {
  setTimeout(() => gsap.from(".rev-zone", { y: 26, opacity: 0, duration: 0.55, stagger: 0.07, ease: "power2.out" }), 100)
  const raw = localStorage.getItem("rpdf2cbt-review")
  if (raw) {
    try { paper.value = JSON.parse(raw) } catch {}
  } else {
    const rec = await getDB().papers.get("review")
    if (rec) paper.value = rec.paper
  }
  pdfName.value = localStorage.getItem("rpdf2cbt-pdf-name")
  try {
    const rec = await getDB().pdfs.get("__pdf")
    // keep a pristine master copy — pdf.js transfers buffers to its worker
    if (rec?.buffer && rec.buffer.byteLength > 0) {
      const master = new Uint8Array(rec.buffer.byteLength)
      master.set(new Uint8Array(rec.buffer))
      pdfBuffer.value = master.buffer
    }
  } catch {}
  // Ctrl+K → focus search
  const onKey = (e: KeyboardEvent) => {
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault()
      searchInputRef.value?.focus()
    }
    if (e.key === '/' && !(e.target instanceof HTMLInputElement) && !(e.target instanceof HTMLTextAreaElement)) {
      e.preventDefault()
      searchInputRef.value?.focus()
    }
    if (e.key === 'Escape' && searchQuery.value) {
      searchQuery.value = ""
    }
  }
  window.addEventListener('keydown', onKey)
  // store for cleanup
  ;(window as any).__revSearchKey = onKey
})

onBeforeUnmount(() => {
  const k = (window as any).__revSearchKey
  if (k) window.removeEventListener('keydown', k)
})

function updateQ(idx: number, patch: Partial<UniversalQuestion>) {
  if (!paper.value) return
  paper.value.questions[idx] = { ...paper.value.questions[idx], ...patch }
  markDirty(idx)
}

function toggleDiagram(idx: number) {
  if (!paper.value) return
  const q = paper.value.questions[idx]
  updateQ(idx, { hasDiagram: !q.hasDiagram })
}

async function saveAndGoTest() {
  if (!paper.value) return
  paper.value.meta.totalQuestions = paper.value.questions.length
  localStorage.setItem("rpdf2cbt-review", JSON.stringify(paper.value))
  localStorage.setItem("rpdf2cbt-current", JSON.stringify(paper.value))
  // paper.value is a deep reactive Proxy — IndexedDB structured-clone rejects it.
  await getDB().papers.put({ id: "current", paper: JSON.parse(JSON.stringify(paper.value)), updatedAt: Date.now() })
  router.push("/test")
}

function cropPlaceholder(idx: number) {
  cropFor.value = idx
}
function onCropped(url: string) {
  if (cropFor.value === null || !paper.value) return
  const idx = cropFor.value
  const q = paper.value.questions[idx]
  const next = q.diagrams ? [...q.diagrams] : []
  next.push(url)
  updateQ(idx, { diagrams: next, hasDiagram: true })
  cropFor.value = null
}

/* ── Selection helpers ── */
const q = computed<UniversalQuestion | undefined>(() => paper.value?.questions[selIdx.value])
const totalQ = computed(() => paper.value?.questions.length ?? 0)
const hasPrev = computed(() => selIdx.value > 0)
const hasNext = computed(() => selIdx.value < totalQ.value - 1)
function prev() { if (hasPrev.value) selIdx.value-- }
function next() { if (hasNext.value) selIdx.value++ }

/* ── Sidebar filters ── */
const TYPE_FILTERS = computed(() => [
  { value: "all", label: t("review.filter.all") },
  { value: "mcq", label: t("review.filter.mcq") },
  { value: "msq", label: t("review.filter.msq") },
  { value: "nat", label: t("review.filter.nat") },
  { value: "true-false", label: t("review.filter.tf") },
  { value: "fill-blank", label: t("review.filter.fill") },
  { value: "match", label: t("review.filter.match") },
  { value: "other", label: t("review.filter.other") },
])
const KNOWN_TYPES = ["mcq", "msq", "nat", "true-false", "fill-blank", "match"]
const TYPE_OPTIONS = computed<{ value: QuestionType; label: string }[]>(() => [
  { value: "mcq", label: t("review.type.mcq") },
  { value: "msq", label: t("review.type.msq") },
  { value: "nat", label: t("review.type.nat") },
  { value: "true-false", label: t("review.type.tf") },
  { value: "fill-blank", label: t("review.type.fill") },
  { value: "match", label: t("review.type.match") },
  { value: "assertion-reason", label: t("review.type.ar") },
  { value: "passage", label: t("review.type.passage") },
  { value: "essay", label: t("review.type.essay") },
])
const typeFilter = ref("all")
const diagramsOnly = ref(false)
const searchQuery = ref("")
const searchInputRef = ref<HTMLInputElement | null>(null)

const filteredQuestions = computed<{ i: number; q: UniversalQuestion }[]>(() => {
  if (!paper.value) return []
  const sq = searchQuery.value.trim().toLowerCase()
  return paper.value.questions
    .map((qq, i) => ({ i, q: qq }))
    .filter(({ q }) => {
      if (typeFilter.value !== "all") {
        if (typeFilter.value === "other") { if (KNOWN_TYPES.includes(q.type)) return false }
        else if (q.type !== typeFilter.value) return false
      }
      if (diagramsOnly.value && !(q.hasDiagram || (q.diagrams?.length ?? 0) > 0)) return false
      if (sq) {
        const hay = `${q.number} ${q.text} ${q.subject || ""} ${q.topic || ""} ${(q.options||[]).join(" ")}`.toLowerCase()
        if (!hay.includes(sq)) return false
      }
      return true
    })
})

/* ── Validation issues ── */
interface Issue { index: number; level: "error" | "warn"; msg: string }
const valIssues = computed<Issue[]>(() => {
  const out: Issue[] = []
  if (!paper.value) return out
  paper.value.questions.forEach((qq, i) => {
    const ans = (qq.answer ?? "").trim()
    if (!ans) out.push({ index: i, level: "error", msg: `Q${qq.number} — ${t("review.val.noAnswer")}` })
    if (qq.type === "mcq" && (!qq.options || qq.options.length === 0)) out.push({ index: i, level: "error", msg: `Q${qq.number} — ${t("review.val.noOptions")}` })
    if (qq.type === "msq" && (!qq.answers || qq.answers.length === 0)) out.push({ index: i, level: "error", msg: `Q${qq.number} — ${t("review.val.msqEmpty")}` })
    if (qq.type === "nat" && ans && isNaN(Number(ans))) out.push({ index: i, level: "warn", msg: `Q${qq.number} — ${t("review.val.natNotNumeric")}` })
    if (!qq.subject) out.push({ index: i, level: "warn", msg: `Q${qq.number} — ${t("review.val.noSubject")}` })
  })
  return out
})
const errCount = computed(() => valIssues.value.filter((x) => x.level === "error").length)
const warnCount = computed(() => valIssues.value.filter((x) => x.level === "warn").length)

function jumpTo(i: number) { selIdx.value = i }
function jumpToMobile(i: number) { selIdx.value = i; showMobileNav.value = false; showMobileVal.value = false }

/* ── Export to PDF — window.print primary (never blank), html2pdf fallback ── */
async function exportPDF() {
  if (!paper.value) return
  exportBusy.value = true
  try {
    const el = buildExportHTML()
    // Try window.print first — 100% reliable, no html2canvas blank
    const w = window.open('', '_blank')
    if (w) {
      w.document.write(`<!doctype html><html><head><meta charset="utf-8"><title>${esc(paper.value.meta.title || 'paper')} — ${exportFormat.value}</title><link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css"><style>body{margin:0;padding:20px;font-family:system-ui,Segoe UI,sans-serif;color:#23203a;background:#fff} @media print{body{padding:0} @page{margin:12mm} .no-print{display:none}} img{max-width:100%}</style></head><body>${el.innerHTML}<script>setTimeout(()=>{focus();print()}, 400)<\/script></body></html>`)
      w.document.close()
      exportBusy.value = false
      showExportDialog.value = false
      return
    }
    // Fallback: html2pdf if popup blocked
    let wrapper: HTMLElement | null = null
    try {
      const { default: html2pdf } = await import('html2pdf.js')
      wrapper = document.createElement('div')
      // keep in viewport but invisible — html2canvas can't capture left:-9999px (blank bug)
      wrapper.style.cssText = 'position:absolute;left:0;top:0;width:210mm;background:#fff;opacity:0;pointer-events:none;z-index:-1;overflow:visible;'
      wrapper.appendChild(el)
      document.body.appendChild(wrapper)
      const imgs = Array.from(el.querySelectorAll('img')) as HTMLImageElement[]
      await Promise.all(imgs.map(img => img.complete && img.naturalWidth > 0 ? Promise.resolve() : new Promise<void>(res => {
        const t = setTimeout(() => res(), 2500)
        img.onload = () => { clearTimeout(t); res() }
        img.onerror = () => { clearTimeout(t); res() }
      })))
      if ((document as any).fonts?.ready) { try { await (document as any).fonts.ready } catch {} }
      await new Promise(r => setTimeout(r, 280))
      const fnameBase = (paper.value.meta.title || 'question-paper').replace(/[^a-z0-9\-_ ]/gi, '_').slice(0, 48)
      await (html2pdf() as any).set({
        margin: 10,
        filename: `${fnameBase}-${exportFormat.value}.pdf`,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, allowTaint: true, backgroundColor: '#ffffff', scrollX: 0, scrollY: 0, logging: false, windowWidth: el.scrollWidth },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
        pagebreak: { mode: ['css', 'legacy'] },
      }).from(el).save()
      if (wrapper.parentNode) document.body.removeChild(wrapper)
    } catch (e) {
      if (wrapper?.parentNode) document.body.removeChild(wrapper as HTMLElement)
      throw e
    }
  } catch (e) {
    console.error('Export failed', e)
    alert('PDF failed — please use Ctrl+P → Save as PDF, or allow popups and try again.')
  } finally {
    exportBusy.value = false
    showExportDialog.value = false
  }
}

function buildExportHTML() {
  const p = paper.value!
  const mode = exportFormat.value // 'student' | 'teacher' | 'blank'
  // Spec: student = ticked + inline/ highlighted; teacher = NO tick, key at end; blank = nothing
  const isStudent = mode === 'student'
  const isTeacher = mode === 'teacher'
  const showTick = isStudent
  const showInlineAnswer = isStudent
  const answersAtEnd = isTeacher

  const div = document.createElement('div')
  // 210mm container — html2pdf clones computed styles, so width + padding reliable
  div.style.cssText = 'font-family: system-ui, -apple-system, Segoe UI, sans-serif; color:#23203a; background:#fff; padding:18px 20px; width:100%; box-sizing:border-box; font-size:13px; line-height:1.55;'

  let html = `
    <div style="text-align:center; margin-bottom:20px; border-bottom:2px solid #23203a18; padding-bottom:14px;">
      <div style="font-size:20px; font-weight:800; letter-spacing:-0.03em; line-height:1.2;">${esc(p.meta.title)}</div>
      <div style="font-size:10.5px; color:#23203a70; margin-top:6px; text-transform:uppercase; letter-spacing:0.14em;">
        ${esc(p.meta.exam || 'Question Paper')} · ${p.meta.durationMinutes} min · ${p.questions.length} questions${p.meta.totalMarks ? ' · ' + p.meta.totalMarks + ' marks' : ''}
      </div>
      ${isStudent ? '<div style="display:inline-block;margin-top:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#1FA45C;background:#1FA45C12;border:1px solid #1FA45C30;padding:3px 8px;border-radius:999px;">Student Copy — Answers Highlighted</div>' : ''}
      ${isTeacher ? '<div style="display:inline-block;margin-top:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#2F5FE0;background:#2F5FE012;border:1px solid #2F5FE030;padding:3px 8px;border-radius:999px;">Teacher Copy — Answer Key at End</div>' : ''}
      ${mode === 'blank' ? '<div style="display:inline-block;margin-top:8px;font-size:10px;font-weight:700;letter-spacing:0.08em;text-transform:uppercase;color:#23203a60;background:#23203a08;border:1px solid #23203a15;padding:3px 8px;border-radius:999px;">Blank Paper — No Answers</div>' : ''}
    </div>
  `

  // build answer map once (for inline and key)
  const ansMap: Record<string, string> = {}
  p.questions.forEach(q => {
    if (q.type === 'msq') {
      const letters = (q.answers || []).map(i => String.fromCharCode(65 + Number(i))).join(', ')
      ansMap[q.id] = letters || '—'
    } else if (q.options && q.options.length > 0 && /^\d+$/.test(String(q.answer ?? '').trim())) {
      const idx = Number(String(q.answer).trim()) - 1
      const letter = String.fromCharCode(65 + idx)
      const txt = q.options[idx] ? ` ${esc(q.options[idx].slice(0, 70))}` : ''
      ansMap[q.id] = `${letter}.${txt}`
    } else if (q.answer && String(q.answer).trim()) {
      ansMap[q.id] = esc(String(q.answer).trim().slice(0, 120))
    } else {
      ansMap[q.id] = '—'
    }
  })

  p.questions.forEach((q, qi) => {
    const opts = q.options || []
    const hasOpts = opts.length > 0
    const isMCQ = q.type === 'mcq' || q.type === 'true-false'
    const isMSQ = q.type === 'msq'

    const optsHTML = hasOpts ? opts.map((o, oi) => {
      const letter = String.fromCharCode(65 + oi)
      const isAns = isMSQ
        ? (q.answers || []).includes(String(oi))
        : isMCQ ? String(oi + 1) === String(q.answer ?? '').trim() : false
      const tick = showTick && isAns ? ' <span style="color:#1FA45C;font-weight:800;">✓</span>' : ''
      const rowBg = showTick && isAns ? 'background:#1FA45C0f;border-color:#1FA45C45;' : 'background:#fff;border-color:#23203a12;'
      return `<div style="display:flex;gap:8px;align-items:flex-start;padding:6px 10px;margin:4px 0 0 18px;border:1px solid #23203a12;border-radius:8px;${rowBg}">${`<span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:700;min-width:18px;color:${showTick && isAns ? '#1FA45C' : '#23203a55'}">${letter}.</span>`}<span style="flex:1;min-width:0;word-break:break-word;">${renderLatex(o || '')}${tick}</span></div>`
    }).join('') : ''

    // inline answer: only student (ticked) — NAT/fill also shown there
    let answerLine = ''
    if (showInlineAnswer) {
      if (hasOpts) {
        answerLine = `<div style="margin:6px 0 0 18px;font-size:11px;color:#1FA45C;"><span style="font-weight:700;">Answer:</span> ${ansMap[q.id]}</div>`
      } else if (String(q.answer || '').trim()) {
        answerLine = `<div style="margin:6px 0 0 18px;font-size:11px;color:#1FA45C;"><span style="font-weight:700;">Answer:</span> ${ansMap[q.id]}</div>`
      }
    }

    // NAT/fill hint when blank/teacher (no inline answer)
    let blankLine = ''
    if (!showInlineAnswer && !hasOpts && (q.type === 'nat' || q.type === 'fill-blank')) {
      blankLine = `<div style="margin:8px 0 0 18px;border-bottom:1px dashed #23203a30;height:18px;"></div>`
    }

    const diagHTML = (q.diagrams || []).map(d =>
      `<div style="margin:8px 0 0 18px;"><img src="${d}" style="max-height:150px;max-width:100%;border:1px solid #23203a14;border-radius:8px;display:block;" /></div>`
    ).join('')

    // passage / match rendering: keep full text; options handled above
    html += `
      <div style="page-break-inside:avoid; margin-bottom:12px; padding:12px 12px 10px; border:1px solid #23203a10; border-radius:10px; background:${qi % 2 === 0 ? '#FBF8F1' : '#fff'};">
        <div style="display:flex;gap:8px;align-items:flex-start;">
          <span style="font-family:ui-monospace,monospace;font-size:11px;font-weight:800;background:#23203a;color:#fff;padding:2px 7px;border-radius:999px;white-space:nowrap;">Q${q.number}</span>
          <span style="flex:1;min-width:0;font-size:13px;line-height:1.5;word-break:break-word;">${renderLatex(q.text)}</span>
          <span style="font-size:10px;color:#23203a55;white-space:nowrap;margin-left:6px;">[${q.type.toUpperCase()}]</span>
        </div>
        ${diagHTML}
        ${optsHTML}
        ${answerLine}
        ${blankLine}
        <div style="font-size:10px;color:#23203a55;margin-top:6px;padding-left:18px;">${esc(q.subject || 'General')}${q.topic ? ' · ' + esc(q.topic) : ''} · ${q.marks} mark${q.marks !== 1 ? 's' : ''}${q.negativeMarks ? ' · −' + q.negativeMarks : ''}${q.pageNo ? ' · p.' + q.pageNo : ''}</div>
      </div>
    `
  })

  if (answersAtEnd) {
    html += `
      <div style="page-break-before:always; margin-top:18px; padding-top:14px; border-top:2.5px solid #23203a18;">
        <div style="font-size:15px; font-weight:800; letter-spacing:-0.02em; margin-bottom:10px;">Answer Key — Teacher Copy</div>
        <div style="columns:2; column-gap:18px;">
    `
    p.questions.forEach(q => {
      html += `<div style="break-inside:avoid; padding:4px 0; font-size:11.5px; border-bottom:1px dashed #23203a10; display:flex; gap:8px;"><span style="font-family:ui-monospace,monospace;font-weight:700;min-width:36px;">Q${q.number}.</span><b style="flex:1; word-break:break-word;">${ansMap[q.id]}</b></div>`
    })
    html += `</div></div>`
  }

  html += `
    <div style="text-align:center; margin-top:18px; font-size:9.5px; color:#23203a35; border-top:1px solid #23203a0e; padding-top:8px;">
      Generated by Rankify PDF2CBT · rankify-pdf2cbt.vercel.app
    </div>
  `

  div.innerHTML = html
  return div
}

function renderLatex(text: string): string {
  if (!text) return ''
  let out = esc(text)
  // render display math $$...$$
  out = out.replace(/\$\$([\s\S]*?)\$\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: true, throwOnError: false }) } catch { return tex }
  })
  // render inline math $...$
  out = out.replace(/\$([^$]+?)\$/g, (_, tex) => {
    try { return katex.renderToString(tex.trim(), { displayMode: false, throwOnError: false }) } catch { return tex }
  })
  return out
}

function esc(s: string) {
  const d = document.createElement('div')
  d.textContent = s || ''
  return d.innerHTML
}
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans">
    <AppNav />

    <!-- ═══ No paper yet ═══ -->
    <div v-if="!paper" class="max-w-5xl mx-auto px-5 pt-28 pb-16">
      <button class="min-h-[40px] px-3 py-2 rounded-lg text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/extract')">{{ t('review.backExtract') }}</button>
      <div class="mt-8 relative rounded-lg bg-white p-10 text-center shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
        <div class="tape" aria-hidden="true"></div>
        <img src="/images/notebook/empty-extract.webp" alt="" class="w-40 mx-auto mb-4" loading="lazy" />
        <p class="font-display font-bold text-xl">{{ t('review.empty.title') }}</p>
        <p class="text-ink/55 mt-1.5 text-[15px] break-words">{{ t('review.empty.sub') }}</p>
        <button class="mt-5 min-h-[40px] px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">{{ t('review.empty.cta') }}</button>
      </div>
    </div>

    <!-- ═══ 3-zone review workspace ═══ -->
    <template v-else>
      <div class="max-w-[1700px] mx-auto px-5 pt-24 pb-24 lg:pb-4">
        <!-- sticky toolbar -->
        <div class="sticky top-[88px] z-30 flex flex-wrap items-center justify-between gap-2 lg:gap-3 rounded-xl bg-white px-3 lg:px-4 py-2.5 shadow-[0_14px_40px_-22px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.06]">
          <div class="flex items-center gap-2 lg:gap-3 min-w-0 flex-1">
            <button class="min-h-[40px] px-2 lg:px-0 text-sm font-medium text-ink/50 hover:text-ink transition-colors shrink-0" @click="router.push('/extract')">{{ t('review.back') }}</button>
            <span class="h-5 w-px bg-ink/10 shrink-0 hidden sm:block"></span>
            <h1 class="font-display font-extrabold tracking-tight text-lg lg:text-xl shrink-0 truncate" :title="pdfName ?? undefined">{{ t('review.title') }}</h1>
            <span v-if="pdfName" class="font-hand text-lg text-ink/40 truncate max-w-32 lg:max-w-52 hidden xl:inline break-all">{{ pdfName }}</span>
          </div>
          <div class="flex items-center gap-2 lg:gap-2.5 flex-wrap">
            <span v-if="dirtyCount" class="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-hlyellow/60 text-ink break-words">{{ dirtyCount }} {{ t('review.edited') }}</span>
            <button :class="['min-h-[40px] px-3 lg:px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-colors', showRendered ? 'border-pen/40 bg-pen/[0.06] text-pen' : 'border-ink/12 text-ink/60 hover:text-ink']" @click="showRendered = !showRendered">{{ showRendered ? "◉ " + t('review.toggleRendered') : "◌ " + t('review.toggleRaw') }}</button>
            <button class="min-h-[40px] px-4 lg:px-5 py-2 rounded-xl bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5 break-words" @click="saveAndGoTest">{{ t('review.saveStart') }}</button>
            <button class="min-h-[40px] px-3.5 lg:px-4 py-2 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors break-words" @click="showExportDialog = true">⤓ {{ t('review.export') }}</button>
            <button :class="['min-h-[40px] hidden lg:inline-flex items-center px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-colors', showPanel ? 'border-pen/40 bg-pen/[0.06] text-pen' : 'border-ink/12 text-ink/60 hover:text-ink']" @click="showPanel = !showPanel">{{ t('review.validation') }}</button>
          </div>
        </div>

        <!-- zones -->
        <div class="mt-3 flex flex-col lg:flex-row gap-4 lg:h-[calc(100vh-11.5rem)] min-h-[420px]">
          <!-- a) LEFT SIDEBAR — desktop only -->
          <aside class="rev-zone hidden lg:flex w-72 shrink-0 flex-col rounded-xl bg-white shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06] overflow-hidden">
            <div class="p-3 border-b border-ink/[0.08] space-y-2.5">
              <div class="relative">
                <input ref="searchInputRef" v-model="searchQuery" placeholder="Search (Ctrl+K / /)…" class="w-full border border-ink/12 rounded-lg pl-8 pr-7 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 placeholder:text-ink/30" />
                <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30 text-sm">⌕</span>
                <button v-if="searchQuery" @click="searchQuery=''" class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center text-ink/40 hover:text-ink text-xs">✕</button>
              </div>
              <select v-model="typeFilter" class="w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 min-h-[40px]">
                <option v-for="f in TYPE_FILTERS" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
              <label class="flex items-center gap-2 text-xs font-medium text-ink/65 cursor-pointer select-none min-h-[40px]">
                <input type="checkbox" v-model="diagramsOnly" class="accent-pen" /> {{ t('review.diagramsOnly') }}
              </label>
              <div v-if="searchQuery" class="font-mono text-[10px] text-ink/45">{{ filteredQuestions.length }} match{{ filteredQuestions.length===1?'':'es' }} · Esc to clear</div>
            </div>

            <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
              <button
                v-for="{ i, q: item } in filteredQuestions"
                :key="item.id"
                class="relative w-full text-left rounded-lg bg-white ring-1 overflow-hidden transition-all group min-h-[40px]"
                :class="selIdx === i ? 'ring-pen border-pen bg-pen/[0.05]' : 'ring-ink/[0.08] hover:ring-ink/25'"
                @click="jumpTo(i)"
              >
                <span
                  class="absolute inset-y-0 left-0 w-1"
                  :class="!(item.answer ?? '').trim() ? 'bg-redmargin' : item.hasDiagram ? 'bg-hlyellow' : 'bg-transparent'"
                  aria-hidden="true"
                ></span>
                <div class="px-2.5 py-2 pl-4">
                  <div class="flex items-center gap-1.5 flex-wrap">
                    <span class="font-mono text-[11px] font-bold bg-paper border border-ink/10 rounded px-1.5 py-0.5">Q{{ item.number }}</span>
                    <span class="font-mono text-[9px] uppercase tracking-wider bg-ink/[0.06] text-ink/60 rounded px-1.5 py-0.5 break-words">{{ item.type }}</span>
                    <span v-if="item.pageNo" class="font-mono text-[10px] bg-hlyellow/60 text-ink rounded px-1.5 py-0.5">p.{{ item.pageNo }}</span>
                    <span v-if="item.diagrams?.length || item.hasDiagram" class="ml-auto w-1.5 h-1.5 rounded-full bg-hlgreen shrink-0" aria-hidden="true"></span>
                  </div>
                  <p class="mt-1.5 text-xs leading-snug text-ink/75 line-clamp-2 break-words">{{ item.text || '—' }}</p>
                </div>
              </button>
              <p v-if="!filteredQuestions.length" class="text-xs text-ink/45 text-center py-6 break-words">{{ t('review.noMatch') }}</p>
            </div>

            <div class="px-3 py-2 border-t border-ink/[0.08] font-mono text-[10px] text-ink/45 break-words">{{ filteredQuestions.length }}/{{ totalQ }} {{ t('review.questionCount') }}</div>
          </aside>

          <!-- b) CENTER EDITOR -->
          <main class="rev-zone relative flex-1 min-w-0 overflow-visible lg:overflow-y-auto rounded-xl bg-white p-4 lg:p-6 shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06] break-words">
            <template v-if="q">
              <div class="sticky -top-4 -mx-4 -mt-4 lg:-top-6 lg:-mx-6 lg:-mt-6 px-4 lg:px-6 py-3.5 bg-white/95 backdrop-blur border-b border-ink/[0.08] flex items-center justify-between gap-2 lg:gap-3 z-10 rounded-t-xl">
                <div class="font-mono text-[10px] lg:text-[11px] tracking-wider text-ink/50 uppercase truncate min-w-0 break-words">Q{{ q.number }} · {{ q.type }} · {{ q.subject || t('review.noSubject') }}<span v-if="q.pageNo" class="ml-2 bg-hlyellow/60 text-ink px-1.5 py-0.5 rounded normal-case">p.{{ q.pageNo }}</span></div>
                <div class="flex gap-2 shrink-0">
                  <button :disabled="!hasPrev" class="min-h-[40px] px-3 py-1.5 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" @click="prev">{{ t('review.prev') }}</button>
                  <button :disabled="!hasNext" class="min-h-[40px] px-3 py-1.5 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" @click="next">{{ t('review.next') }}</button>
                </div>
              </div>

              <input v-model="paper!.meta.title" class="mt-4 w-full min-w-0 border border-ink/12 rounded-lg px-3.5 py-2.5 font-semibold text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 break-words" :placeholder="t('review.phTitle')" />

              <div v-if="showRendered" class="mt-3 w-full border border-ink/12 rounded-xl p-3.5 text-[15px] leading-relaxed bg-white min-h-[104px] cursor-text break-words overflow-hidden" :title="t('review.titleClickEdit')" @click="showRendered = false">
                <MathText :text="q.text || ''" />
              </div>
              <textarea v-else v-model="q.text" rows="4" class="mt-3 w-full min-w-0 border border-ink/12 rounded-xl p-3 text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 font-mono text-[13px] break-words" :placeholder="t('review.phQuestion')" @input="markDirty()"></textarea>

              <div class="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <label class="block min-w-0">
                  <span class="text-xs font-semibold text-ink/60 break-words">{{ t('review.field.type') }}</span>
                  <select :value="q.type" class="mt-1 w-full min-w-0 border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 min-h-[40px]" @change="q.type = ($event.target as HTMLSelectElement).value as QuestionType; markDirty()">
                    <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </label>
                <label class="block min-w-0">
                  <span class="text-xs font-semibold text-ink/60 break-words">{{ t('review.field.subject') }}</span>
                  <input v-model="q.subject" class="mt-1 w-full min-w-0 border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 break-words" :placeholder="t('review.phSubject')" @input="markDirty()" />
                </label>
                <label class="block min-w-0">
                  <span class="text-xs font-semibold text-ink/60 break-words">{{ t('review.field.section') }}</span>
                  <input v-model="q.section" class="mt-1 w-full min-w-0 border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 break-words" :placeholder="t('review.phSection')" @input="markDirty()" />
                </label>
                <label class="block min-w-0">
                  <span class="text-xs font-semibold text-ink/60 break-words">{{ t('review.field.topic') }}</span>
                  <input v-model="q.topic" class="mt-1 w-full min-w-0 border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 break-words" :placeholder="t('review.phTopic')" @input="markDirty()" />
                </label>
              </div>

              <div v-if="q.options" class="mt-4 grid gap-1.5 min-w-0">
                <div class="flex items-center justify-between gap-2 flex-wrap">
                  <span class="text-xs font-bold text-ink/70 break-words">{{ t('review.options') }}</span>
                  <label class="flex items-center gap-1.5 text-xs font-medium text-ink/60 cursor-pointer min-h-[40px]">
                    <input type="checkbox" :checked="q.hasDiagram" @change="toggleDiagram(selIdx)" class="accent-pen" /> {{ t('review.hasDiagram') }}
                  </label>
                </div>
                <div :class="optionsCompact(q) ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'grid gap-1.5'">
                  <div v-for="(opt, oi) in q.options" :key="oi" :class="['rounded-xl border transition-colors min-w-0 overflow-hidden', isCorrect(q, oi) ? 'border-correct/60 bg-correct/[0.06]' : 'border-ink/10 bg-paper hover:border-ink/25']">
                    <div class="flex items-center gap-2 px-2.5 py-2 min-h-[40px]">
                      <span :class="['font-mono text-xs w-5 shrink-0', isCorrect(q, oi) ? 'text-green-700 font-bold' : 'text-ink/45']">{{ String.fromCharCode(65+oi) }}.</span>
                      <span v-if="showRendered" class="flex-1 min-w-0 text-sm text-ink cursor-text break-words break-all [&_.katex]:text-[0.98em]" :title="t('review.clickToEdit') + opt" @click="showRendered = false"><MathText :text="opt" /></span>
                      <input v-else :value="opt" @input="q.options![oi] = ($event.target as HTMLInputElement).value; markDirty()" class="flex-1 min-w-0 bg-transparent text-sm text-ink focus:outline-none break-words" :placeholder="t('review.phOption')" />
                      <span v-if="isCorrect(q, oi)" class="shrink-0 px-1.5 py-0.5 rounded-full bg-correct text-white font-mono text-[8px] font-bold">✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2.5 items-center text-sm">
                <span class="text-xs font-semibold text-ink/60 break-words">{{ t('review.answer') }}</span>
                <input v-model="q.answer" class="min-h-[40px] border border-ink/12 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phAnswer')" @input="markDirty()" />
                <span v-if="q.type==='msq'" class="text-xs font-semibold text-ink/60 flex items-center gap-1.5 flex-wrap break-words">{{ t('review.answersLabel') }}<input :value="(q.answers||[]).join(',')" @input="q.answers = ($event.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean); markDirty()" class="min-h-[40px] border border-ink/12 rounded-lg px-2 py-1.5 text-xs w-28 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" /></span>
                <span class="ml-auto text-xs font-semibold text-ink/60 flex items-center gap-1.5 flex-wrap break-words">{{ t('review.marks') }} <input v-model.number="q.marks" type="number" class="min-h-[40px] w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" @input="markDirty()" /> {{ t('review.negative') }} <input v-model.number="q.negativeMarks" type="number" class="min-h-[40px] w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" @input="markDirty()" /></span>
              </div>

              <!-- Manual crop per question -->
              <div class="mt-5 border-t border-dashed border-ink/15 pt-3.5">
                <div class="text-xs font-bold text-ink/70 break-words">{{ t('review.diagramCrop') }}</div>
                <div v-if="q.diagrams?.length" class="mt-2.5 flex gap-2.5 flex-wrap">
                  <div v-for="(d,didx) in q.diagrams" :key="didx" class="relative group">
                    <img :src="d" class="w-28 rounded-lg border border-ink/10" loading="lazy" decoding="async" />
                    <button class="absolute -top-1.5 -right-1.5 bg-redmargin text-white rounded-full w-6 h-6 min-w-[24px] min-h-[24px] grid place-items-center text-xs shadow" @click="q.diagrams!.splice(didx,1); markDirty()">×</button>
                  </div>
                </div>
                <button class="mt-2.5 min-h-[40px] px-4 py-2 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors break-words" @click="cropPlaceholder(selIdx)">{{ q.hasDiagram ? t('review.cropAdd') : t('review.cropBtn') }}</button>
                <p class="font-hand text-lg text-ink/45 mt-1 break-words">{{ t('review.cropHint') }}</p>
              </div>
            </template>
            <div v-else class="h-full grid place-items-center">
              <p class="text-sm text-ink/45 break-words">{{ t('review.selectQ') }}</p>
            </div>
          </main>

          <!-- c) RIGHT VALIDATION PANEL — desktop collapsible -->
          <button v-if="!showPanel" @click="showPanel = true" class="rev-zone hidden lg:flex flex-col items-center gap-2 px-2 py-4 self-stretch rounded-xl bg-white ring-1 ring-ink/[0.06] hover:ring-pen/40 transition-all min-h-[40px]" :title="t('review.titleShowVal')">
            <span class="font-mono text-[10px] font-bold tracking-widest text-ink/50 break-words" style="writing-mode: vertical-rl;">{{ t('review.valVertical') }}</span>
            <span :class="['w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold', errCount ? 'bg-redmargin/15 text-redmargin' : 'bg-correct/15 text-green-700']">{{ errCount || warnCount || "✓" }}</span>
          </button>
          <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -mr-80" leave-active-class="transition-all duration-200 ease-in" leave-to-class="opacity-0 -mr-80">
            <aside v-show="showPanel" class="rev-zone hidden lg:flex w-80 shrink-0 flex-col rounded-xl bg-white shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06] overflow-hidden">
            <div class="px-4 py-3 border-b border-ink/[0.08] bg-paper/60 flex items-start justify-between gap-2">
              <div class="min-w-0">
                <div class="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50 break-words">{{ t('review.valHeader') }}</div>
                <div class="mt-1.5 flex gap-2 text-[11px] font-bold flex-wrap">
                  <span :class="errCount ? 'bg-redmargin/[0.12] text-redmargin' : 'bg-correct/[0.12] text-green-700'" class="px-2 py-0.5 rounded-full break-words">{{ errCount }} {{ t('review.errors') }}</span>
                  <span :class="warnCount ? 'bg-hlyellow/50 text-ink' : 'bg-ink/[0.05] text-ink/45'" class="px-2 py-0.5 rounded-full break-words">{{ warnCount }} {{ t('review.warnings') }}</span>
                </div>
              </div>
              <button @click="showPanel = false" :title="t('review.titleCollapse')" class="shrink-0 w-8 h-8 min-w-[32px] min-h-[32px] rounded-lg hover:bg-ink/5 grid place-items-center text-ink/45">»</button>
            </div>
            <div class="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              <template v-if="valIssues.length">
                <button
                  v-for="(iss, ii) in valIssues"
                  :key="ii"
                  class="w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-xs transition-colors min-h-[40px] break-words"
                  :class="[iss.level === 'error' ? 'bg-redmargin/[0.07] border-redmargin/25 hover:border-redmargin/60' : 'bg-hlyellow/[0.18] border-hlyellow/60 hover:border-hlyellow', selIdx === iss.index ? 'ring-2 ring-pen/40' : '']"
                  @click="jumpTo(iss.index)"
                >
                  <span class="mt-1 w-1.5 h-1.5 rounded-full shrink-0" :class="iss.level === 'error' ? 'bg-redmargin' : 'bg-hlyellow'" aria-hidden="true"></span>
                  <span class="text-ink/80 leading-snug break-words break-all">{{ iss.msg }}</span>
                </button>
              </template>
              <div v-else class="mt-8 text-center">
                <div class="mx-auto w-10 h-10 rounded-full bg-correct/[0.12] grid place-items-center text-green-700 font-bold">✓</div>
                <p class="mt-2.5 text-sm font-display font-bold break-words">{{ t('review.allPass') }}</p>
                <p class="text-xs text-ink/45 mt-1 break-words">{{ t('review.allPassSub') }}</p>
              </div>
            </div>
          </aside>
          </transition>
        </div>
      </div>

      <!-- Mobile floating drawer triggers — visible only < lg -->
      <div class="fixed bottom-4 left-4 right-4 z-40 flex justify-between gap-3 lg:hidden pointer-events-none">
        <button @click="showMobileNav = true" class="pointer-events-auto min-h-[44px] px-5 py-3 rounded-full bg-ink text-white text-sm font-bold shadow-lg flex items-center gap-2 break-words">
          ☰ {{ t('review.filter.all') }} <span class="bg-white/20 px-2 py-0.5 rounded-full text-xs font-mono">{{ filteredQuestions.length }}</span>
        </button>
        <button @click="showMobileVal = true" class="pointer-events-auto min-h-[44px] px-5 py-3 rounded-full bg-white border border-ink/15 text-sm font-bold shadow-lg flex items-center gap-2 break-words">
          {{ t('review.validation') }} <span :class="['px-2 py-0.5 rounded-full text-xs font-mono', errCount ? 'bg-redmargin text-white' : warnCount ? 'bg-hlyellow text-ink' : 'bg-correct text-white']">{{ errCount || warnCount || "✓" }}</span>
        </button>
      </div>

      <!-- Mobile Questions Drawer -->
      <Teleport to="body">
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-200 ease-in" leave-to-class="opacity-0">
          <div v-if="showMobileNav" class="fixed inset-0 z-50 lg:hidden">
            <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" @click="showMobileNav = false"></div>
            <div class="absolute left-0 top-0 bottom-0 w-[88%] max-w-[360px] bg-white shadow-2xl flex flex-col overflow-hidden">
              <div class="shrink-0 p-3 border-b border-ink/[0.08] flex items-center justify-between gap-2">
                <div class="font-display font-bold text-base truncate">{{ t('review.mobileTitle') }}</div>
                <button @click="showMobileNav = false" class="min-h-[40px] min-w-[40px] w-10 h-10 rounded-full bg-paper border border-ink/10 grid place-items-center text-ink/60">✕</button>
              </div>
              <div class="shrink-0 p-3 border-b border-ink/[0.08] space-y-2.5 bg-paper/40">
                <div class="relative">
                  <input v-model="searchQuery" placeholder="Search… (Ctrl+K)" class="w-full border border-ink/12 rounded-lg pl-8 pr-7 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pen/40 placeholder:text-ink/30" />
                  <span class="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink/30 text-sm">⌕</span>
                  <button v-if="searchQuery" @click="searchQuery=''" class="absolute right-2 top-1/2 -translate-y-1/2 w-6 h-6 grid place-items-center text-ink/40 text-xs">✕</button>
                </div>
                <select v-model="typeFilter" class="w-full min-w-0 border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-pen/40 min-h-[40px]">
                  <option v-for="f in TYPE_FILTERS" :key="f.value" :value="f.value">{{ f.label }}</option>
                </select>
                <label class="flex items-center gap-2 text-xs font-medium text-ink/65 cursor-pointer select-none min-h-[40px]">
                  <input type="checkbox" v-model="diagramsOnly" class="accent-pen" /> {{ t('review.diagramsOnly') }}
                </label>
              </div>
              <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
                <button
                  v-for="{ i, q: item } in filteredQuestions"
                  :key="item.id"
                  class="relative w-full text-left rounded-lg bg-white ring-1 overflow-hidden transition-all group min-h-[40px]"
                  :class="selIdx === i ? 'ring-pen bg-pen/[0.05]' : 'ring-ink/[0.08] hover:ring-ink/25'"
                  @click="jumpToMobile(i)"
                >
                  <span class="absolute inset-y-0 left-0 w-1" :class="!(item.answer ?? '').trim() ? 'bg-redmargin' : item.hasDiagram ? 'bg-hlyellow' : 'bg-transparent'"></span>
                  <div class="px-2.5 py-2 pl-4">
                    <div class="flex items-center gap-1.5 flex-wrap">
                      <span class="font-mono text-[11px] font-bold bg-paper border border-ink/10 rounded px-1.5 py-0.5">Q{{ item.number }}</span>
                      <span class="font-mono text-[9px] uppercase tracking-wider bg-ink/[0.06] text-ink/60 rounded px-1.5 py-0.5 break-words">{{ item.type }}</span>
                      <span v-if="item.pageNo" class="font-mono text-[10px] bg-hlyellow/60 text-ink rounded px-1.5 py-0.5">p.{{ item.pageNo }}</span>
                    </div>
                    <p class="mt-1.5 text-xs leading-snug text-ink/75 line-clamp-2 break-words">{{ item.text || '—' }}</p>
                  </div>
                </button>
                <p v-if="!filteredQuestions.length" class="text-xs text-ink/45 text-center py-6 break-words">{{ t('review.noMatch') }}</p>
              </div>
              <div class="shrink-0 px-3 py-3 border-t border-ink/[0.08] flex items-center justify-between gap-2 bg-paper/40">
                <span class="font-mono text-[10px] text-ink/45 break-words">{{ filteredQuestions.length }}/{{ totalQ }} {{ t('review.questionCount') }}</span>
                <span class="font-mono text-[10px] text-ink/45">Q{{ (q?.number ?? 1) }}/{{ totalQ }}</span>
              </div>
            </div>
          </div>
        </Transition>
        <Transition enter-active-class="transition duration-300 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-200 ease-in" leave-to-class="opacity-0">
          <div v-if="showMobileVal" class="fixed inset-0 z-50 lg:hidden">
            <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" @click="showMobileVal = false"></div>
            <div class="absolute right-0 top-0 bottom-0 w-[88%] max-w-[360px] bg-white shadow-2xl flex flex-col overflow-hidden">
              <div class="shrink-0 px-4 py-3 border-b border-ink/[0.08] bg-paper/60 flex items-start justify-between gap-2">
                <div class="min-w-0">
                  <div class="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50 break-words">{{ t('review.valHeader') }}</div>
                  <div class="mt-1.5 flex gap-2 text-[11px] font-bold flex-wrap">
                    <span :class="errCount ? 'bg-redmargin/[0.12] text-redmargin' : 'bg-correct/[0.12] text-green-700'" class="px-2 py-0.5 rounded-full">{{ errCount }} {{ t('review.errors') }}</span>
                    <span :class="warnCount ? 'bg-hlyellow/50 text-ink' : 'bg-ink/[0.05] text-ink/45'" class="px-2 py-0.5 rounded-full">{{ warnCount }} {{ t('review.warnings') }}</span>
                  </div>
                </div>
                <button @click="showMobileVal = false" class="shrink-0 min-h-[40px] min-w-[40px] w-10 h-10 rounded-full bg-white border border-ink/10 grid place-items-center text-ink/60">✕</button>
              </div>
              <div class="flex-1 overflow-y-auto p-2.5 space-y-1.5">
                <template v-if="valIssues.length">
                  <button
                    v-for="(iss, ii) in valIssues"
                    :key="ii"
                    class="w-full text-left flex items-start gap-2 px-3 py-2.5 rounded-lg border text-xs transition-colors min-h-[44px] break-words"
                    :class="[iss.level === 'error' ? 'bg-redmargin/[0.07] border-redmargin/25' : 'bg-hlyellow/[0.18] border-hlyellow/60', selIdx === iss.index ? 'ring-2 ring-pen/40' : '']"
                    @click="jumpToMobile(iss.index)"
                  >
                    <span class="mt-1 w-1.5 h-1.5 rounded-full shrink-0" :class="iss.level === 'error' ? 'bg-redmargin' : 'bg-hlyellow'"></span>
                    <span class="text-ink/80 leading-snug break-words break-all flex-1">{{ iss.msg }}</span>
                  </button>
                </template>
                <div v-else class="mt-8 text-center px-4">
                  <div class="mx-auto w-10 h-10 rounded-full bg-correct/[0.12] grid place-items-center text-green-700 font-bold">✓</div>
                  <p class="mt-2.5 text-sm font-display font-bold break-words">{{ t('review.allPass') }}</p>
                  <p class="text-xs text-ink/45 mt-1 break-words">{{ t('review.allPassSub') }}</p>
                </div>
              </div>
            </div>
          </div>
        </Transition>
      </Teleport>
    </template>

    <DiagramCropper v-if="cropFor!==null && paper" :pdfBuffer="pdfBuffer" :initialPage="(paper.questions[cropFor]?.pageNo || 1)" @cropped="onCropped" @close="cropFor=null" />

    <!-- ═══════════ EXPORT DIALOG ═══════════ -->
    <Teleport to="body">
      <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0">
        <div v-if="showExportDialog" class="fixed inset-0 z-[100] flex items-center justify-center p-5">
          <div class="absolute inset-0 bg-ink/40 backdrop-blur-sm" @click="showExportDialog = false"></div>
          <div class="relative z-10 w-full max-w-md bg-white rounded-2xl shadow-[0_30px_80px_-20px_rgba(35,32,58,0.45)] ring-1 ring-ink/[0.08] p-6 space-y-5">
            <div>
              <h2 class="font-display font-extrabold text-xl tracking-tight text-ink">{{ t('export.title') }}</h2>
              <p class="mt-1 text-sm text-ink/55">{{ t('export.sub') }}</p>
            </div>

            <div class="space-y-2.5">
              <label :class="['flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all', exportFormat==='student' ? 'border-pen bg-pen/[0.05]' : 'border-ink/10 bg-paper hover:border-ink/25']">
                <input type="radio" v-model="exportFormat" value="student" class="accent-pen mt-1" />
                <div>
                  <div class="font-display font-bold text-sm text-ink">{{ t('export.student.title') }}</div>
                  <div class="text-xs text-ink/50 mt-0.5">{{ t('export.student.desc') }}</div>
                </div>
              </label>
              <label :class="['flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all', exportFormat==='teacher' ? 'border-pen bg-pen/[0.05]' : 'border-ink/10 bg-paper hover:border-ink/25']">
                <input type="radio" v-model="exportFormat" value="teacher" class="accent-pen mt-1" />
                <div>
                  <div class="font-display font-bold text-sm text-ink">{{ t('export.teacher.title') }}</div>
                  <div class="text-xs text-ink/50 mt-0.5">{{ t('export.teacher.desc') }}</div>
                </div>
              </label>
              <label :class="['flex items-start gap-3 rounded-xl border-2 p-4 cursor-pointer transition-all', exportFormat==='blank' ? 'border-pen bg-pen/[0.05]' : 'border-ink/10 bg-paper hover:border-ink/25']">
                <input type="radio" v-model="exportFormat" value="blank" class="accent-pen mt-1" />
                <div>
                  <div class="font-display font-bold text-sm text-ink">{{ t('export.blank.title') }}</div>
                  <div class="text-xs text-ink/50 mt-0.5">{{ t('export.blank.desc') }}</div>
                </div>
              </label>
            </div>

            <div class="flex items-center justify-between pt-1">
              <button class="min-h-[40px] px-4 py-2.5 rounded-xl text-sm font-semibold text-ink/60 hover:text-ink transition-colors" @click="showExportDialog = false">{{ t('export.cancel') }}</button>
              <button :disabled="exportBusy" class="min-h-[40px] px-6 py-2.5 rounded-xl bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5 disabled:opacity-50 flex items-center gap-2" @click="exportPDF">
                <span v-if="exportBusy" class="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></span>
                {{ exportBusy ? t('export.generating') : '⤓ ' + t('export.download') }}
              </button>
            </div>
          </div>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<style scoped>
.tape {
  position: absolute;
  top: -26px;
  left: 50%;
  width: 260px;
  height: 66px;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
@media (max-width: 390px) {
  .tape { width: 200px; height: 50px; top: -20px; }
}
</style>
