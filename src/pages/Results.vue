<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, onMounted, computed, nextTick } from "vue"
import { useRouter } from "vue-router"
import gsap from "gsap"
import { t } from "@/lib/i18n"
const router = useRouter()

interface LastResult { paper: import("@/types").UniversalPaper; answers: Record<string,string>; createdAt: number }
const result = ref<LastResult | null>(null)
const scoreDisplay = ref(0)

onMounted(async () => {
  const raw = localStorage.getItem("rpdf2cbt-last-result")
  if (raw) { try { result.value = JSON.parse(raw) } catch {} }
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

const analytics = computed(() => {
  const s = stats.value
  if (!s || !result.value) return null
  let maxMarks = 0
  for (const q of result.value.paper.questions) maxMarks += q.marks || 0
  const attempted = s.correct + s.wrong
  const pct = maxMarks ? Math.round((s.score / maxMarks) * 100) : 0
  const accuracy = attempted ? Math.round((s.correct / attempted) * 100) : 0
  const segs = [
    { key: "correct", n: s.correct, color: "#1FA45C" },
    { key: "wrong", n: s.wrong, color: "#F26D6D" },
    { key: "skipped", n: s.unattempted, color: "#C9C6D8" },
  ].filter((x) => x.n > 0)
  const C = 2 * Math.PI * 54
  let acc = 0
  const arcs = segs.map((seg) => {
    const len = s.total ? (seg.n / s.total) * C : 0
    const arc = { ...seg, dasharray: `${len} ${C - len}`, offset: C / 4 - acc }
    acc += len
    return arc
  })
  const strip = result.value.paper.questions.map((q) => {
    const a: unknown = result.value!.answers[q.id]
    const isMsq = q.type === "msq"
    const correct = isMsq ? Array.isArray(a) && (a as string[]).slice().sort().join(",") === (q.answers || []).slice().sort().join(",") : a === q.answer
    const att = isMsq ? Array.isArray(a) && (a as string[]).length > 0 : !!a
    return { id: q.id, num: q.number, st: (correct ? "c" : att ? "w" : "s") as "c" | "w" | "s" }
  })
  // per-type performance
  const byType: Record<string, { total: number; correct: number }> = {}
  for (const q of result.value.paper.questions) {
    const tt = byType[q.type] || (byType[q.type] = { total: 0, correct: 0 })
    tt.total++
    const st = strip.find((x) => x.id === q.id)!.st
    if (st === "c") tt.correct++
  }
  return { maxMarks, pct, accuracy, arcs, strip, attempted, byType }
})

function verdictOf(q: import("@/types").UniversalQuestion): "c" | "w" | "s" {
  const a: unknown = result.value?.answers[q.id]
  const isMsq = q.type === "msq"
  const correct = isMsq ? Array.isArray(a) && (a as string[]).slice().sort().join(",") === (q.answers || []).slice().sort().join(",") : a === q.answer
  const att = isMsq ? Array.isArray(a) && (a as string[]).length > 0 : !!a
  return correct ? "c" : att ? "w" : "s"
}

/** human-readable "your answer" — option TEXT not raw index */
function yourAnswerText(q: import("@/types").UniversalQuestion): string {
  const a: unknown = result.value?.answers[q.id]
  if (q.type === "msq") {
    if (!Array.isArray(a) || !a.length) return "—"
    return a.map((i) => q.options?.[Number(i)] ?? `${t("results.optFallback")} ${i}`).join("  ·  ")
  }
  if (a == null || a === "") return "—"
  if (q.options && /^\d+$/.test(String(a))) return q.options[Number(a) - 1] ?? String(a)
  return String(a)
}

function correctAnswerText(q: import("@/types").UniversalQuestion): string {
  if (q.type === "msq") return (q.answers || []).map((i) => q.options?.[Number(i)] ?? `${t("results.optFallback")} ${i}`).join("  ·  ") || "—"
  if (q.options && /^\d+$/.test(q.answer)) return q.options[Number(q.answer) - 1] ?? q.answer
  return q.answer || "—"
}

const takenMeta = computed(() => ({
  when: result.value ? new Date(result.value.createdAt).toLocaleString() : "—",
  platform: `Rankify PDF2CBT · ${t("results.webApp")}`,
  duration: result.value ? `${result.value.paper.meta.durationMinutes} min` : "—",
}))

function exportPdf() { window.print() }

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
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/')">{{ t('common.backHome') }}</button>

      <div class="res-hero mt-3 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2">{{ t('results.eyebrow') }}</div>
          <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">{{ t('results.h1a') }}<span class="relative inline-block">{{ t('results.h1b') }}<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlgreen"></span></span></h1>
        </div>
        <div class="flex items-center gap-3">
          <button class="no-print px-4 py-2.5 rounded-xl border-2 border-ink/12 text-sm font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors" @click="exportPdf">⤓ {{ t('results.exportPdf') }}</button>
          <div v-if="stats" class="grade grid h-20 w-20 rotate-6 place-items-center rounded-full border-[3px] border-redmargin font-hand text-4xl font-bold text-redmargin bg-redmargin/[0.04]">{{ grade }}</div>
        </div>
      </div>

      <!-- print-only report header -->
      <div class="hidden print:block border-b-2 border-ink pb-3 mb-4">
        <div class="flex items-baseline justify-between">
          <div>
            <div class="font-display font-extrabold text-xl">Rankify <span class="text-pen">PDF2CBT</span></div>
            <div class="font-mono text-[10px] text-ink/60">{{ result ? result.paper.meta.title : '' }} — {{ t('results.print.official') }}</div>
          </div>
          <div class="font-mono text-[10px] text-ink/60 text-right">
            <div>{{ t('results.print.taken') }} {{ takenMeta.when }}</div>
            <div>{{ t('results.print.platform') }} {{ takenMeta.platform }}</div>
            <div>{{ t('results.print.duration') }} {{ takenMeta.duration }} · {{ result?.paper.questions.length }} {{ t('results.print.questions') }}</div>
          </div>
        </div>
      </div>

      <div v-if="!result" class="mt-8 relative rounded-lg bg-white p-10 text-center shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
        <div class="tape" aria-hidden="true"></div>
        <img src="/images/notebook/empty-result.webp" alt="" class="w-40 mx-auto mb-4" loading="lazy" />
        <p class="font-display font-bold text-xl">{{ t('results.empty.title') }}</p>
        <p class="text-ink/55 mt-1.5 text-[15px]">{{ t('results.empty.sub') }}</p>
        <button class="mt-5 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">{{ t('results.empty.cta') }}</button>
      </div>

      <template v-else-if="stats">
        <!-- stat cards -->
        <div class="mt-8 grid grid-cols-2 gap-3 lg:gap-4 md:grid-cols-4">
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
            <div class="text-3xl lg:text-4xl font-extrabold font-display tabular-nums break-words">{{ scoreDisplay }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5 break-words">{{ t('results.score') }}</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
            <div class="text-3xl lg:text-4xl font-extrabold font-display tabular-nums text-correct break-words">{{ stats.correct }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5 break-words">{{ t('results.correct') }} / {{ stats.total }}</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
            <div class="text-3xl lg:text-4xl font-extrabold font-display tabular-nums text-redmargin break-words">{{ stats.wrong }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5 break-words">{{ t('results.wrong') }}</div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-6 text-center ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
            <div class="text-3xl lg:text-4xl font-extrabold font-display tabular-nums text-ink/40 break-words">{{ stats.unattempted }}</div>
            <div class="font-mono text-[10px] uppercase tracking-[0.2em] text-ink/45 mt-1.5 break-words">{{ t('results.skipped') }}</div>
          </div>
        </div>

        <!-- analytics row: donut + marks -->
        <div v-if="analytics" class="mt-6 grid grid-cols-1 gap-4 md:grid-cols-[auto_1fr]">
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-5 flex flex-col sm:flex-row items-center gap-4 lg:gap-5 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
            <svg viewBox="0 0 128 128" class="w-32 h-32 lg:w-36 lg:h-36 -rotate-0 shrink-0">
              <circle cx="64" cy="64" r="54" fill="none" stroke="#EFEDE6" stroke-width="16" />
              <circle v-for="(a, ai) in analytics.arcs" :key="ai" cx="64" cy="64" r="54" fill="none" :stroke="a.color" stroke-width="16" stroke-linecap="butt" :stroke-dasharray="a.dasharray" :stroke-dashoffset="a.offset" class="donut-seg" />
              <text x="64" y="60" text-anchor="middle" class="fill-ink font-display font-extrabold" style="font-size: 22px">{{ analytics.pct }}%</text>
              <text x="64" y="78" text-anchor="middle" class="fill-ink/50 font-mono" style="font-size: 9px">{{ t('results.ofMax') }}</text>
            </svg>
            <div class="space-y-1.5 text-xs font-semibold text-ink/60 w-full sm:w-auto">
              <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-correct shrink-0"></span> {{ t('results.correct') }} · {{ stats.correct }}</div>
              <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-redmargin shrink-0"></span> {{ t('results.wrong') }} · {{ stats.wrong }}</div>
              <div class="flex items-center gap-2"><span class="w-3 h-3 rounded bg-ink/20 shrink-0"></span> {{ t('results.skipped') }} · {{ stats.unattempted }}</div>
            </div>
          </div>
          <div class="stat-card rounded-2xl bg-white p-4 lg:p-5 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] grid grid-cols-3 gap-2 lg:gap-3 content-center overflow-hidden">
            <div class="min-w-0"><div class="font-mono text-[10px] uppercase tracking-wider text-ink/45 break-words">{{ t('results.score') }}</div><div class="text-lg lg:text-xl font-extrabold font-display tabular-nums break-words">{{ stats.score }}<span class="text-ink/40 text-sm">/{{ analytics.maxMarks }}</span></div></div>
            <div class="min-w-0"><div class="font-mono text-[10px] uppercase tracking-wider text-ink/45 break-words">{{ t('results.acc') }}</div><div class="text-lg lg:text-xl font-extrabold font-display tabular-nums text-correct break-words">{{ analytics.accuracy }}%</div></div>
            <div class="min-w-0"><div class="font-mono text-[10px] uppercase tracking-wider text-ink/45 break-words">{{ t('results.attemptedLbl') }}</div><div class="text-lg lg:text-xl font-extrabold font-display tabular-nums break-words">{{ analytics.attempted }}<span class="text-ink/40 text-sm">/{{ stats.total }}</span></div></div>
            <!-- verdict strip -->
            <div class="col-span-3 mt-1 min-w-0">
              <div class="flex flex-wrap gap-1">
                <span v-for="s in analytics.strip" :key="s.id" :title="'Q' + s.num" :class="['w-5 h-5 rounded grid place-items-center font-mono text-[8px] font-bold shrink-0', s.st === 'c' ? 'bg-correct/85 text-white' : s.st === 'w' ? 'bg-redmargin/85 text-white' : 'bg-ink/[0.12] text-ink/50']">{{ s.num }}</span>
              </div>
              <div class="font-mono text-[9px] uppercase tracking-wider text-ink/35 mt-1.5 break-words">{{ t('results.qmap') }}</div>
            </div>
          </div>
        </div>

        <!-- subject bars -->
        <div class="mt-6 relative rounded-lg bg-white p-4 lg:p-6 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden">
          <div class="pointer-events-none absolute inset-y-0 left-9 w-px bg-redmargin/25 hidden sm:block"></div>
          <div class="pl-0 sm:pl-6">
            <div class="font-display font-bold tracking-tight break-words">{{ t('results.breakdown') }}</div>
            <div class="mt-4 grid gap-3">
              <div v-for="(v,k) in stats.bySubject" :key="k" class="flex flex-col sm:flex-row sm:items-center gap-1.5 sm:gap-4 min-w-0">
                <div class="w-full sm:w-28 text-sm font-semibold text-ink/70 truncate break-words min-w-0">{{ k }}</div>
                <div class="flex items-center gap-2 flex-1 min-w-0">
                  <div class="flex-1 h-3.5 bg-paper rounded-full overflow-hidden border border-ink/[0.07] min-w-0">
                    <div class="bar-fill h-full rounded-full bg-gradient-to-r from-pen to-correct" :data-w="(100*v.correct/v.total)+'%'" :style="{width: (100*v.correct/v.total)+'%'}"></div>
                  </div>
                  <div class="font-mono text-xs text-ink/55 w-14 text-right tabular-nums shrink-0">{{ v.correct }}/{{ v.total }}</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- per-type performance -->
        <div v-if="analytics && Object.keys(analytics.byType).length > 1" class="stat-card mt-6 rounded-2xl bg-white p-4 lg:p-5 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.25)] overflow-hidden">
          <div class="font-display font-bold tracking-tight text-sm break-words">{{ t('results.byType') }}</div>
          <div class="mt-3 grid gap-2.5">
            <div v-for="(v, k) in analytics.byType" :key="k" class="flex items-center gap-2 lg:gap-3 min-w-0">
              <span class="w-14 lg:w-16 font-mono text-[10px] font-bold uppercase tracking-wider text-ink/55 shrink-0 break-words">{{ k }}</span>
              <div class="flex-1 h-3 bg-paper rounded-full overflow-hidden border border-ink/[0.07] min-w-0">
                <div class="bar-fill h-full rounded-full bg-pen" :data-w="(100 * v.correct / v.total) + '%'" :style="{ width: (100 * v.correct / v.total) + '%' }"></div>
              </div>
              <span class="font-mono text-[10px] text-ink/50 w-10 lg:w-12 text-right tabular-nums shrink-0">{{ v.correct }}/{{ v.total }}</span>
            </div>
          </div>
        </div>

        <!-- detailed -->
        <div class="mt-6 rounded-lg bg-white p-4 lg:p-6 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden">
          <div class="font-display font-bold tracking-tight break-words">{{ t('results.detail') }}</div>
          <div class="mt-4 grid gap-2.5">
            <div v-for="q in result.paper.questions" :key="q.id" class="rounded-xl border px-3 py-2.5 lg:px-3.5 min-w-0 overflow-hidden" :class="verdictOf(q) === 'c' ? 'bg-correct/[0.05] border-correct/30' : verdictOf(q) === 'w' ? 'bg-redmargin/[0.04] border-redmargin/30' : 'bg-paper border-ink/10'">
              <div class="flex gap-2 lg:gap-3 items-start text-sm min-w-0">
                <div class="w-9 font-mono text-xs text-ink/50 shrink-0">Q{{ q.number }}</div>
                <div class="flex-1 min-w-0 text-ink/80 break-words line-clamp-2">{{ q.text.slice(0, 90) }}</div>
                <span :class="['shrink-0 w-6 h-6 grid place-items-center rounded-full text-[11px] font-bold text-white', verdictOf(q) === 'c' ? 'bg-correct' : verdictOf(q) === 'w' ? 'bg-redmargin' : 'bg-ink/30']">{{ verdictOf(q) === 'c' ? '✓' : verdictOf(q) === 'w' ? '✗' : '–' }}</span>
              </div>
              <div class="mt-1.5 pl-0 lg:pl-12 grid grid-cols-1 sm:grid-cols-2 gap-1 text-[12px] min-w-0">
                <div :class="verdictOf(q) === 'w' ? 'text-redmargin' : 'text-ink/60'" class="min-w-0 break-words"><span class="font-mono text-[9px] uppercase tracking-wider opacity-70 mr-1">{{ t('results.you') }}</span><b class="font-semibold break-words break-all">{{ yourAnswerText(q).slice(0, 70) }}</b></div>
                <div class="text-green-700 min-w-0 break-words"><span class="font-mono text-[9px] uppercase tracking-wider opacity-70 mr-1">{{ t('results.ans') }}</span><b class="font-semibold break-words break-all">{{ correctAnswerText(q).slice(0, 70) }}</b></div>
              </div>
            </div>
          </div>
        </div>

        <p class="mt-6 font-hand text-2xl text-ink/50 -rotate-1">{{ stats.correct / stats.total >= 0.6 ? t('results.good') : t('results.bad') }}</p>

        <div class="mt-4 flex flex-wrap gap-3">
          <button class="px-5 py-2.5 rounded-xl border-2 border-ink/12 text-sm font-bold text-ink/70 hover:border-ink/30 transition-colors" @click="router.push('/review')">{{ t('results.backReview') }}</button>
          <button class="px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">{{ t('results.newTest') }}</button>
        </div>
      </template>
    </div>
  </div>
</template>

<style scoped>
@media print {
  .no-print, header, nav { display: none !important; }
  body { background: white !important; }
  .res-hero h1 { font-size: 2rem; }
}
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
.grade {
  box-shadow: 0 8px 24px -10px rgba(242, 109, 109, 0.5);
}
</style>
