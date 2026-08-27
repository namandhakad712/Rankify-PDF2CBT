<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper } from "@/types"
import { getDB } from "@/lib/db"
import MathText from "@/components/MathText.vue"
import gsap from 'gsap'
import { t } from "@/lib/i18n"

const router = useRouter()
const paper = ref<UniversalPaper | null>(null)
const idx = ref(0)
const answers = ref<Record<string, string | string[]>>({})
const status = ref<Record<string, "notVisited"|"notAnswered"|"answered"|"marked"|"markedAnswered">>({})
const timeLeft = ref(0)
let timer: number | null = null
/* ── 1. timer presets + practice mode ── */
const PRESETS = [15, 30, 60, 90, 120, 180]
const showPresetMenu = ref(false)
const customMins = ref("")
const practiceMode = ref(false)
try { practiceMode.value = localStorage.getItem("rpdf2cbt-practice") === "1" } catch {}
watch(practiceMode, v => { try { localStorage.setItem("rpdf2cbt-practice", v ? "1" : "0") } catch {} })
function setPreset(mins: number) {
  if (!paper.value) return
  paper.value.meta.durationMinutes = mins
  if (!practiceMode.value) timeLeft.value = mins * 60
  // persist so back/refresh keeps it
  localStorage.setItem("rpdf2cbt-current", JSON.stringify(paper.value))
  showPresetMenu.value = false
}
function applyCustom() {
  const v = parseInt(customMins.value, 10)
  if (!isNaN(v) && v >= 5 && v <= 600) setPreset(v)
}
const practiceFeedback = computed(() => {
  if (!practiceMode.value || !q.value) return null
  const a = answers.value[q.value.id]
  if (q.value.type === "msq") {
    const sel = (a as string[] | undefined) || []
    if (!sel.length) return null
    const exp = (q.value.answers || []).slice().sort().join(",")
    const got = [...sel].sort().join(",")
    const ok = got === exp
    return { ok, text: ok ? "Correct!" : `Wrong — correct: ${exp.split(",").map(i=>String.fromCharCode(65+Number(i))).join(", ")}` }
  }
  if (q.value.options) {
    if (!a) return null
    const ok = String(a) === String(q.value.answer)
    const expLetter = String.fromCharCode(64 + Number(q.value.answer))
    return { ok, text: ok ? "Correct!" : `Wrong — correct: ${expLetter}` }
  }
  if (q.value.type === "nat" || q.value.type === "fill-blank") {
    if (!a) return null
    const ok = String(a).trim() === String(q.value.answer).trim()
    return { ok, text: ok ? "Correct!" : `Wrong — correct: ${q.value.answer}` }
  }
  return null
})

/* ── 2. bookmarks / doubt ── */
const bookmarks = ref<Record<string, boolean>>({})
function toggleBookmark() {
  if (!q.value) return
  bookmarks.value[q.value.id] = !bookmarks.value[q.value.id]
  try { localStorage.setItem("rpdf2cbt-bookmarks", JSON.stringify(bookmarks.value)) } catch {}
}

/* ── 12. per-question timer analytics ── */
const timeSpent = ref<Record<string, number>>({})
let activeQId: string | null = null
let tickStart = Date.now()
function startQTimer(qId: string) {
  activeQId = qId
  tickStart = Date.now()
}
function flushQTimer() {
  if (!activeQId) return
  const delta = Math.round((Date.now() - tickStart) / 1000)
  if (delta > 0) timeSpent.value[activeQId] = (timeSpent.value[activeQId] || 0) + delta
  tickStart = Date.now()
}

const q = computed(() => paper.value?.questions[idx.value] ?? null)
const total = computed(() => paper.value?.questions.length ?? 0)

