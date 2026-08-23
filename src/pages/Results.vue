<script setup lang="ts">
import { ref, onMounted, computed } from "vue"
import { useRouter } from "vue-router"
const router = useRouter()

interface LastResult { paper: import("@/types").UniversalPaper; answers: Record<string,string>; createdAt: number }
const result = ref<LastResult | null>(null)

onMounted(() => {
  const raw = localStorage.getItem("rpdf2cbt-last-result")
  if (raw) result.value = JSON.parse(raw)
})

const stats = computed(() => {
  if (!result.value) return null
  const qs = result.value.paper.questions
  let correct=0, wrong=0, unattempted=0, score=0
  const bySubject: Record<string,{total:number,correct:number}> = {}
  for (const q of qs) {
    const ans: string | string[] | undefined = result.value!.answers[q.id] as unknown as string | string[] | undefined
    const subj = q.subject || "General"
    if (!bySubject[subj]) bySubject[subj] = { total:0, correct:0 }
    bySubject[subj].total++
    const isMsq = q.type === "msq"
    const isCorrect = isMsq
      ? Array.isArray(ans) && (ans as string[]).slice().sort().join(",") === (q.answers||[]).slice().sort().join(",") && (ans as string[]).length>0
      : ans === q.answer
    const isAttempted = isMsq ? Array.isArray(ans) && (ans as string[]).length>0 : !!ans
    if (!isAttempted) unattempted++
    else if (isCorrect) { correct++; bySubject[subj].correct++; score += q.marks }
    else { wrong++; score += - (q.negativeMarks || 0) }
  }
  return { correct, wrong, unattempted, score, total: qs.length, bySubject }
})
</script>

<template>
  <div class="min-h-screen bg-zinc-50">
    <div class="max-w-4xl mx-auto px-4 py-6">
      <button class="text-sm underline" @click="router.push('/')">← Home</button>
      <h1 class="text-2xl font-bold mt-2">Results — Simple Analytics</h1>

      <div v-if="!result" class="mt-6 bg-white border rounded-xl p-6 text-center">
        <div class="text-sm">No result yet — take a test first.</div>
        <button class="mt-3 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm" @click="router.push('/extract')">Start</button>
      </div>

      <template v-else-if="stats">
        <div class="mt-4 grid grid-cols-4 gap-3">
          <div class="bg-white border rounded-xl p-4 text-center"><div class="text-2xl font-bold">{{ stats.score }}</div><div class="text-xs text-zinc-500">Score</div></div>
          <div class="bg-white border rounded-xl p-4 text-center"><div class="text-2xl font-bold text-green-600">{{ stats.correct }}</div><div class="text-xs text-zinc-500">Correct / {{ stats.total }}</div></div>
          <div class="bg-white border rounded-xl p-4 text-center"><div class="text-2xl font-bold text-red-600">{{ stats.wrong }}</div><div class="text-xs text-zinc-500">Wrong</div></div>
          <div class="bg-white border rounded-xl p-4 text-center"><div class="text-2xl font-bold text-zinc-400">{{ stats.unattempted }}</div><div class="text-xs text-zinc-500">Unattempted</div></div>
        </div>

        <div class="mt-4 bg-white border rounded-xl p-4">
          <div class="font-semibold text-sm">Subject Breakdown — Simple Bars (no echarts)</div>
          <div class="mt-3 grid gap-2">
            <div v-for="(v,k) in stats.bySubject" :key="k" class="flex items-center gap-3">
              <div class="w-24 text-xs">{{ k }}</div>
              <div class="flex-1 h-3 bg-zinc-100 rounded overflow-hidden flex">
                <div class="bg-green-600 h-full" :style="{width: (100*v.correct/v.total)+'%'}"></div>
              </div>
              <div class="text-xs w-16 text-right">{{ v.correct }}/{{ v.total }}</div>
            </div>
          </div>
        </div>

        <div class="mt-4 bg-white border rounded-xl p-4">
          <div class="font-semibold text-sm">Detailed</div>
          <div class="mt-2 grid gap-2">
            <div v-for="q in result.paper.questions" :key="q.id" class="flex gap-3 text-sm border rounded p-2" :class="(() => { const a: unknown = result!.answers[q.id]; const isMsq = q.type==='msq'; const correct = isMsq ? Array.isArray(a) && (a as string[]).slice().sort().join(',')===(q.answers||[]).slice().sort().join(',') : a===q.answer; const attempted = isMsq ? Array.isArray(a) && (a as string[]).length>0 : !!a; return correct ? 'bg-green-50 border-green-200' : attempted ? 'bg-red-50 border-red-200' : 'bg-zinc-50'; })()">
              <div class="w-8 font-mono text-xs">Q{{ q.number }}</div>
              <div class="flex-1 truncate">{{ q.text.slice(0,80) }}</div>
              <div class="text-xs">You: {{ Array.isArray(result!.answers[q.id]) ? ((result!.answers[q.id] as unknown as string[]).join(',') || '—') : (result!.answers[q.id] as unknown as string) || '—' }} · Ans: {{ q.type==='msq' ? (q.answers||[]).join(',') : q.answer }}</div>
            </div>
          </div>
        </div>

        <div class="mt-4 flex gap-2">
          <button class="px-4 py-2 rounded-full border text-sm" @click="router.push('/review')">Back to Review</button>
          <button class="px-4 py-2 rounded-full bg-zinc-900 text-white text-sm" @click="router.push('/extract')">New Test</button>
        </div>
      </template>
    </div>
  </div>
</template>
