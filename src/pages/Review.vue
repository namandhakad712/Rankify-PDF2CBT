<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper, UniversalQuestion } from "@/types"
import { validatePaper } from "@/lib/validate"
import { getDB } from "@/lib/db"
import DiagramCropper from "@/components/review/DiagramCropper.vue"
import gsap from "gsap"

function handleSpotlight(e: MouseEvent) {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
  card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
}

const router = useRouter()
const paper = ref<UniversalPaper | null>(null)
const issues = ref<string>("")
const pdfName = ref<string | null>(null)
const pdfBuffer = ref<ArrayBuffer | null>(null)
const cropFor = ref<number | null>(null)

onMounted(async () => {
  setTimeout(() => gsap.from(".q-card", { y: 40, opacity: 0, duration: 0.6, stagger: 0.06, ease: "power2.out" }), 100)
  const raw = localStorage.getItem("rpdf2cbt-review")
  if (raw) {
    try { paper.value = JSON.parse(raw) } catch {}
  } else {
    const rec = await getDB().papers.get("review")
    if (rec) paper.value = rec.paper
  }
  pdfName.value = localStorage.getItem("rpdf2cbt-pdf-name")
  if (paper.value) {
    const iv = validatePaper(paper.value)
    issues.value = iv.map((x) => `[${x.severity}] ${x.qId ?? ""} ${x.field}: ${x.message}`).join("\n")
  }
  try {
    const rec = await getDB().pdfs.get("__pdf")
    if (rec?.buffer) pdfBuffer.value = rec.buffer
  } catch {}
})