onMounted(async () => {
  const raw = localStorage.getItem("rpdf2cbt-current") || localStorage.getItem("rpdf2cbt-review")
  if (raw) paper.value = JSON.parse(raw)
  else {
    const rec = await getDB().papers.get("current")
    if (rec) paper.value = rec.paper
  }
  if (!paper.value) return
  // restore bookmarks
  try { bookmarks.value = JSON.parse(localStorage.getItem("rpdf2cbt-bookmarks") || "{}") } catch { bookmarks.value = {} }
  timeLeft.value = paper.value.meta.durationMinutes * 60
  paper.value.questions.forEach((qq) => {
    if (!status.value[qq.id]) status.value[qq.id] = "notVisited"
    if (timeSpent.value[qq.id] == null) timeSpent.value[qq.id] = 0
  })
  status.value[paper.value.questions[0].id] = "notAnswered"
  startQTimer(paper.value.questions[0].id)
  timer = window.setInterval(() => {
    if (!practiceMode.value && timeLeft.value > 0) {
      timeLeft.value -= 1
    }
    // also accumulate per-q (1s granularity) even in practice for analytics
    if (activeQId) timeSpent.value[activeQId] = (timeSpent.value[activeQId] || 0) + 1
  }, 1000)
  // 4. keyboard nav
  window.addEventListener("keydown", onKey)
})

onBeforeUnmount(() => {
  if (timer) clearInterval(timer)
  window.removeEventListener("keydown", onKey)
  flushQTimer()
})

function selectOption(optIdx: string) {
  if (!q.value) return
  if (q.value.type === "msq") {
    const cur = (answers.value[q.value.id] as string[] | undefined) || []
    const next = cur.includes(optIdx) ? cur.filter((x) => x !== optIdx) : [...cur, optIdx].sort()
    answers.value[q.value.id] = next
    status.value[q.value.id] = next.length ? "answered" : "notAnswered"
    return
  }
  answers.value[q.value.id] = optIdx
  status.value[q.value.id] = "answered"
}

/* ── 4. keyboard ── */
function onKey(e: KeyboardEvent) {
  const tag = (e.target as HTMLElement)?.tagName
  if (tag === 'INPUT' || tag === 'TEXTAREA' || (e.target as HTMLElement)?.isContentEditable) return
  if (showPresetMenu.value) return
  const k = e.key.toLowerCase()
  if (k >= '1' && k <= '4' && q.value?.options) {
    const oi = parseInt(k, 10) - 1
    if (oi < q.value.options.length) {
      e.preventDefault()
      if (q.value.type === 'msq') selectOption(String(oi))
      else selectOption(String(oi + 1))
    }
  } else if (k === 'm') { e.preventDefault(); mark() }
  else if (k === 'n') { e.preventDefault(); if (idx.value < total.value - 1) go(idx.value + 1) }
  else if (k === 'p') { e.preventDefault(); if (idx.value > 0) go(idx.value - 1) }
  else if (k === 'c') { e.preventDefault(); clearResponse() }
  else if (k === 'b') { e.preventDefault(); toggleBookmark() }
}

function go(n: number) {
  if (!paper.value) return
  if (n < 0 || n >= total.value) return
  flushQTimer()
  const nextId = paper.value.questions[n].id
  if (status.value[nextId] === "notVisited") status.value[nextId] = "notAnswered"
  idx.value = n
  startQTimer(nextId)
}

function mark() {
  if (!q.value) return
  const s = status.value[q.value.id]
  status.value[q.value.id] = s === "answered" ? "markedAnswered" : s === "marked" ? "notAnswered" : "marked"
}

function markNext() { mark(); if (idx.value < total.value - 1) go(idx.value + 1) }

function clearResponse() {
  if (!q.value) return
  delete answers.value[q.value.id]
  status.value[q.value.id] = "notAnswered"
}

/** NAT virtual keypad */
function natKey(k: string) {
  if (!q.value) return
  const cur = (answers.value[q.value.id] as string) || ""
  if (k === "⌫") { answers.value[q.value.id] = cur.slice(0, -1); return }
  if (k === "✓") { // commit
    status.value[q.value.id] = cur ? "answered" : status.value[q.value.id]
    return
  }
  if (k === "+/-") { // toggle sign — only when there is something to toggle
    if (!cur || cur === "-") { answers.value[q.value.id] = cur ? "" : "-"; return }
    answers.value[q.value.id] = cur.startsWith("-") ? cur.slice(1) : "-" + cur
    return
  }
  if (k === "." && cur.includes(".")) return
  if (cur.replace("-", "").replace(".", "").length >= 10) return
  answers.value[q.value.id] = cur + k
}

