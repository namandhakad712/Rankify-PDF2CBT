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
  timeLeft.value = paper.value.meta.durationMinutes * 60
  paper.value.questions.forEach((qq) => {
    if (!status.value[qq.id]) status.value[qq.id] = "notVisited"
  })
  status.value[paper.value.questions[0].id] = "notAnswered"
  timer = window.setInterval(() => {
    if (timeLeft.value > 0) timeLeft.value -= 1
  }, 1000)
})

onBeforeUnmount(() => { if (timer) clearInterval(timer) })

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

function go(n: number) {
  if (!paper.value) return
  if (n < 0 || n >= total.value) return
  const nextId = paper.value.questions[n].id
  if (status.value[nextId] === "notVisited") status.value[nextId] = "notAnswered"
  idx.value = n
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

function submit() {
  if (!paper.value) return
  const result = {
    paperId: "current",
    paper: paper.value,
    answers: { ...answers.value },
    status: { ...status.value },
    timeLeft: timeLeft.value,
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
      </div>
      <div class="flex items-center gap-2 lg:gap-3 shrink-0">
        <div class="timer-display min-h-[40px] flex items-center font-mono text-sm font-bold px-3.5 py-1.5 rounded-lg tabular-nums" :class="timeLeft < 300 ? 'bg-redmargin/10 text-redmargin animate-pulse' : 'bg-paper text-ink/70 border border-ink/10'">{{ fmt }}</div>
        <button class="min-h-[40px] px-5 py-2.5 rounded-xl bg-pen hover:bg-pen/90 text-white text-sm font-bold transition-colors" @click="submit">{{ t('test.submit') }}</button>
      </div>
    </div>

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
            </div>
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
          <div class="flex items-center gap-1.5 col-span-2"><span class="w-3.5 h-3.5 rounded bg-paper border border-dashed border-ink/35 inline-block"></span> {{ t('test.legend.notVisited') }} ({{ counts.notVisited }})</div>
        </div>

        <div class="flex-1 min-h-0 overflow-y-auto px-4 py-4 overflow-x-hidden">
          <div class="grid grid-cols-5 gap-2 lg:grid-cols-5">
            <button v-for="(qq,i) in paper.questions" :key="qq.id" @click="go(i)" :class="['w-10 h-10 min-h-[40px] min-w-[40px] rounded-lg text-xs font-bold transition-all relative grid place-items-center', idx===i ? 'ring-2 ring-pen ring-offset-2 ring-offset-white' : '', status[qq.id]==='answered' ? 'bg-correct text-white' : status[qq.id]==='markedAnswered' ? 'bg-[#8b5cf6] text-white' : status[qq.id]==='marked' ? 'bg-[#8b5cf6] text-white' : status[qq.id]==='notAnswered' ? 'bg-redmargin text-white' : 'bg-paper border border-dashed border-ink/30 text-ink/45']">{{ qq.number }}<span v-if="status[qq.id]==='markedAnswered'" class="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-correct border border-white"></span></button>
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