function updateQ(idx: number, patch: Partial<UniversalQuestion>) {
  if (!paper.value) return
  paper.value.questions[idx] = { ...paper.value.questions[idx], ...patch }
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
  await getDB().papers.put({ id: "current", paper: paper.value, updatedAt: Date.now() })
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
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-5xl mx-auto px-5">
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/extract')">← back to extract</button>

      <div class="mt-4 flex flex-wrap items-end justify-between gap-4">
        <div>
          <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2">checking your copy</div>
          <h1 class="text-4xl md:text-5xl font-display font-extrabold tracking-tight">Review &amp; <span class="relative inline-block">crop<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlpink"></span></span></h1>
        </div>
        <p v-if="pdfName" class="font-hand text-xl text-ink/50 -rotate-1">source: {{ pdfName }}</p>
      </div>

      <div v-if="!paper" class="mt-8 relative rounded-lg bg-white p-10 text-center shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]">
        <div class="tape" aria-hidden="true"></div>
        <img src="/images/notebook/empty-extract.webp" alt="" class="w-40 mx-auto mb-4" loading="lazy" />
        <p class="font-display font-bold text-xl">No paper here yet.</p>
        <p class="text-ink/55 mt-1.5 text-[15px]">Paste your JSON in Extract first — takes 20 seconds.</p>
        <button class="mt-5 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold" @click="router.push('/extract')">Go to Extract</button>
      </div>

      <template v-else>
        <!-- paper header bar -->
        <div class="mt-7 relative rounded-lg bg-white p-4 pl-14 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] flex flex-wrap gap-3 items-center">
          <div class="pointer-events-none absolute inset-y-0 left-9 w-px bg-redmargin/40"></div>
          <input v-model="paper.meta.title" class="flex-1 min-w-48 border border-ink/12 rounded-lg px-3.5 py-2.5 font-semibold text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" />
          <span class="font-mono text-xs text-ink/50">{{ paper.questions.length }} Q</span>
          <button class="px-5 py-2.5 rounded-xl bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5" @click="saveAndGoTest">Save &amp; start test →</button>
        </div>

        <div v-if="issues" class="mt-4 p-4 bg-hlyellow/40 border border-hlyellow rounded-2xl text-xs text-ink/75 whitespace-pre-wrap">{{ issues }}</div>

        <!-- question sheets -->
        <div class="mt-6 grid gap-6">
          <div v-for="(q, i) in paper.questions" :key="q.id" class="q-card spotlight-card relative rounded-lg bg-white shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" @mousemove="handleSpotlight">
            <div class="pointer-events-none absolute inset-y-0 left-9 w-px bg-redmargin/25"></div>
            <div class="px-5 pl-14 py-5">
              <div class="flex items-center justify-between gap-3">
                <div class="font-mono text-[11px] tracking-wider text-ink/50 uppercase">Q{{ q.number }} · {{ q.type }} · {{ q.subject || 'no subject' }}<span v-if="q.pageNo" class="ml-2 bg-hlyellow/60 text-ink px-1.5 py-0.5 rounded normal-case">p.{{ q.pageNo }}</span></div>
                <label class="flex items-center gap-1.5 text-xs font-medium text-ink/60 cursor-pointer">
                  <input type="checkbox" :checked="q.hasDiagram" @change="toggleDiagram(i)" class="accent-pen" /> hasDiagram
                </label>
              </div>

              <textarea v-model="q.text" rows="2" class="mt-3 w-full border border-ink/12 rounded-xl p-3 text-[15px] bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" placeholder="Question text (markdown + $LaTeX$)"></textarea>

              <div v-if="q.options" class="mt-2.5 grid gap-1.5">
                <div v-for="(opt, oi) in q.options" :key="oi" class="flex gap-2.5 items-center">
                  <span class="font-mono text-xs w-6 text-ink/45">{{ String.fromCharCode(65+oi) }}.</span>
                  <input :value="opt" @input="q.options![oi] = ($event.target as HTMLInputElement).value" class="flex-1 border border-ink/12 rounded-lg px-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" />
                </div>
              </div>

              <div class="mt-3 flex flex-wrap gap-2.5 items-center text-sm">
                <span class="text-xs font-semibold text-ink/60">Answer:</span>
                <input v-model="q.answer" class="border border-ink/12 rounded-lg px-2.5 py-1.5 text-sm w-24 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" placeholder="1/42/…" />
                <span v-if="q.type==='msq'" class="text-xs font-semibold text-ink/60">answers: <input :value="(q.answers||[]).join(',')" @input="q.answers = ($event.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean)" class="border border-ink/12 rounded-lg px-2 py-1.5 text-xs w-28 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" /></span>
                <span class="ml-auto text-xs font-semibold text-ink/60">Marks <input v-model.number="q.marks" type="number" class="w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" /> Neg <input v-model.number="q.negativeMarks" type="number" class="w-14 border border-ink/12 rounded-lg px-2 py-1.5 bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40" /></span>
              </div>

              <!-- Manual crop per question -->
              <div class="mt-4 border-t border-dashed border-ink/15 pt-3.5">
                <div class="text-xs font-bold text-ink/70">Diagram — manual crop</div>
                <div v-if="q.diagrams?.length" class="mt-2.5 flex gap-2.5 flex-wrap">
                  <div v-for="(d,didx) in q.diagrams" :key="didx" class="relative group">
                    <img :src="d" class="w-28 rounded-lg border border-ink/10" loading="lazy" decoding="async" />
                    <button class="absolute -top-1.5 -right-1.5 bg-redmargin text-white rounded-full w-5.5 h-5.5 grid place-items-center text-xs shadow" @click="q.diagrams!.splice(didx,1)">×</button>
                  </div>
                </div>
                <button class="mt-2.5 px-4 py-2 rounded-lg border-2 border-ink/12 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors" @click="cropPlaceholder(i)">{{ q.hasDiagram ? '+ crop / add another' : 'Crop diagram' }}</button>
                <p class="font-hand text-lg text-ink/45 mt-1">drag a box on the pdf → it becomes the figure</p>
              </div>
            </div>
          </div>
        </div>

        <div class="mt-8 flex justify-end">
          <button class="px-7 py-3.5 rounded-xl bg-pen text-white text-sm font-bold shadow-[0_10px_30px_-10px_rgba(47,95,224,0.55)] transition-transform hover:-translate-y-0.5" @click="saveAndGoTest">Save &amp; start test →</button>
        </div>
      </template>
    </div>
    <DiagramCropper v-if="cropFor!==null && paper" :pdfBuffer="pdfBuffer" :initialPage="(paper.questions[cropFor]?.pageNo || 1)" @cropped="onCropped" @close="cropFor=null" />
  </div>
</template>

<style scoped>
.spotlight-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(420px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(47, 95, 224, 0.05), transparent 65%);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
  z-index: 1;
}
.spotlight-card:hover::before {
  opacity: 1;
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
</style>