/** Save & Next — commit current selection state and advance */
function saveNext() {
  if (!q.value) return
  const a = answers.value[q.value.id]
  const has = q.value.type === "msq" ? ((a as string[]) || []).length > 0 : !!a
  status.value[q.value.id] = has ? "answered" : "notAnswered"
  if (idx.value < total.value - 1) go(idx.value + 1)
}

const counts = computed(() => {
  const c = { answered: 0, notAnswered: 0, notVisited: 0, marked: 0, markedAnswered: 0 }
  for (const qq of paper.value?.questions || []) c[status.value[qq.id] || "notVisited"]++
  return c
})
const bookmarkCount = computed(() => Object.values(bookmarks.value).filter(Boolean).length)

function submit() {
  if (!paper.value) return
  flushQTimer()
  // 9. streak — local daily
  try {
    const today = new Date().toISOString().slice(0, 10)
    const raw = localStorage.getItem("rpdf2cbt-streak")
    const s = raw ? JSON.parse(raw) : { count: 0, lastDate: "", best: 0 }
    if (s.lastDate !== today) {
      const yest = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      s.count = s.lastDate === yest ? s.count + 1 : 1
      s.lastDate = today
      s.best = Math.max(s.best || 0, s.count)
      localStorage.setItem("rpdf2cbt-streak", JSON.stringify(s))
    }
  } catch {}
  const result = {
    paperId: "current",
    paper: paper.value,
    answers: { ...answers.value },
    status: { ...status.value },
    timeLeft: timeLeft.value,
    timeSpent: { ...timeSpent.value },
    bookmarks: { ...bookmarks.value },
    createdAt: Date.now(),
  }
  localStorage.setItem("rpdf2cbt-last-result", JSON.stringify(result))
  const isCorrect = (qq: typeof paper.value.questions[number]) => {
    const a = answers.value[qq.id]
    if (qq.type === "msq") {
      const sel = (a as string[] | undefined) || []
      const exp = (qq.answers || []).slice().sort()
      return sel.length === exp.length && sel.every((v, i) => v === exp[i])
    }
    return !!a && (a as string) === qq.answer
  }
  const correct = paper.value.questions.filter(isCorrect).length
  getDB().results.add({ paperId: "current", paper: paper.value, score: { total: total.value, obtained: correct, percentage: Math.round(100*correct/total.value) }, breakdown: [], createdAt: Date.now() })
  router.push("/results")
}

const fmt = computed(() => {
  const m = Math.floor(timeLeft.value/60); const s = timeLeft.value%60
  return `${String(m).padStart(2,"0")}:${String(s).padStart(2,"0")}`
})

// Question transition animation
watch(idx, () => {
  const sheet = document.querySelector('.q-sheet')
  if (sheet) {
    gsap.fromTo(sheet, { opacity: 0.5, y: 12 }, { opacity: 1, y: 0, duration: 0.3, ease: 'power2.out' })
  }
})

// Timer urgency shake when <60s
watch(timeLeft, (val) => {
  if (val === 60) {
    const timerEl = document.querySelector('.timer-display')
    if (timerEl) {
      gsap.fromTo(timerEl, { x: -3 }, { x: 0, duration: 0.4, ease: 'elastic.out(1,0.3)', repeat: 2 })
    }
  }
})
</script>

