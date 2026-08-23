<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, onMounted, computed, nextTick } from "vue"
import { useRouter } from "vue-router"
import gsap from "gsap"
const router = useRouter()

interface LastResult { paper: import("@/types").UniversalPaper; answers: Record<string,string>; createdAt: number }
const result = ref<LastResult | null>(null)
const scoreDisplay = ref(0)

onMounted(async () => {
  const raw = localStorage.getItem("rpdf2cbt-last-result")
  if (raw) result.value = JSON.parse(raw)
  if (!result.value) return
  await nextTick()
  // Awwwards entrance + count-up + staggered bars
  gsap.from(".res-hero", { y: 40, opacity: 0, duration: 0.9, ease: "power4.out" })
  gsap.from(".stat-card", { y: 50, opacity: 0, duration: 0.7, stagger: 0.1, delay: 0.15, ease: "power3.out" })
  const s = stats.value!
  const scoreObj = { v: 0 }
  gsap.to(scoreObj, { v: s.score, duration: 1.6, delay: 0.4, ease: "power2.out", onUpdate: () => (scoreDisplay.value = Math.round(scoreObj.v)) })
  gsap.fromTo(".bar-fill", { width: "0%" }, { width: (i, el: HTMLElement) => el.dataset.w || "0%", duration: 1.2, delay: 0.6, stagger: 0.12, ease: "power3.out" })
  // Confetti for passing scores
  if (s.total > 0 && s.correct / s.total >= 0.6) {
    try {
      const confetti = (await import("canvas-confetti")).default
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 }, colors: ["#a855f7", "#3b82f6", "#22c55e"] })
    } catch {}
  }
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
  <div class="min-h-screen bg-background text-foreground font-sans pt-28 pb-10">
    <AppNav />
    <div class="max-w-4xl mx-auto px-4 py-6">
      <button class="text-sm underline text-muted-foreground hover:text-foreground transition-colors" @click="router.push('/')">← Home</button>
      <h1 class="res-hero text-4xl md:text-5xl font-display font-black tracking-tighter mt-2">Results — <span class="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500">Analytics</span></h1>

      <div v-if="!result" class="mt-6 spotlight-card rounded-3xl p-8 text-center">
        <div class="text-sm">No result yet — take a test first.</div>
        <button class="mt-3 px-6 py-3 rounded-full bg-purple-600 text-white text-sm font-bold" @click="router.push('/extract')">Start</button>
      </div>

      <template v-else-if="stats">
        <div class="mt-6 grid grid-cols-4 gap-3">
          <div class="stat-card spotlight-card rounded-2xl p-5 text-center"><div class="text-3xl font-black font-display">{{ scoreDisplay }}</div><div class="text-xs text-muted-foreground mt-1">Score</div></div>
          <div class="stat-card spotlight-card rounded-2xl p-5 text-center"><div class="text-3xl font-black font-display text-green-600">{{ stats.correct }}</div><div class="text-xs text-muted-foreground mt-1">Correct / {{ stats.total }}</div></div>
          <div class="stat-card spotlight-card rounded-2xl p-5 text-center"><div class="text-3xl font-black font-display text-red-600">{{ stats.wrong }}</div><div class="text-xs text-muted-foreground mt-1">Wrong</div></div>
          <div class="stat-card spotlight-card rounded-2xl p-5 text-center"><div class="text-3xl font-black font-display text-muted-foreground">{{ stats.unattempted }}</div><div class="text-xs text-muted-foreground mt-1">Unattempted</div></div>
        </div>

        <div class="mt-4 bg-white border rounded-xl p-4">
          <div class="font-semibold text-sm">Subject Breakdown — Simple Bars (no echarts)</div>
          <div class="mt-3 grid gap-2">
            <div v-for="(v,k) in stats.bySubject" :key="k" class="flex items-center gap-3">
              <div class="w-24 text-xs">{{ k }}</div>
              <div class="flex-1 h-3 bg-zinc-100 dark:bg-zinc-800 rounded overflow-hidden flex">
                <div class="bar-fill bg-gradient-to-r from-purple-500 to-blue-500 h-full" :data-w="(100*v.correct/v.total)+'%'" :style="{width: (100*v.correct/v.total)+'%'}"></div>
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
