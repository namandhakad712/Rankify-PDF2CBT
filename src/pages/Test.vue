<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper } from "@/types"
import { getDB } from "@/lib/db"

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
  // also save to DB results — handle msq correctly
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
  <div v-if="!paper" class="min-h-screen grid place-items-center"><div class="text-center"><div>No test data</div><button class="mt-3 px-4 py-2 rounded bg-zinc-900 text-white" @click="router.push('/review')">Go to Review</button></div></div>
  <div v-else class="min-h-screen bg-zinc-50 flex flex-col">
    <div class="bg-white border-b px-4 py-2 flex items-center justify-between">
      <div class="font-semibold">{{ paper.meta.title }}</div>
      <div class="font-mono text-sm">{{ fmt }}</div>
      <button class="px-4 py-1.5 rounded bg-zinc-900 text-white text-sm" @click="submit">Submit</button>
    </div>
    <div class="flex-1 flex">
      <div class="flex-1 p-4">
        <div v-if="q" class="bg-white border rounded-xl p-4">
          <div class="text-xs text-zinc-500">Q{{ q.number }} · {{ q.type }} · {{ q.subject || '' }} <span v-if="q.hasDiagram" class="ml-2 bg-amber-100 px-1 rounded">diagram</span></div>
          <div class="mt-2 text-sm whitespace-pre-wrap">{{ q.text }}</div>
          <div v-if="q.diagrams?.length" class="mt-2 flex gap-2 flex-wrap"><img v-for="d in q.diagrams" :key="d" :src="d" class="max-h-40 border rounded bg-white" /></div>
          <div v-if="q.options" class="mt-4 grid gap-2">
            <template v-if="q.type==='msq'">
              <label v-for="(opt, oi) in q.options" :key="oi" :class="['flex items-center gap-2 text-left border rounded px-3 py-2 text-sm cursor-pointer', ((answers[q.id] as string[])||[]).includes(String(oi)) ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white']">
                <input type="checkbox" :checked="((answers[q.id] as string[])||[]).includes(String(oi))" @change="selectOption(String(oi))" class="accent-zinc-900" />
                <span class="font-mono text-xs">{{ String.fromCharCode(65+oi) }}.</span>{{ opt }}
              </label>
            </template>
            <template v-else>
              <button v-for="(opt, oi) in q.options" :key="oi" @click="selectOption(String(oi+1))" :class="['text-left border rounded px-3 py-2 text-sm', answers[q.id]===String(oi+1) ? 'bg-zinc-900 text-white border-zinc-900' : 'bg-white']">
                <span class="font-mono text-xs mr-2">{{ String.fromCharCode(65+oi) }}.</span>{{ opt }}
              </button>
            </template>
          </div>
          <div v-if="q.type==='nat'" class="mt-4"><input :value="answers[q.id]||''" @input="answers[q.id]=($event.target as HTMLInputElement).value" placeholder="Enter numeric answer" class="border rounded px-3 py-2 w-48" /></div>
          <div class="mt-4 flex gap-2">
            <button class="px-4 py-2 rounded border text-sm" @click="mark">Mark for Review</button>
            <button class="px-4 py-2 rounded bg-zinc-900 text-white text-sm ml-auto" @click="go(idx+1)" v-if="idx < total-1">Save & Next →</button>
            <button class="px-4 py-2 rounded bg-violet-600 text-white text-sm ml-auto" @click="submit" v-else>Submit</button>
          </div>
        </div>
      </div>
      <div class="w-64 bg-white border-l p-3">
        <div class="text-xs font-semibold">Palette</div>
        <div class="grid grid-cols-5 gap-2 mt-2">
          <button v-for="(qq,i) in paper.questions" :key="qq.id" @click="go(i)" :class="['w-8 h-8 rounded text-xs border', idx===i ? 'ring-2 ring-violet-500' : '', status[qq.id]==='answered' ? 'bg-green-600 text-white' : status[qq.id]==='marked' ? 'bg-purple-600 text-white' : status[qq.id]==='markedAnswered' ? 'bg-purple-600 text-white ring-1' : 'bg-zinc-100']">{{ qq.number }}</button>
        </div>
        <div class="mt-4 flex gap-2">
          <button class="flex-1 py-2 border rounded text-xs" @click="go(idx-1)" :disabled="idx===0">Prev</button>
          <button class="flex-1 py-2 border rounded text-xs" @click="go(idx+1)" :disabled="idx===total-1">Next</button>
        </div>
      </div>
    </div>
  </div>
</template>
