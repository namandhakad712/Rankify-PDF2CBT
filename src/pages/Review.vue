<script setup lang="ts">
import { ref, onMounted } from "vue"
import { useRouter } from "vue-router"
import type { UniversalPaper, UniversalQuestion } from "@/types"
import { validatePaper } from "@/lib/validate"
import { getDB } from "@/lib/db"
import DiagramCropper from "@/components/review/DiagramCropper.vue"

const router = useRouter()
const paper = ref<UniversalPaper | null>(null)
const issues = ref<string>("")
const pdfName = ref<string | null>(null)
const pdfBuffer = ref<ArrayBuffer | null>(null)
const cropFor = ref<number | null>(null)

onMounted(async () => {
  const raw = localStorage.getItem("rpdf2cbt-review")
  if (raw) {
    try { paper.value = JSON.parse(raw) } catch {}
  } else {
    // try IDB
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
  <div class="min-h-screen bg-zinc-50">
    <div class="max-w-5xl mx-auto px-4 py-6">
      <button class="text-sm underline" @click="router.push('/extract')">← Extract</button>
      <h1 class="text-2xl font-bold mt-2">Review — Edit & Crop Diagrams</h1>
      <p v-if="pdfName" class="text-xs text-zinc-500">PDF: {{ pdfName }} — per-question crop below</p>

      <div v-if="!paper" class="mt-6 bg-white border rounded-xl p-6 text-center">
        <div class="text-sm">No paper — paste JSON in Extract first.</div>
        <button class="mt-3 px-4 py-2 rounded-full bg-zinc-900 text-white text-sm" @click="router.push('/extract')">Go to Extract</button>
      </div>

      <template v-else>
        <div class="mt-4 bg-white border rounded-xl p-4 flex gap-4 items-center">
          <input v-model="paper.meta.title" class="flex-1 border rounded px-3 py-2 font-medium" />
          <span class="text-xs text-zinc-500">{{ paper.questions.length }} Q</span>
          <button class="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm" @click="saveAndGoTest">Save & Start Test →</button>
        </div>

        <div v-if="issues" class="mt-3 p-3 bg-amber-50 border border-amber-200 rounded text-xs whitespace-pre-wrap">{{ issues }}</div>

        <div class="mt-4 grid gap-4">
          <div v-for="(q, i) in paper.questions" :key="q.id" class="bg-white border rounded-xl p-4">
            <div class="flex items-start justify-between gap-3">
              <div class="text-xs font-mono text-zinc-500">Q{{ q.number }} · {{ q.type }} · {{ q.subject || 'No subject' }}</div>
              <label class="flex items-center gap-1 text-xs"><input type="checkbox" :checked="q.hasDiagram" @change="toggleDiagram(i)" /> hasDiagram</label>
            </div>

            <textarea v-model="q.text" rows="2" class="mt-2 w-full border rounded p-2 text-sm" placeholder="Question text (markdown + $LaTeX$)"></textarea>

            <div v-if="q.options" class="mt-2 grid gap-1">
              <div v-for="(opt, oi) in q.options" :key="oi" class="flex gap-2">
                <span class="text-xs w-6 pt-2">{{ String.fromCharCode(65+oi) }}.</span>
                <input :value="opt" @input="q.options![oi] = ($event.target as HTMLInputElement).value" class="flex-1 border rounded px-2 py-1 text-sm" />
              </div>
            </div>

            <div class="mt-2 flex gap-2 items-center">
              <span class="text-xs">Answer:</span>
              <input v-model="q.answer" class="border rounded px-2 py-1 text-sm w-24" placeholder="1/42/..." />
              <span v-if="q.type==='msq'" class="text-xs">answers: <input :value="(q.answers||[]).join(',')" @input="q.answers = ($event.target as HTMLInputElement).value.split(',').map(s=>s.trim()).filter(Boolean)" class="border rounded px-1 py-1 text-xs w-24" /></span>
              <span class="ml-auto text-xs">Marks <input v-model.number="q.marks" type="number" class="w-12 border rounded px-1 py-1" /> Neg <input v-model.number="q.negativeMarks" type="number" class="w-12 border rounded px-1 py-1" /></span>
            </div>

            <!-- Manual crop per question -->
            <div class="mt-3 border-t pt-3">
              <div class="text-xs font-medium">Diagram — Manual crop per question</div>
              <div v-if="q.diagrams?.length" class="mt-2 flex gap-2 flex-wrap">
                <div v-for="(d,didx) in q.diagrams" :key="didx" class="relative">
                  <img :src="d" class="w-28 border rounded" />
                  <button class="absolute -top-1 -right-1 bg-red-600 text-white rounded-full w-5 h-5 text-xs" @click="q.diagrams!.splice(didx,1)">×</button>
                </div>
              </div>
              <button class="mt-2 px-3 py-1.5 rounded border text-xs" @click="cropPlaceholder(i)">{{ q.hasDiagram ? '+ Crop / Add' : 'Crop Diagram' }}</button>
              <div class="text-[11px] text-zinc-400 mt-1">Drag on PDF canvas → Crop → saves dataURL.</div>
            </div>
          </div>
        </div>

        <div class="mt-6 flex justify-end">
          <button class="px-6 py-3 rounded-full bg-zinc-900 text-white text-sm" @click="saveAndGoTest">Save & Start Test →</button>
        </div>
      </template>
    </div>
    <DiagramCropper v-if="cropFor!==null" :pdfBuffer="pdfBuffer" :initialPage="1" @cropped="onCropped" @close="cropFor=null" />
  </div>
</template>
