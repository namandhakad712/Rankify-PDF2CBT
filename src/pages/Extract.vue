<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import { providers, providerOptions } from "@/lib/providers"
import { extractPdfText } from "@/lib/pdf"
import gsap from "gsap"
import { Sparkles, UploadCloud, ClipboardPaste, Cpu, ArrowRight } from "lucide-vue-next"

// --- Awwwards entrance ---
onMounted(() => {
  gsap.from(".ex-hero-badge", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" })
  gsap.from(".ex-title", { y: 40, opacity: 0, duration: 0.9, delay: 0.1, ease: "power4.out" })
  gsap.from(".ex-sub", { y: 20, opacity: 0, duration: 0.8, delay: 0.25, ease: "power3.out" })
  gsap.from(".spotlight-card", { y: 50, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.35, ease: "power2.out" })
})

function handleSpotlight(e: MouseEvent) {
  const card = e.currentTarget as HTMLElement
  const rect = card.getBoundingClientRect()
  card.style.setProperty("--mouse-x", `${e.clientX - rect.left}px`)
  card.style.setProperty("--mouse-y", `${e.clientY - rect.top}px`)
}

function handleMagnetic(e: MouseEvent) {
  const btn = e.currentTarget as HTMLElement
  const rect = btn.getBoundingClientRect()
  gsap.to(btn, { x: (e.clientX - rect.left - rect.width / 2) * 0.25, y: (e.clientY - rect.top - rect.height / 2) * 0.25, duration: 0.4, ease: "power2.out" })
}
function resetMagnetic(e: MouseEvent) {
  gsap.to(e.currentTarget as HTMLElement, { x: 0, y: 0, duration: 0.9, ease: "elastic.out(1, 0.3)" })
}

const router = useRouter()
const pdfFile = ref<File | null>(null)
const pasteText = ref("")
const pasteUrl = ref("")
const error = ref<string | null>(null)
const issuesText = ref<string | null>(null)
const parsing = ref(false)

function onPdf(e: Event) {
  const t = e.target as HTMLInputElement
  if (t.files?.[0]) {
    const f = t.files[0]
    if (f.size > 20 * 1024 * 1024) {
      error.value = "PDF >20MB — compress first"
      return
    }
    pdfFile.value = f
    error.value = null
    f.arrayBuffer().then((buf) => {
      localStorage.setItem("rpdf2cbt-pdf-name", f.name)
      localStorage.setItem("rpdf2cbt-pdf-size", String(f.size))
      const db = getDB()
      // store full ArrayBuffer in IDB pdfs store for cropper
      // @ts-ignore dexie stores ArrayBuffer fine
      db.pdfs.put({ id: "__pdf", name: f.name, buffer: buf, updatedAt: Date.now() }).catch(() => {})
    })
  }
}

async function handlePasteParse() {
  error.value = null
  issuesText.value = null
  if (!pasteText.value.trim()) {
    error.value = "Paste JSON first — get it from GEM chat"
    return
  }
  parsing.value = true
  try {
    const r = parsePastedJSON(pasteText.value)
    if (!r.ok) {
      error.value = r.error || "Parse failed"
      if (r.issues) issuesText.value = r.issues.map((x) => `[${x.severity}] ${x.qId ?? ""} ${x.field}: ${x.message}`).join("\n")
      return
    }
    // save to review handoff
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(r.paper))
    await getDB().papers.put({ id: "review", paper: r.paper!, updatedAt: Date.now() })
    issuesText.value = r.issues?.length ? r.issues.map((x) => `[${x.severity}] ${x.field}: ${x.message}`).join("\n") : null
    router.push("/review")
  } finally {
    parsing.value = false
  }
}

async function handleUrlFetch() {
  if (!pasteUrl.value.trim()) return
  parsing.value = true
  error.value = null
  try {
    const r = await fetchAndParse(pasteUrl.value.trim())
    if (!r.ok) {
      error.value = r.error || "Fetch/parse failed"
      if (r.issues) issuesText.value = r.issues.map((x) => `[${x.severity}] ${x.field}: ${x.message}`).join("\n")
      return
    }
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(r.paper))
    await getDB().papers.put({ id: "review", paper: r.paper!, updatedAt: Date.now() })
    router.push("/review")
  } finally {
    parsing.value = false
  }
}

