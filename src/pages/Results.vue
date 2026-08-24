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
  gsap.from(".res-hero", { y: 40, opacity: 0, duration: 0.9, ease: "power4.out" })
  gsap.from(".stat-card", { y: 50, opacity: 0, duration: 0.7, stagger: 0.1, delay: 0.15, ease: "power3.out" })
  const s = stats.value!
  const scoreObj = { v: 0 }
  gsap.to(scoreObj, { v: s.score, duration: 1.6, delay: 0.4, ease: "power2.out", onUpdate: () => (scoreDisplay.value = Math.round(scoreObj.v)) })
  gsap.fromTo(".bar-fill", { width: "0%" }, { width: (i, el: HTMLElement) => el.dataset.w || "0%", duration: 1.2, delay: 0.6, stagger: 0.12, ease: "power3.out" })
  if (s.total > 0 && s.correct / s.total >= 0.6) {
    try {
      const confetti = (await import("canvas-confetti")).default
      confetti({ particleCount: 120, spread: 75, origin: { y: 0.35 }, colors: ["#2F5FE0", "#FFD84D", "#1FA45C", "#FF9EC0"] })
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

const grade = computed(() => {
  const s = stats.value
  if (!s || s.total === 0) return '—'
  const p = s.correct / s.total
  if (p >= 0.9) return 'A+'
  if (p >= 0.75) return 'A'
  if (p >= 0.6) return 'B'
  if (p >= 0.4) return 'C'
  return 'D'
})
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-4xl mx-auto px-5">
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/')">← home</button>

      <div class="res-hero mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2">checked · red pen time</div>
          <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">Your <span class="relative inline-block">report card<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlgreen"></span></span></h1>
        </div>
        <div v-if="stats" class="grade grid h-20 w-20 rotate-6 place-items-center rounded-full border-[3px] border-redmargin font-hand text-4xl font-bold text-redmargin bg-redmargin/[0.04]">{{ grade }}</div>
      </div>

      <div v-if="!result" class="mt-8 relative rounded-lg bg-white p-10 text-center shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
        <div class="tape" aria-hidden="true"></div>
        <p class="font-display font-bold text-xl">No result yet.</p>
        <p class="text-ink/55 mt-1.5 text-[15px]">Take a test first — the red pen is waiting.</p>
        <button class="mt-5 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">Start</button>
      </div>

      <template v-else-if="stats">
        <!-- stat cards -->
        <div class="mt-8 grid grid-cols-2 md:grid-cols-4 gap-4">
          <div class="stat-card rounded-2xl bg-white p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)]">
            <div class="text-4xl font-extrabold font-display tabular-nums">{{ scoreDisplay }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5">Score</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)]">
            <div class="text-4xl font-extrabold font-display tabular-nums text-correct">{{ stats.correct }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5">Correct / {{ stats.total }}</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)]">
            <div class="text-4xl font-extrabold font-display tabular-nums text-redmargin">{{ stats.wrong }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5">Wrong</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)]">
            <div class="text-4xl font-extrabold font-display tabular-nums text-ink/40">{{ stats.unattempted }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5">Skipped</div>
          </div>
        </div>

        <!-- subject bars -->
        <div class="mt-6 relative rounded-lg bg-white p-6 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
          <div class="pointer-events-none absolute inset-y-0 left-9 w-px bg-redmargin/25"></div>
          <div class="pl-6">
            <div class="font-display font-bold tracking-tight">Subject breakdown</div>
            <div class="mt-4 grid gap-3">
              <div v-for="(v,k) in stats.bySubject" :key="k" class="flex items-center gap-4">
                <div class="w-28 text-sm font-semibold text-ink/70 truncate">{{ k }}</div>
                <div class="flex-1 h-3.5 bg-paper rounded-full overflow-hidden border border-ink/[0.07]">
                  <div class="bar-fill h-full rounded-full bg-gradient-to-r from-pen to-correct" :data-w="(100*v.correct/v.total)+'%'" :style="{width: (100*v.correct/v.total)+'%'}"></div>
                </div>
                <div class="font-mono text-xs text-ink/55 w-14 text-right tabular-nums">{{ v.correct }}/{{ v.total }}</div>
              </div>
            </div>
          </div>
        </div>

        <!-- detailed -->
        <div class="mt-6 rounded-lg bg-white p-6 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
          <div class="font-display font-bold tracking-tight">Question by question</div>
          <div class="mt-4 grid gap-2">
            <div v-for="q in result.paper.questions" :key="q.id" class="flex gap-3 items-center text-sm rounded-xl border px-3.5 py-2.5" :class="(() => { const a: unknown = result!.answers[q.id]; const isMsq = q.type==='msq'; const correct = isMsq ? Array.isArray(a) && (a as string[]).slice().sort().join(',')===(q.answers||[]).slice().sort().join(',') : a===q.answer; const attempted = isMsq ? Array.isArray(a) && (a as string[]).length>0 : !!a; return correct ? 'bg-correct/[0.06] border-correct/30' : attempted ? 'bg-redmargin/[0.05] border-redmargin/30' : 'bg-paper border-ink/10'; })()">
              <div class="w-9 font-mono text-xs text-ink/50 shrink-0">Q{{ q.number }}</div>
              <div class="flex-1 truncate text-ink/80">{{ q.text.slice(0,80) }}</div>
              <div class="text-xs text-ink/55 shrink-0 hidden sm:block">you: <b class="text-ink/80">{{ Array.isArray(result!.answers[q.id]) ? ((result!.answers[q.id] as unknown as string[]).join(',') || '—') : (result!.answers[q.id] as unknown as string) || '—' }}</b> · ans: <b class="text-ink/80">{{ q.type==='msq' ? (q.answers||[]).join(',') : q.answer }}</b></div>
              <span class="shrink-0 w-5 h-5 grid place-items-center rounded-full text-white text-[10px] font-bold" :class="(() => { const a: unknown = result!.answers[q.id]; const isMsq = q.type==='msq'; const correct = isMsq ? Array.isArray(a) && (a as string[]).slice().sort().join(',')===(q.answers||[]).slice().sort().join(',') : a===q.answer; const attempted = isMsq ? Array.isArray(a) && (a as string[]).length>0 : !!a; return correct ? 'bg-correct' : attempted ? 'bg-redmargin' : 'bg-ink/25'; })()">✓</span>
            </div>
          </div>
        </div>

        <p class="mt-6 font-hand text-2xl text-ink/50 -rotate-1">{{ stats.correct / stats.total >= 0.6 ? 'shabash! keep this streak going' : 'agle attempt me pakka — review the red ones' }}</p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button class="px-5 py-2.5 rounded-xl border-2 border-ink/12 text-sm font-bold text-ink/70 hover:border-ink/30 transition-colors" @click="router.push('/review')">Back to review</button>
          <button class="px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">New test</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
.tape {
  position: absolute;
  top: -12px;
  left: 50%;
  width: 92px;
  height: 26px;
  transform: translateX(-50%) rotate(-2deg);
  background: rgba(251, 248, 241, 0.7);
  border-left: 1px dashed rgba(35, 32, 58, 0.12);
  border-right: 1px dashed rgba(35, 32, 58, 0.12);
  box-shadow: 0 2px 6px rgba(35, 32, 58, 0.08);
}
.grade {
  box-shadow: 0 8px 24px -10px rgba(242, 109, 109, 0.5);
}
</style>
