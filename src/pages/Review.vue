<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted } from "vue"
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
import { t } from "@/lib/i18n"

const router = useRouter()
const paper = ref<UniversalPaper | null>(null)
const pdfName = ref<string | null>(null)
const pdfBuffer = ref<ArrayBuffer | null>(null)
const cropFor = ref<number | null>(null)
const selIdx = ref(0)
const showPanel = ref(false) // collapsed by default — expand via toolbar or edge rail

/* ── Session dirty-tracking ── */
const dirtyIds = ref<Set<number>>(new Set())
function markDirty(idx?: number) {
  const s = new Set(dirtyIds.value)
  s.add(idx ?? selIdx.value)
  dirtyIds.value = s
}
const dirtyCount = computed(() => dirtyIds.value.size)

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

const filteredQuestions = computed<{ i: number; q: UniversalQuestion }[]>(() => {
  if (!paper.value) return []
  return paper.value.questions
    .map((qq, i) => ({ i, q: qq }))
    .filter(({ q }) => {
      if (typeFilter.value !== "all") {
        if (typeFilter.value === "other") { if (KNOWN_TYPES.includes(q.type)) return false }
        else if (q.type !== typeFilter.value) return false
      }
      if (diagramsOnly.value && !(q.hasDiagram || (q.diagrams?.length ?? 0) > 0)) return false
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
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans">
    <AppNav />

    <!-- ═══ No paper yet ═══ -->
    <div v-if="!paper" class="max-w-5xl mx-auto px-5 pt-28 pb-16">
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/extract')">{{ t('review.backExtract') }}</button>
      <div class="mt-8 relative rounded-lg bg-white p-10 text-center shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
        <div class="tape" aria-hidden="true"></div>
        <img src="/images/notebook/empty-extract.webp" alt="" class="w-40 mx-auto mb-4" loading="lazy" />
        <p class="font-display font-bold text-xl">{{ t('review.empty.title') }}</p>
        <p class="text-ink/55 mt-1.5 text-[15px]">{{ t('review.empty.sub') }}</p>
        <button class="mt-5 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">{{ t('review.empty.cta') }}</button>
      </div>
    </div>

    <!-- ═══ 3-zone review workspace ═══ -->
    <template v-else>
      <div class="max-w-[1700px] mx-auto px-5 pt-24 pb-4">
        <!-- sticky toolbar -->
        <div class="sticky top-[88px] z-30 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-white px-4 py-2.5 shadow-[0_14px_40px_-22px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.06]">
          <div class="flex items-center gap-3 min-w-0">
            <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors shrink-0" @click="router.push('/extract')">{{ t('review.back') }}</button>
            <span class="h-5 w-px bg-ink/10 shrink-0"></span>
            <h1 class="font-display font-extrabold tracking-tight text-xl shrink-0" :title="pdfName ?? undefined">{{ t('review.title') }}</h1>
            <span v-if="pdfName" class="font-hand text-lg text-ink/40 truncate max-w-52 hidden xl:inline">{{ pdfName }}</span>
          </div>
          <div class="flex items-center gap-2.5">
            <span v-if="dirtyCount" class="font-mono text-[11px] font-bold px-2.5 py-1 rounded-full bg-hlyellow/60 text-ink">{{ dirtyCount }} {{ t('review.edited') }}</span>
            <button :class="['px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-colors', showRendered ? 'border-pen/40 bg-pen/[0.06] text-pen' : 'border-ink/12 text-ink/60 hover:text-ink']" @click="showRendered = !showRendered">{{ showRendered ? "◉ " + t('review.toggleRendered') : "◌ " + t('review.toggleRaw') }}</button>
            <button class="px-5 py-2 rounded-xl bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5" @click="saveAndGoTest">{{ t('review.saveStart') }}</button>
            <button :class="['px-3.5 py-2 rounded-xl border-2 text-xs font-bold transition-colors', showPanel ? 'border-pen/40 bg-pen/[0.06] text-pen' : 'border-ink/12 text-ink/60 hover:text-ink']" @click="showPanel = !showPanel">{{ t('review.validation') }}</button>
          </div>
        </div>

        <!-- zones -->
        <div class="mt-3 flex gap-4 h-[calc(100vh-11.5rem)] min-h-[420px]">
          <!-- a) LEFT SIDEBAR -->
          <aside class="rev-zone hidden lg:flex w-72 shrink-0 flex-col rounded-xl bg-white shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06] overflow-hidden">
            <div class="p-3 border-b border-ink/[0.08] space-y-2.5">
              <select v-model="typeFilter" class="w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40">
                <option v-for="f in TYPE_FILTERS" :key="f.value" :value="f.value">{{ f.label }}</option>
              </select>
              <label class="flex items-center gap-2 text-xs font-medium text-ink/65 cursor-pointer select-none">
                <input type="checkbox" v-model="diagramsOnly" class="accent-pen" /> {{ t('review.diagramsOnly') }}
              </label>
            </div>

            <div class="flex-1 overflow-y-auto p-2 space-y-1.5">
              <button
                v-for="{ i, q: item } in filteredQuestions"
                :key="item.id"
                class="relative w-full text-left rounded-lg bg-white ring-1 overflow-hidden transition-all group"
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
                    <span class="font-mono text-[9px] uppercase tracking-wider bg-ink/[0.06] text-ink/60 rounded px-1.5 py-0.5">{{ item.type }}</span>
                    <span v-if="item.pageNo" class="font-mono text-[10px] bg-hlyellow/60 text-ink rounded px-1.5 py-0.5">p.{{ item.pageNo }}</span>
                    <span v-if="item.diagrams?.length || item.hasDiagram" class="ml-auto w-1.5 h-1.5 rounded-full bg-hlgreen shrink-0" aria-hidden="true"></span>
                  </div>
                  <p class="mt-1.5 text-xs leading-snug text-ink/75 line-clamp-2">{{ item.text || '—' }}</p>
                </div>
              </button>
              <p v-if="!filteredQuestions.length" class="text-xs text-ink/45 text-center py-6">{{ t('review.noMatch') }}</p>
            </div>

            <div class="px-3 py-2 border-t border-ink/[0.08] font-mono text-[10px] text-ink/45">{{ filteredQuestions.length }}/{{ totalQ }} {{ t('review.questionCount') }}</div>
          </aside>

          <!-- b) CENTER EDITOR -->
          <main class="rev-zone relative flex-1 min-w-0 overflow-y-auto rounded-xl bg-white p-6 shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06]">
            <template v-if="q">
              <div class="sticky -top-6 -mx-6 -mt-6 px-6 py-3.5 bg-white/95 backdrop-blur border-b border-ink/[0.08] flex items-center justify-between gap-3 z-10 rounded-t-xl">
                <div class="font-mono text-[11px] tracking-wider text-ink/50 uppercase truncate">Q{{ q.number }} · {{ q.type }} · {{ q.subject || t('review.noSubject') }}<span v-if="q.pageNo" class="ml-2 bg-hlyellow/60 text-ink px-1.5 py-0.5 rounded normal-case">p.{{ q.pageNo }}</span></div>
                <div class="flex gap-2 shrink-0">
                  <button :disabled="!hasPrev" class="px-3 py-1.5 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" @click="prev">{{ t('review.prev') }}</button>
                  <button :disabled="!hasNext" class="px-3 py-1.5 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" @click="next">{{ t('review.next') }}</button>
                </div>
              </div>

              <input v-model="paper!.meta.title" class="mt-4 w-full border border-ink/12 rounded-lg px-3.5 py-2.5 font-semibold text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phTitle')" />

              <div v-if="showRendered" class="mt-3 w-full border border-ink/12 rounded-xl p-3.5 text-[15px] leading-relaxed bg-white min-h-[104px] cursor-text" :title="t('review.titleClickEdit')" @click="showRendered = false">
                <MathText :text="q.text || ''" />
              </div>
              <textarea v-else v-model="q.text" rows="4" class="mt-3 w-full border border-ink/12 rounded-xl p-3 text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 font-mono text-[13px]" :placeholder="t('review.phQuestion')" @input="markDirty()"></textarea>

              <div class="mt-3 grid sm:grid-cols-2 gap-2.5">
                <label class="block">
                  <span class="text-xs font-semibold text-ink/60">{{ t('review.field.type') }}</span>
                  <select :value="q.type" class="mt-1 w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" @change="q.type = ($event.target as HTMLSelectElement).value as QuestionType; markDirty()">
                    <option v-for="t in TYPE_OPTIONS" :key="t.value" :value="t.value">{{ t.label }}</option>
                  </select>
                </label>
                <label class="block">
                  <span class="text-xs font-semibold text-ink/60">{{ t('review.field.subject') }}</span>
                  <input v-model="q.subject" class="mt-1 w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phSubject')" @input="markDirty()" />
                </label>
                <label class="block">
                  <span class="text-xs font-semibold text-ink/60">{{ t('review.field.section') }}</span>
                  <input v-model="q.section" class="mt-1 w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phSection')" @input="markDirty()" />
                </label>
                <label class="block">
                  <span class="text-xs font-semibold text-ink/60">{{ t('review.field.topic') }}</span>
                  <input v-model="q.topic" class="mt-1 w-full border border-ink/12 rounded-lg px-2.5 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phTopic')" @input="markDirty()" />
                </label>
              </div>

              <div v-if="q.options" class="mt-4 grid gap-1.5">
                <div class="flex items-center justify-between">
                  <span class="text-xs font-bold text-ink/70">{{ t('review.options') }}</span>
                  <label class="flex items-center gap-1.5 text-xs font-medium text-ink/60 cursor-pointer">
                    <input type="checkbox" :checked="q.hasDiagram" @change="toggleDiagram(selIdx)" class="accent-pen" /> {{ t('review.hasDiagram') }}
                  </label>
                </div>
                <div :class="optionsCompact(q) ? 'grid sm:grid-cols-2 gap-2' : 'grid gap-1.5'">
                  <div v-for="(opt, oi) in q.options" :key="oi" :class="['rounded-xl border transition-colors', isCorrect(q, oi) ? 'border-correct/60 bg-correct/[0.06]' : 'border-ink/10 bg-paper hover:border-ink/25']">
                    <div class="flex items-center gap-2 px-2.5 py-2">
                      <span :class="['font-mono text-xs w-5 shrink-0', isCorrect(q, oi) ? 'text-green-700 font-bold' : 'text-ink/45']">{{ String.fromCharCode(65+oi) }}.</span>
                      <span v-if="showRendered" class="flex-1 min-w-0 text-sm text-ink cursor-text break-words [&_.katex]:text-[0.98em]" :title="t('review.clickToEdit') + opt" @click="showRendered = false"><MathText :text="opt" /></span>
                      <input v-else :value="opt" @input="q.options![oi] = ($event.target as HTMLInputElement).value; markDirty()" class="flex-1 min-w-0 bg-transparent text-sm text-ink focus:outline-none" :placeholder="t('review.phOption')" />
                      <span v-if="isCorrect(q, oi)" class="shrink-0 px-1.5 py-0.5 rounded-full bg-correct text-white font-mono text-[8px] font-bold">✓</span>
                    </div>
                  </div>
                </div>
              </div>

              <div class="mt-4 flex flex-wrap gap-2.5 items-center text-sm">
                <span class="text-xs font-semibold text-ink/60">{{ t('review.answer') }}</span>
                <input v-model="q.answer" class="border border-ink/12 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" :placeholder="t('review.phAnswer')" @input="markDirty()" />
                <span v-if="q.type==='msq'" class="text-xs font-semibold text-ink/60">{{ t('review.answersLabel') }}<input :value="(q.answers||[]).join(',')" @input="q.answers = ($event.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean); markDirty()" class="border border-ink/12 rounded-lg px-2 py-1.5 text-xs w-28 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" /></span>
                <span class="ml-auto text-xs font-semibold text-ink/60">{{ t('review.marks') }} <input v-model.number="q.marks" type="number" class="w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" @input="markDirty()" /> {{ t('review.negative') }} <input v-model.number="q.negativeMarks" type="number" class="w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" @input="markDirty()" /></span>
              </div>

              <!-- Manual crop per question -->
              <div class="mt-5 border-t border-dashed border-ink/15 pt-3.5">
                <div class="text-xs font-bold text-ink/70">{{ t('review.diagramCrop') }}</div>
                <div v-if="q.diagrams?.length" class="mt-2.5 flex gap-2.5 flex-wrap">
                  <div v-for="(d,didx) in q.diagrams" :key="didx" class="relative group">
                    <img :src="d" class="w-28 rounded-lg border border-ink/10" loading="lazy" decoding="async" />
                    <button class="absolute -top-1.5 -right-1.5 bg-redmargin text-white rounded-full w-5.5 h-5.5 grid place-items-center text-xs shadow" @click="q.diagrams!.splice(didx,1); markDirty()">×</button>
                  </div>
                </div>
                <button class="mt-2.5 px-4 py-2 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors" @click="cropPlaceholder(selIdx)">{{ q.hasDiagram ? t('review.cropAdd') : t('review.cropBtn') }}</button>
                <p class="font-hand text-lg text-ink/45 mt-1">{{ t('review.cropHint') }}</p>
              </div>
            </template>
            <div v-else class="h-full grid place-items-center">
              <p class="text-sm text-ink/45">{{ t('review.selectQ') }}</p>
            </div>
          </main>

          <!-- c) RIGHT VALIDATION PANEL — collapsible -->
          <button v-if="!showPanel" @click="showPanel = true" class="rev-zone hidden lg:flex flex-col items-center gap-2 px-2 py-4 self-stretch rounded-xl bg-white ring-1 ring-ink/[0.06] hover:ring-pen/40 transition-all" :title="t('review.titleShowVal')">
            <span class="font-mono text-[10px] font-bold tracking-widest text-ink/50" style="writing-mode: vertical-rl;">{{ t('review.valVertical') }}</span>
            <span :class="['w-6 h-6 rounded-full grid place-items-center text-[10px] font-bold', errCount ? 'bg-redmargin/15 text-redmargin' : 'bg-correct/15 text-green-700']">{{ errCount || warnCount || "✓" }}</span>
          </button>
          <transition enter-active-class="transition-all duration-300 ease-out" enter-from-class="opacity-0 -mr-80" leave-active-class="transition-all duration-200 ease-in" leave-to-class="opacity-0 -mr-80">
            <aside v-show="showPanel" class="rev-zone hidden lg:flex w-80 shrink-0 flex-col rounded-xl bg-white shadow-[0_14px_40px_-22px_rgba(35,32,58,0.3)] ring-1 ring-ink/[0.06] overflow-hidden">
            <div class="px-4 py-3 border-b border-ink/[0.08] bg-paper/60 flex items-start justify-between gap-2">
              <div>
                <div class="font-mono text-[11px] uppercase tracking-[0.25em] text-ink/50">{{ t('review.valHeader') }}</div>
                <div class="mt-1.5 flex gap-2 text-[11px] font-bold">
                  <span :class="errCount ? 'bg-redmargin/[0.12] text-redmargin' : 'bg-correct/[0.12] text-green-700'" class="px-2 py-0.5 rounded-full">{{ errCount }} {{ t('review.errors') }}</span>
                  <span :class="warnCount ? 'bg-hlyellow/50 text-ink' : 'bg-ink/[0.05] text-ink/45'" class="px-2 py-0.5 rounded-full">{{ warnCount }} {{ t('review.warnings') }}</span>
                </div>
              </div>
              <button @click="showPanel = false" :title="t('review.titleCollapse')" class="shrink-0 w-7 h-7 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/45">»</button>
            </div>
            <div class="flex-1 overflow-y-auto p-2.5 space-y-1.5">
              <template v-if="valIssues.length">
                <button
                  v-for="(iss, ii) in valIssues"
                  :key="ii"
                  class="w-full text-left flex items-start gap-2 px-3 py-2 rounded-lg border text-xs transition-colors"
                  :class="[iss.level === 'error' ? 'bg-redmargin/[0.07] border-redmargin/25 hover:border-redmargin/60' : 'bg-hlyellow/[0.18] border-hlyellow/60 hover:border-hlyellow', selIdx === iss.index ? 'ring-2 ring-pen/40' : '']"
                  @click="jumpTo(iss.index)"
                >
                  <span class="mt-1 w-1.5 h-1.5 rounded-full shrink-0" :class="iss.level === 'error' ? 'bg-redmargin' : 'bg-hlyellow'" aria-hidden="true"></span>
                  <span class="text-ink/80 leading-snug">{{ iss.msg }}</span>
                </button>
              </template>
              <div v-else class="mt-8 text-center">
                <div class="mx-auto w-10 h-10 rounded-full bg-correct/[0.12] grid place-items-center text-green-700 font-bold">✓</div>
                <p class="mt-2.5 text-sm font-display font-bold">{{ t('review.allPass') }}</p>
                <p class="text-xs text-ink/45 mt-1">{{ t('review.allPassSub') }}</p>
              </div>
            </div>
          </aside>
          </transition>
        </div>
      </div>
    </template>

    <DiagramCropper v-if="cropFor!==null && paper" :pdfBuffer="pdfBuffer" :initialPage="(paper.questions[cropFor]?.pageNo || 1)" @cropped="onCropped" @close="cropFor=null" />
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
</style>