<template>
  <div v-if="!paper" class="min-h-screen grid place-items-center bg-paper text-ink">
    <div class="text-center px-5">
      <img src="/images/notebook/empty-state-mascot.webp" alt="" class="w-36 mx-auto mb-4" loading="lazy" />
      <p class="font-hand text-2xl text-ink/50 -rotate-2">{{ t('test.empty.hand') }}</p>
      <div class="font-display font-bold text-2xl mt-1">{{ t('test.empty.title') }}</div>
      <button class="mt-4 px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/review')">{{ t('test.empty.cta') }}</button>
    </div>
  </div>
  <div v-else class="min-h-screen lg:h-screen lg:overflow-hidden bg-paper flex flex-col text-ink">
    <!-- exam header -->
    <div class="bg-white/90 backdrop-blur border-b-2 border-ink/[0.07] px-4 lg:px-5 py-3 flex flex-wrap items-center justify-between gap-2 sticky top-0 z-30">
      <div class="font-display font-bold flex items-center gap-2.5 tracking-tight min-w-0 flex-1">
        <span class="w-2.5 h-2.5 rounded-full bg-correct shrink-0"></span>
        <span class="truncate break-words min-w-0">{{ paper.meta.title }}</span>
        <span class="hidden sm:inline font-mono text-[10px] text-ink/35">· {{ paper.meta.durationMinutes }} min preset</span>
      </div>
      <div class="flex items-center gap-2 lg:gap-3 shrink-0">
        <button @click="practiceMode = !practiceMode" :class="['min-h-[40px] px-3.5 py-1.5 rounded-full text-xs font-bold border transition-colors', practiceMode ? 'bg-hlyellow border-hlyellow text-ink' : 'bg-paper border-ink/12 text-ink/60 hover:border-ink/30']" :title="practiceMode ? 'Exit practice — back to timed exam' : 'Practice: instant feedback, no timer'">{{ practiceMode ? '✓ Practice' : 'Practice' }}</button>
        <div class="relative">
          <button v-if="!practiceMode" @click="showPresetMenu = !showPresetMenu" class="timer-display min-h-[40px] flex items-center gap-1.5 font-mono text-sm font-bold px-3.5 py-1.5 rounded-lg tabular-nums border" :class="timeLeft < 300 ? 'bg-redmargin/10 text-redmargin animate-pulse border-redmargin/20' : 'bg-paper text-ink/70 border-ink/10 hover:border-pen/40'">{{ fmt }} <span class="text-[10px] opacity-50">▼</span></button>
          <span v-else class="min-h-[40px] flex items-center font-mono text-xs font-bold px-3 py-1.5 rounded-lg bg-hlyellow/20 border border-hlyellow text-ink">No timer</span>
          <div v-if="showPresetMenu" class="absolute right-0 top-full mt-2 w-64 bg-white rounded-xl shadow-xl ring-1 ring-ink/10 p-3 z-50">
            <div class="font-mono text-[10px] font-bold tracking-wider text-ink/50 mb-2">TIMER PRESET — tap to switch</div>
            <div class="grid grid-cols-3 gap-1.5">
              <button v-for="m in PRESETS" :key="m" @click="setPreset(m)" :class="['py-2 rounded-lg text-xs font-bold border transition-colors', paper.meta.durationMinutes===m ? 'bg-pen text-white border-pen' : 'bg-paper border-ink/10 hover:border-pen text-ink/70']">{{ m }}m</button>
            </div>
            <div class="flex gap-1.5 mt-2.5">
              <input v-model="customMins" placeholder="Custom mins (5-600)" type="number" class="flex-1 min-w-0 border border-ink/15 rounded-lg px-2.5 py-2 text-xs bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" />
              <button @click="applyCustom" class="px-4 py-2 rounded-lg bg-ink text-white text-xs font-bold hover:bg-ink/90">Set</button>
            </div>
            <button @click="showPresetMenu=false" class="mt-2 w-full py-1.5 text-[11px] text-ink/40 hover:text-ink">Close</button>
          </div>
        </div>
        <button class="min-h-[40px] px-5 py-2.5 rounded-xl bg-pen hover:bg-pen/90 text-white text-sm font-bold transition-colors" @click="submit">{{ t('test.submit') }}</button>
      </div>
    </div>
    <div v-if="showPresetMenu" class="fixed inset-0 z-20" @click="showPresetMenu=false"></div>

    <div class="flex-1 lg:min-h-0 flex flex-col lg:flex-row">
      <!-- question sheet — fills all leftover space, seamless white -->
      <div class="flex-1 lg:min-h-0 lg:overflow-hidden flex flex-col bg-white min-w-0 overflow-hidden">
        <div class="flex-1 lg:overflow-y-auto px-4 lg:px-6 md:px-10 py-5 md:py-6 min-w-0">
        <div v-if="q" class="q-sheet min-w-0 break-words">
          <div class="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wider text-ink/50 uppercase break-words">
              <span>Q{{ q.number }} / {{ total }}</span><span class="text-ink/25">·</span>
              <span class="break-words">{{ q.type.toUpperCase() }}</span><span class="text-ink/25">·</span>
              <span class="truncate break-words min-w-0">{{ q.subject || t('test.general') }}</span>
              <span v-if="q.hasDiagram" class="bg-hlyellow text-ink px-2 py-0.5 rounded-full font-sans font-bold normal-case tracking-normal break-words">{{ t('test.diagramBelow') }}</span>
              <button @click="toggleBookmark" :title="bookmarks[q.id] ? 'Remove bookmark (B)' : 'Bookmark doubt (B)'" :class="['ml-auto inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors', bookmarks[q.id] ? 'bg-hlyellow border-hlyellow text-ink' : 'bg-paper border-ink/15 text-ink/50 hover:border-hlyellow hover:text-ink']">{{ bookmarks[q.id] ? '★ Bookmarked' : '☆ Bookmark' }}</button>
            </div>
            <div class="mt-1 font-mono text-[10px] text-ink/35 hidden sm:block">Keys: 1-4 select · M mark · N/P next/prev · C clear · B bookmark</div>
            <div class="mt-3.5 text-[15px] lg:text-[16px] leading-relaxed whitespace-pre-wrap break-words overflow-hidden"><MathText :text="q.text" /></div>
            <div v-if="q.diagrams?.length" class="mt-3 flex gap-2.5 flex-wrap">
              <img v-for="d in q.diagrams" :key="d" :src="d" class="max-h-44 max-w-full rounded-lg border border-ink/10 bg-white" />
            </div>

            <div v-if="q.options" class="mt-5 grid gap-2.5 min-w-0">
              <template v-if="q.type==='msq'">
                <label v-for="(opt, oi) in q.options" :key="oi" :class="['flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3 text-[15px] cursor-pointer transition-all min-h-[44px] break-words', ((answers[q.id] as string[])||[]).includes(String(oi)) ? 'border-pen bg-pen/[0.05] font-medium' : 'border-ink/10 bg-paper hover:border-ink/25']">
                  <input type="checkbox" :checked="((answers[q.id] as string[])||[]).includes(String(oi))" @change="selectOption(String(oi))" class="accent-pen w-4 h-4 shrink-0" />
                  <span class="font-mono text-xs text-ink/50 shrink-0">{{ String.fromCharCode(65+oi) }}.</span><span class="min-w-0 flex-1 break-words"><MathText :text="opt" /></span>
                </label>
              </template>
              <template v-else>
                <button v-for="(opt, oi) in q.options" :key="oi" @click="selectOption(String(oi+1))" :class="['text-left rounded-xl border-2 px-4 py-3 text-[15px] transition-all min-h-[44px] break-words overflow-hidden', answers[q.id]===String(oi+1) ? 'border-pen bg-pen text-white font-medium' : 'border-ink/10 bg-paper hover:border-ink/30']">
                  <span class="font-mono text-xs mr-2.5 shrink-0" :class="answers[q.id]===String(oi+1) ? 'text-white/70' : 'text-ink/50'">{{ String.fromCharCode(65+oi) }}.</span><span class="min-w-0 break-words"><MathText :text="opt" /></span>
                </button>
              </template>
            </div>
            <div v-if="practiceMode && practiceFeedback" :class="['mt-4 px-4 py-3 rounded-xl border-2 text-sm font-semibold flex items-center gap-2', practiceFeedback.ok ? 'bg-correct/[0.08] border-correct/30 text-green-700' : 'bg-redmargin/[0.06] border-redmargin/30 text-redmargin']">
              <span class="w-7 h-7 rounded-full grid place-items-center text-sm font-bold shrink-0" :class="practiceFeedback.ok ? 'bg-correct text-white' : 'bg-redmargin text-white'">{{ practiceFeedback.ok ? '✓' : '✗' }}</span>
              <span>{{ practiceFeedback.text }}</span>
            </div>

            <div v-if="q.type==='nat'" class="mt-5 flex flex-wrap items-start gap-4 min-w-0">
              <div class="min-w-0">
                <div class="font-mono text-[10px] uppercase tracking-wider text-ink/45 mb-1.5">{{ t('test.nat.answer') }}</div>
                <div class="w-full max-w-48 h-11 rounded-lg border-2 border-pen/40 bg-paper grid place-items-center font-mono text-lg font-bold tabular-nums break-all px-2">{{ answers[q.id] || '—' }}</div>
              </div>
              <div class="w-full max-w-52 min-w-0">
                <div class="w-full h-11 rounded-lg border-2 border-pen/40 bg-paper grid place-items-center font-mono text-lg font-bold tabular-nums mb-2 break-all px-2">{{ answers[q.id] || '' }}</div>
                <div class="grid grid-cols-3 gap-1.5">
                  <button v-for="k in ['1','2','3','4','5','6','7','8','9','.','0','+/-']" :key="k" @click="natKey(k)" class="w-full min-h-[44px] h-11 rounded-lg border border-ink/15 bg-paper text-base font-bold text-ink hover:border-pen hover:text-pen transition-colors">{{ k }}</button>
                </div>
                <div class="grid grid-cols-3 gap-1.5 mt-1.5">
                  <button @click="natKey('⌫')" class="min-h-[44px] h-11 rounded-lg border border-redmargin/40 bg-redmargin/[0.07] text-redmargin grid place-items-center hover:bg-redmargin/[0.12] transition-colors" :title="t('test.nat.backspaceT')">⌫</button>
                  <button @click="natKey('✓')" class="col-span-2 min-h-[44px] h-11 rounded-lg border border-pen/40 bg-pen/[0.08] text-pen grid place-items-center text-lg font-bold hover:bg-pen/[0.14] transition-colors" :title="t('test.nat.saveAnsT')">✓</button>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- classic CBT action bar — pinned under the sheet -->
        <div class="shrink-0 bg-white border-t-2 border-ink/[0.07] px-3 lg:px-4 md:px-6 py-3">
          <div class="flex flex-wrap items-center gap-2 lg:gap-2.5">
            <button class="min-h-[40px] px-3 lg:px-4 py-2.5 rounded-lg bg-[#8b5cf6] text-white text-sm font-bold hover:brightness-110 transition-colors break-words" @click="markNext">{{ t('test.markForReview') }}</button>
            <button class="min-h-[40px] px-3 lg:px-4 py-2.5 rounded-lg border-2 border-correct/50 text-sm font-bold text-green-700 hover:bg-correct/[0.06] transition-colors break-words" @click="clearResponse">{{ t('test.clearResponse') }}</button>
            <button :disabled="idx===0" @click="go(idx-1)" class="min-h-[40px] ml-auto px-3 lg:px-4 py-2.5 rounded-lg bg-ink/[0.06] text-sm font-bold text-ink/70 hover:bg-ink/[0.1] transition-colors disabled:opacity-40 disabled:pointer-events-none">‹‹ {{ t('test.back') }}</button>
            <button v-if="idx < total-1" @click="saveNext" class="min-h-[40px] px-6 lg:px-8 py-2.5 rounded-lg bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5 break-words">{{ t('test.saveNext') }}</button>
            <button v-else @click="submit" class="min-h-[40px] px-6 lg:px-8 py-2.5 rounded-lg bg-correct text-white text-sm font-bold break-words">{{ t('test.submitTest') }}</button>
          </div>
        </div>
      </div>

      <!-- classic CBT right panel -->
      <aside class="lg:w-80 shrink-0 bg-white border-t-2 lg:border-t-0 lg:border-l-2 border-ink/[0.07] flex flex-col lg:h-full lg:min-h-0">
        <div class="shrink-0 px-4 py-3 border-b border-ink/[0.08] bg-paper/60 flex items-center justify-between">
          <div class="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/50">{{ t('test.palette') }}</div>
          <div class="font-mono text-[10px] text-ink/45">{{ total }} {{ t('test.qsUnit') }}</div>
        </div>

        <div class="shrink-0 px-4 py-3 grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] font-medium text-ink/60 border-b border-ink/[0.06]">
          <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-correct inline-block"></span> {{ t('test.legend.answered') }} ({{ counts.answered }})</div>
          <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-redmargin inline-block"></span> {{ t('test.legend.notAnswered') }} ({{ counts.notAnswered }})</div>
          <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-[#8b5cf6] inline-block"></span> {{ t('test.legend.marked') }} ({{ counts.marked }})</div>
          <div class="flex items-center gap-1.5"><span class="relative w-3.5 h-3.5 rounded bg-[#8b5cf6] inline-block"><span class="absolute -bottom-0.5 -right-0.5 w-2 h-2 rounded-full bg-correct border border-white"></span></span> {{ t('test.legend.ansMarked') }} ({{ counts.markedAnswered }})</div>
          <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-paper border border-dashed border-ink/35 inline-block"></span> {{ t('test.legend.notVisited') }} ({{ counts.notVisited }})</div>
          <div class="flex items-center gap-1.5"><span class="w-3.5 h-3.5 rounded bg-hlyellow border border-hlyellow inline-block grid place-items-center text-[9px]">★</span> Bookmarks ({{ bookmarkCount }})</div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 overflow-x-hidden">
          <div class="grid grid-cols-5 gap-2 lg:grid-cols-5">
            <button v-for="(qq,i) in paper.questions" :key="qq.id" @click="go(i)" :class="['w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg text-xs font-bold transition-all relative grid place-items-center', idx===i ? 'ring-2 ring-pen ring-offset-2 ring-offset-white' : '', status[qq.id]==='answered' ? 'bg-correct text-white' : status[qq.id]==='markedAnswered' ? 'bg-[#8b5cf6] text-white' : status[qq.id]==='marked' ? 'bg-[#8b5cf6] text-white' : status[qq.id]==='notAnswered' ? 'bg-redmargin text-white' : 'bg-paper border border-dashed border-ink/30 text-ink/45', bookmarks[qq.id] ? 'ring-1 ring-hlyellow' : '']">{{ qq.number }}<span v-if="status[qq.id]==='markedAnswered'" class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-correct border border-white"></span><span v-if="bookmarks[qq.id]" class="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-hlyellow border-2 border-white grid place-items-center text-[8px] leading-none">★</span></button>
          </div>

          <div class="mt-5 grid grid-cols-2 gap-2">
            <button class="min-h-[40px] py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors disabled:opacity-40" @click="go(idx-1)" :disabled="idx===0">{{ t('test.prev') }}</button>
            <button class="min-h-[40px] py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors disabled:opacity-40" @click="go(idx+1)" :disabled="idx===total-1">{{ t('test.next') }}</button>
          </div>
        </div>

        <div class="shrink-0 p-4 pt-3 border-t border-ink/[0.08] bg-paper/40">
          <div class="text-[11px] font-mono text-ink/50 mb-2 break-words">{{ counts.answered + counts.markedAnswered }}/{{ total }} {{ t('test.attemptedSuffix') }}</div>
          <button class="w-full min-h-[44px] py-3 rounded-xl bg-correct text-white text-sm font-extrabold tracking-wide hover:brightness-110 transition-colors" @click="submit">{{ t('test.submit') }}</button>
        </div>
      </aside>
    </div>
  </div>
</template>
