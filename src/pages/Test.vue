<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper } from "@/types"
import { getDB } from "@/lib/db"
import MathText from "@/components/MathText.vue"

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
</script>

<template>
  <div v-if="!paper" class="min-h-screen grid place-items-center bg-paper text-ink">
    <div class="text-center px-5">
      <img src="/images/notebook/empty-state-mascot.webp" alt="" class="w-36 mx-auto mb-4" loading="lazy" />
      <p class="font-hand text-2xl text-ink/50 -rotate-2">nothing here yet.</p>
      <div class="font-display font-bold text-2xl mt-1">No test data</div>
      <button class="mt-4 px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/review')">Go to Review</button>
    </div>
  </div>
  <div v-else class="min-h-screen bg-paper flex flex-col text-ink">
    <!-- exam header -->
    <div class="bg-white/90 backdrop-blur border-b-2 border-ink/[0.07] px-5 py-3 flex items-center justify-between sticky top-0 z-30">
      <div class="font-display font-bold flex items-center gap-2.5 tracking-tight min-w-0">
        <span class="w-2.5 h-2.5 rounded-full bg-correct shrink-0"></span>
        <span class="truncate">{{ paper.meta.title }}</span>
      </div>
      <div class="flex items-center gap-3 shrink-0">
        <div class="font-mono text-sm font-bold px-3.5 py-1.5 rounded-lg tabular-nums" :class="timeLeft < 300 ? 'bg-redmargin/10 text-redmargin animate-pulse' : 'bg-paper text-ink/70 border border-ink/10'">{{ fmt }}</div>
        <button class="px-5 py-2 rounded-xl bg-pen hover:bg-pen/90 text-white text-sm font-bold transition-colors" @click="submit">Submit</button>
      </div>
    </div>

    <div class="flex-1 flex flex-col lg:flex-row">
      <!-- question sheet -->
      <div class="flex-1 p-4 md:p-6 lg:pr-3">
        <div v-if="q" class="relative max-w-3xl mx-auto lg:mx-0 rounded-lg bg-white shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden">
          <div class="pointer-events-none absolute inset-y-0 left-9 w-px bg-redmargin/40"></div>
          <div class="px-5 pl-14 py-6">
            <div class="flex flex-wrap items-center gap-2 font-mono text-[11px] tracking-wider text-ink/50 uppercase">
              <span>Q{{ q.number }} / {{ total }}</span><span class="text-ink/25">·</span>
              <span>{{ q.type.toUpperCase() }}</span><span class="text-ink/25">·</span>
              <span>{{ q.subject || 'General' }}</span>
              <span v-if="q.hasDiagram" class="bg-hlyellow text-ink px-2 py-0.5 rounded-full font-sans font-bold normal-case tracking-normal">diagram below</span>
            </div>
            <div class="mt-3.5 text-[16px] leading-relaxed whitespace-pre-wrap"><MathText :text="q.text" /></div>
            <div v-if="q.diagrams?.length" class="mt-3 flex gap-2.5 flex-wrap">
              <img v-for="d in q.diagrams" :key="d" :src="d" class="max-h-44 rounded-lg border border-ink/10 bg-white" />
            </div>

            <div v-if="q.options" class="mt-5 grid gap-2.5">
              <template v-if="q.type==='msq'">
                <label v-for="(opt, oi) in q.options" :key="oi" :class="['flex items-center gap-3 text-left rounded-xl border-2 px-4 py-3 text-[15px] cursor-pointer transition-all', ((answers[q.id] as string[])||[]).includes(String(oi)) ? 'border-pen bg-pen/[0.05] font-medium' : 'border-ink/10 bg-paper hover:border-ink/25']">
                  <input type="checkbox" :checked="((answers[q.id] as string[])||[]).includes(String(oi))" @change="selectOption(String(oi))" class="accent-pen w-4 h-4" />
                  <span class="font-mono text-xs text-ink/50">{{ String.fromCharCode(65+oi) }}.</span><MathText :text="opt" />
                </label>
              </template>
              <template v-else>
                <button v-for="(opt, oi) in q.options" :key="oi" @click="selectOption(String(oi+1))" :class="['text-left rounded-xl border-2 px-4 py-3 text-[15px] transition-all', answers[q.id]===String(oi+1) ? 'border-pen bg-pen text-white font-medium' : 'border-ink/10 bg-paper hover:border-ink/30']">
                  <span class="font-mono text-xs mr-2.5" :class="answers[q.id]===String(oi+1) ? 'text-white/70' : 'text-ink/50'">{{ String.fromCharCode(65+oi) }}.</span><MathText :text="opt" />
                </button>
              </template>
            </div>

            <div v-if="q.type==='nat'" class="mt-5">
              <input :value="answers[q.id]||''" @input="answers[q.id]=($event.target as HTMLInputElement).value" placeholder="Enter your numeric answer" class="border-2 border-ink/12 rounded-xl px-4 py-2.5 w-56 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 font-mono" />
            </div>

            <div class="mt-6 flex flex-wrap gap-2.5">
              <button class="px-4 py-2.5 rounded-xl border-2 border-hlyellow bg-hlyellow/30 text-sm font-bold text-ink/80 hover:bg-hlyellow/50 transition-colors" @click="mark">Mark for review</button>
              <button class="px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold ml-auto transition-transform hover:-translate-y-0.5" @click="go(idx+1)" v-if="idx < total-1">Save &amp; next →</button>
              <button class="px-5 py-2.5 rounded-xl bg-correct text-white text-sm font-bold ml-auto" @click="submit" v-else>Submit test</button>
            </div>
          </div>
        </div>
      </div>

      <!-- palette sidebar -->
      <div class="lg:w-72 bg-white border-t-2 lg:border-t-0 lg:border-l-2 border-ink/[0.07] p-4">
        <div class="text-xs font-bold uppercase tracking-[0.2em] text-ink/50">Palette</div>
        <div class="grid grid-cols-6 lg:grid-cols-5 gap-2 mt-3">
          <button v-for="(qq,i) in paper.questions" :key="qq.id" @click="go(i)" :class="['w-9 h-9 rounded-lg text-xs font-bold transition-all', idx===i ? 'ring-2 ring-pen ring-offset-2 ring-offset-white scale-110' : '', status[qq.id]==='answered' ? 'bg-correct text-white' : status[qq.id]==='marked' ? 'bg-hlyellow text-ink' : status[qq.id]==='markedAnswered' ? 'bg-hlyellow text-ink ring-2 ring-correct' : status[qq.id]==='notAnswered' ? 'bg-redmargin/10 text-redmargin border border-redmargin/40' : 'border border-dashed border-ink/25 text-ink/45']">{{ qq.number }}</button>
        </div>
        <div class="mt-5 grid grid-cols-2 gap-2">
          <button class="py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors disabled:opacity-40" @click="go(idx-1)" :disabled="idx===0">← Prev</button>
          <button class="py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors disabled:opacity-40" @click="go(idx+1)" :disabled="idx===total-1">Next →</button>
        </div>
        <div class="mt-5 space-y-1.5 text-[11px] text-ink/55 font-medium">
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-correct inline-block"></span> Answered</div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-redmargin/30 border border-redmargin/50 inline-block"></span> Not answered</div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-hlyellow inline-block"></span> Marked</div>
          <div class="flex items-center gap-2"><span class="w-3 h-3 rounded border border-dashed border-ink/30 inline-block"></span> Not visited</div>
        </div>
        <p class="font-hand text-lg text-ink/40 mt-5 -rotate-1">one at a time, no rush</p>
      </div>
    </div>
  </div>
</template>