const showFallback = ref(false)
// Fallback provider state — modular, add/delete providers in src/lib/providers/index.ts
const fallbackProviderId = ref(providerOptions[0]?.value || "mistral")
const fallbackModel = ref(providerOptions[0]?.defaultModel || "")
const fallbackKey = ref("")
const fallbackViaProxy = ref(true)
const fallbackLoading = ref(false)
const fallbackPdfText = ref<string | null>(null)

const selectedProvider = computed(() => providers.find((p) => p.id === fallbackProviderId.value))
const selectedModels = computed(() => selectedProvider.value?.models || [])

function onProviderChange() {
  const p = selectedProvider.value
  if (p) fallbackModel.value = p.defaultModel
}

async function handleFallbackExtract() {
  error.value = null
  issuesText.value = null
  if (!pdfFile.value) { error.value = "Upload PDF first for fallback"; return }
  const prov = selectedProvider.value
  if (!prov) { error.value = "Pick provider"; return }
  fallbackLoading.value = true
  try {
    const buf = await pdfFile.value!.arrayBuffer()
    const text = await extractPdfText(buf, 4)
    fallbackPdfText.value = text
    // Build prompt for UniversalPaper JSON — GEM-style instructions
    const sys = `You are a PDF→JSON extractor. Output ONLY valid JSON for UniversalPaper: {meta:{title,durationMinutes,totalQuestions,createdAt}, sections:[], questions:[{id,number,subject,section,topic,type:"mcq"|"msq"|"nat"|"true-false", text, options, answer, answers, marks:4, negativeMarks:1, hasDiagram:false, difficulty}]}
Rules: text preserve LaTeX $...$, options single-line, answer for mcq is "1"-"4" 1-indexed, msq answer "" + answers ["0","2"] 0-indexed, nat answer numeric string. No markdown outside JSON.`
    const user = `Extract all questions from this PDF text. Return JSON only.\n\nPDF_TEXT:\n${text.slice(0,12000)}`
    const content = await prov.chat({
      apiKey: fallbackKey.value.trim(),
      model: fallbackModel.value,
      messages: [{ role: "system", content: sys }, { role: "user", content: user }],
      responseFormat: { type: "json_object" },
      viaProxy: fallbackViaProxy.value,
    })
    // try parse — content may be JSON string
    const r = parsePastedJSON(content)
    if (!r.ok) { error.value = r.error || "Fallback returned invalid JSON"; if (r.issues) issuesText.value = r.issues.map((x)=>`[${x.severity}] ${x.field}: ${x.message}`).join("\n"); return }
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(r.paper))
    await getDB().papers.put({ id: "review", paper: r.paper!, updatedAt: Date.now() })
    router.push("/review")
  } catch (e: unknown) {
    error.value = e instanceof Error ? e.message : String(e)
  } finally {
    fallbackLoading.value = false
  }
}
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans pt-28 pb-10">
    <AppNav />
    <div class="max-w-4xl mx-auto px-4 py-8">
      <button class="text-sm underline text-muted-foreground hover:text-foreground transition-colors" @click="router.push('/')">← Home</button>
      <div class="mt-4 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/50 backdrop-blur-sm text-sm font-medium ex-hero-badge">
        <span class="relative flex h-2 w-2">
          <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
          <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
        </span>
        PDF → CBT · GEM Primary
      </div>
      <h1 class="ex-title text-4xl md:text-6xl font-display font-bold tracking-tighter mt-3">Extract — <span class="bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500">Paste JSON</span></h1>
      <p class="ex-sub text-muted-foreground mt-2 max-w-xl">Primary flow: GEM chat → copy JSON → paste here. Fallback AI only for small PDFs.</p>

      <div class="mt-8 grid gap-5">
        <!-- Step 1 GEM -->
        <div class="spotlight-card rounded-3xl p-6 group relative overflow-hidden" @mousemove="handleSpotlight">
          <div class="flex items-start justify-between gap-4">
            <div>
              <div class="flex items-center gap-2 mb-2"><span class="w-9 h-9 rounded-xl bg-purple-500/10 grid place-items-center"><Sparkles class="w-4.5 h-4.5 text-purple-500" /></span><span class="font-mono text-xs text-purple-500 font-bold">STEP 01</span></div>
              <div class="text-lg font-bold font-display">Get JSON from GEM</div>
              <p class="text-sm text-muted-foreground mt-1">Open preset GEM, upload PDF there, copy the JSON output.</p>
            </div>
          </div>
          <a href="https://ishortn.ink/gemini-gem" target="_blank" @mousemove="handleMagnetic" @mouseleave="resetMagnetic" class="magnetic-btn group inline-flex items-center gap-2 mt-4 px-6 py-3 rounded-full bg-purple-600 text-white text-sm font-bold hover:bg-purple-700 transition-colors relative overflow-hidden">Open GEM Chat <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" /></a>
        </div>

        <!-- Step 2 PDF -->
        <div class="spotlight-card rounded-3xl p-6 group relative overflow-hidden" @mousemove="handleSpotlight">
          <div class="flex items-center gap-2 mb-2"><span class="w-9 h-9 rounded-xl bg-blue-500/10 grid place-items-center"><UploadCloud class="w-4.5 h-4.5 text-blue-500" /></span><span class="font-mono text-xs text-blue-500 font-bold">STEP 02</span></div>
          <div class="text-lg font-bold font-display">Upload PDF — for diagram crop in Review</div>
          <label class="mt-3 block border-2 border-dashed border-border rounded-2xl p-6 text-center cursor-pointer hover:border-purple-500/50 transition-colors">
            <input type="file" accept="application/pdf" class="hidden" @change="onPdf" />
            <UploadCloud class="w-6 h-6 mx-auto text-muted-foreground" />
            <span class="block mt-2 text-sm text-muted-foreground">{{ pdfFile ? pdfFile.name : "Drop or click — PDF <20MB, stored locally in Dexie" }}</span>
          </label>
          <div v-if="pdfFile" class="text-xs text-green-600 mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
        </div>

        <!-- Step 3 Paste -->
        <div class="spotlight-card rounded-3xl p-6 group relative overflow-hidden" @mousemove="handleSpotlight">
          <div class="flex items-center gap-2 mb-2"><span class="w-9 h-9 rounded-xl bg-green-500/10 grid place-items-center"><ClipboardPaste class="w-4.5 h-4.5 text-green-500" /></span><span class="font-mono text-xs text-green-500 font-bold">STEP 03</span></div>
          <div class="text-lg font-bold font-display">Paste JSON</div>
          <textarea v-model="pasteText" rows="10" placeholder='Paste full JSON here — e.g. {"meta":{"title":"Test",...},"sections":[],"questions":[...]} or {"questions":[...]}' class="mt-3 w-full bg-card border border-border rounded-2xl p-4 font-mono text-xs focus:outline-none focus:ring-2 focus:ring-purple-500/50"></textarea>
          <div class="mt-3 flex gap-2">
            <button :disabled="parsing" class="magnetic-btn px-6 py-3 rounded-full bg-foreground text-background text-sm font-bold disabled:opacity-50 hover:scale-[1.02] transition-transform" @click="handlePasteParse">{{ parsing ? 'Parsing...' : 'Parse & Go to Review' }} <ArrowRight v-if="!parsing" class="w-4 h-4 inline ml-1" /></button>
            <button class="px-5 py-3 rounded-full border border-border text-sm hover:bg-accent transition-colors" @click="pasteText=''">Clear</button>
          </div>
          <div class="mt-4 flex gap-2">
            <input v-model="pasteUrl" placeholder="Or paste JSON URL and fetch" class="flex-1 bg-card border border-border rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-purple-500/50" />
            <button class="px-5 py-2.5 rounded-full border border-border text-sm hover:bg-accent transition-colors" @click="handleUrlFetch">Fetch URL</button>
          </div>
          <div v-if="error" class="mt-3 p-4 bg-red-500/10 border border-red-500/30 rounded-2xl text-sm text-red-600 whitespace-pre-wrap">{{ error }}</div>
          <div v-if="issuesText" class="mt-2 p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl text-xs whitespace-pre-wrap">{{ issuesText }}</div>
        </div>

        <!-- Fallback — Modular Providers -->
        <div class="spotlight-card rounded-3xl p-6 group relative overflow-hidden" @mousemove="handleSpotlight">
          <div class="flex items-center gap-2 mb-1"><span class="w-9 h-9 rounded-xl bg-orange-500/10 grid place-items-center"><Cpu class="w-4.5 h-4.5 text-orange-500" /></span><span class="font-mono text-xs text-orange-500 font-bold">OPTIONAL</span></div>
          <button class="text-sm font-semibold underline decoration-dotted underline-offset-4" @click="showFallback=!showFallback">{{ showFallback ? 'Hide' : 'Show' }} Fallback AI — Modular (Mistral / Groq / NVIDIA) for &lt;10 Q PDFs</button>
          <div v-if="showFallback" class="mt-4 border-t pt-4 space-y-3">
            <p class="text-xs text-zinc-500">Add/delete provider = add/delete file in <code class="bg-zinc-100 px-1 rounded">src/lib/providers/</code> + one line in <code class="bg-zinc-100 px-1 rounded">index.ts</code> — docs in <code class="bg-zinc-100 px-1 rounded">providers/README.md</code></p>
            <div class="grid md:grid-cols-3 gap-3">
              <label class="text-xs">Provider
                <select :value="fallbackProviderId" @change="(e)=>{fallbackProviderId=(e.target as HTMLSelectElement).value; onProviderChange()}" class="mt-1 w-full border rounded px-2 py-1.5">
                  <option v-for="o in providerOptions" :key="o.value" :value="o.value">{{ o.label }} — {{ o.defaultModel }}</option>
                </select>
                <a v-if="selectedProvider" :href="selectedProvider.docsUrl" target="_blank" class="text-[11px] underline text-violet-600">{{ selectedProvider.docsUrl }}</a>
              </label>
              <label class="text-xs">Model
                <select v-model="fallbackModel" class="mt-1 w-full border rounded px-2 py-1.5">
                  <option v-for="m in selectedModels" :key="m" :value="m">{{ m }}</option>
                </select>
              </label>
              <label class="text-xs">API Key (BYOK, or env fallback via proxy)
                <input v-model="fallbackKey" type="password" placeholder="sk-... / gsk_... / nvapi-..." class="mt-1 w-full border rounded px-2 py-1.5" />
              </label>
            </div>
            <label class="flex items-center gap-2 text-xs"><input type="checkbox" v-model="fallbackViaProxy" /> viaProxy <code class="bg-zinc-100 px-1 rounded">/api/{{ fallbackProviderId }}/chat</code> (hides key on Vercel) — uncheck for direct <code class="bg-zinc-100 px-1 rounded">{{ selectedProvider?.baseUrl }}/chat/completions</code></label>
            <button :disabled="fallbackLoading" @click="handleFallbackExtract" class="px-5 py-2 rounded-full bg-violet-600 text-white text-sm disabled:opacity-50">{{ fallbackLoading ? 'Extracting...' : 'Fallback Extract with ' + (selectedProvider?.label || '') + ' → Review' }}</button>
            <div v-if="fallbackPdfText" class="text-xs bg-zinc-100 border rounded p-2 max-h-32 overflow-auto whitespace-pre-wrap">PDF text (first 15k): {{ fallbackPdfText.slice(0, 800) }}…</div>
            <div class="text-[11px] text-zinc-400">All providers are OpenAI-compatible <code>POST /v1/chat/completions</code> with <code>response_format: json_object</code>. To add Cerebras: copy <code>mistral.ts</code> → <code>cerebras.ts</code>, change <code>baseUrl</code>, register in <code>index.ts</code>.</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>
