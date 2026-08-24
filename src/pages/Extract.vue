<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import { providers, providerOptions } from "@/lib/providers"
import {
  createCustomProvider,
  loadCustomConfig,
  saveCustomConfig,
  clearCustomConfig,
  CUSTOM_PRESETS,
} from "@/lib/providers"
import { extractPdfPages } from "@/lib/pdf"
import { runAgentExtract, type AgentProgress, type AgentJobState } from "@/lib/agentExtract"
import gsap from "gsap"
import { Sparkles, UploadCloud, ClipboardPaste, Cpu, ArrowRight, Play, RotateCcw, X } from "lucide-vue-next"

onMounted(() => {
  gsap.from(".ex-hero-badge", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" })
  gsap.from(".ex-title", { y: 40, opacity: 0, duration: 0.9, delay: 0.1, ease: "power4.out" })
  gsap.from(".ex-sub", { y: 20, opacity: 0, duration: 0.8, delay: 0.25, ease: "power3.out" })
  gsap.from(".tape-card", { y: 50, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.35, ease: "power2.out" })
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

const fallbackProviderId = ref(providerOptions[0]?.value || "mistral")
const fallbackModel = ref(providerOptions[0]?.defaultModel || "")
const fallbackKey = ref("")
const fallbackViaProxy = ref(true)

/* generic custom provider harness */
const customVersion = ref(0)
const customBaseUrl = ref("")
const customApiKey = ref("")
const customModelInput = ref("")
const customModels = ref<string[]>([])
const customStatus = ref<string | null>(null)

const allProviders = computed(() => {
  void customVersion.value
  const cfg = loadCustomConfig()
  return cfg ? [...providers, createCustomProvider(cfg)] : providers
})
const allOptions = computed(() =>
  allProviders.value.map((p) => ({ value: p.id, label: p.label, defaultModel: p.defaultModel, docsUrl: p.docsUrl })),
)
const customConfigured = computed(() => {
  void customVersion.value
  return !!loadCustomConfig()
})

async function fetchCustomModels() {
  customStatus.value = null
  if (!customBaseUrl.value.trim()) { customStatus.value = "Base URL required"; return }
  try {
    const prov = createCustomProvider({ baseUrl: customBaseUrl.value, apiKey: customApiKey.value, model: "" })
    const list = await (prov.listModels as (k?: string) => Promise<string[]>)(customApiKey.value.trim() || undefined)
    customModels.value = list
    if (!list.length) customStatus.value = "Connected — no models listed, type model name manually"
    else customStatus.value = `Connected — ${list.length} models`
    if (list.length && !customModelInput.value) customModelInput.value = list.find(m => m.includes("free")) || list[0]
  } catch (e: unknown) {
    customStatus.value = e instanceof Error ? e.message : String(e)
  }
}

function saveCustomProvider() {
  if (!customBaseUrl.value.trim()) { customStatus.value = "Base URL required"; return }
  saveCustomConfig({ baseUrl: customBaseUrl.value, apiKey: customApiKey.value.trim(), model: customModelInput.value.trim() })
  customVersion.value++
  fallbackProviderId.value = "custom"
  fallbackModel.value = customModelInput.value.trim()
  fallbackViaProxy.value = false
  fallbackKey.value = customApiKey.value.trim()
  onProviderChange()
  customStatus.value = "Saved ✓ Custom provider active"
}

function removeCustomProvider() {
  clearCustomConfig()
  customVersion.value++
  customBaseUrl.value = ""; customApiKey.value = ""; customModelInput.value = ""; customModels.value = []
  if (fallbackProviderId.value === "custom") { fallbackProviderId.value = providerOptions[0]?.value || "mistral"; onProviderChange() }
  customStatus.value = "Removed"
}

const selectedProvider = computed(() => allProviders.value.find((p) => p.id === fallbackProviderId.value))
const selectedModels = computed(() => selectedProvider.value?.models || [])

function onProviderChange() {
  const p = selectedProvider.value
  if (p) fallbackModel.value = p.defaultModel
}

/* ── AI Agent — page-chunked extraction ── */
const activeTab = ref<"gem" | "agent">("gem")
const agentRunning = ref(false)
const agentError = ref<string | null>(null)
const agentProgress = ref<AgentProgress[]>([])
const resumeAvailable = ref(false)
let abortCtl: AbortController | null = null

const jobId = computed(() => (pdfFile.value ? `${pdfFile.value.name}__${pdfFile.value.size}` : ""))

async function checkResume() {
  resumeAvailable.value = false
  if (!pdfFile.value) return
  try {
    const j = await getDB().extractJobs.get(jobId.value)
    resumeAvailable.value = !!j && !j.done && Object.keys(j.results).length > 0
  } catch { /* table missing on old DB — ignore */ }
}

function onPdfAgent() { void checkResume() }

async function startAgent(resume = false) {
  agentError.value = null
  issuesText.value = null
  if (!pdfFile.value) { agentError.value = "PDF upload karo pehle"; return }
  const prov = selectedProvider.value
  if (!prov || !fallbackModel.value) { agentError.value = "Provider + model select karo"; return }
  agentRunning.value = true
  abortCtl = new AbortController()
  try {
    const buf = await pdfFile.value.arrayBuffer()
    const pages = await extractPdfPages(buf)
    const id = jobId.value
    let resumeState: AgentJobState | null = null
    if (resume) {
      const j = await getDB().extractJobs.get(id)
      if (j && j.pages.length === pages.length) resumeState = j as unknown as AgentJobState
    }
    const { paper } = await runAgentExtract({
      jobId: id,
      pages,
      provider: prov,
      apiKey: fallbackKey.value.trim(),
      model: fallbackModel.value,
      viaProxy: fallbackViaProxy.value && prov.id !== "custom",
      delayMs: 1500,
      resumeState,
      onProgress: (p) => { agentProgress.value = p },
      onCheckpoint: async (s) => { await getDB().extractJobs.put({ ...s, results: s.results }).catch(() => {}) },
      signal: abortCtl.signal,
    })
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(paper))
    await getDB().papers.put({ id: "review", paper, updatedAt: Date.now() })
    router.push("/review")
  } catch (e: unknown) {
    agentError.value = e instanceof Error ? e.message : String(e)
  } finally {
    agentRunning.value = false
    abortCtl = null
    void checkResume()
  }
}
function cancelAgent() { abortCtl?.abort() }
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-4xl mx-auto px-5">
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/')">← back to home</button>

      <div class="mt-5 inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ink/10 bg-white text-[13px] font-semibold text-ink/70 ex-hero-badge">
        <span class="h-2 w-2 rounded-full bg-correct"></span>
        PDF → CBT · GEM primary
      </div>
      <h1 class="ex-title text-4xl md:text-6xl font-display font-extrabold tracking-tight mt-3">
        Extract — <span class="relative inline-block">paste JSON<span class="absolute inset-x-[-4px] inset-y-[14%] -z-10 rounded-sm bg-hlyellow"></span></span>
      </h1>
      <p class="ex-sub text-ink/60 mt-3 max-w-xl text-[16px] leading-relaxed">Primary flow: GEM chat → copy JSON → paste here. Fallback AI only for small PDFs.</p>

      <div class="mt-10 grid gap-8">
        <!-- Step I — GEM -->
        <div class="tape-card relative rounded-lg bg-white p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" style="transform: rotate(-0.5deg)" @mousemove="handleSpotlight">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-2.5 mb-2">
            <span class="w-9 h-9 rounded-xl bg-pen/10 grid place-items-center"><Sparkles class="w-4.5 h-4.5 text-pen" /></span>
            <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-pen">STEP I</span>
          </div>
          <div class="text-xl font-bold font-display tracking-tight">Get JSON from GEM</div>
          <p class="text-[15px] text-ink/60 mt-1.5 leading-relaxed">Open the preset GEM, upload your PDF there, copy the JSON it returns.</p>
          <a href="https://ishortn.ink/gemini-gem" target="_blank" @mousemove="handleMagnetic" @mouseleave="resetMagnetic" class="magnetic-btn group inline-flex items-center gap-2 mt-5 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold transition-transform hover:-translate-y-0.5">
            Open GEM Chat <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </a>
          <span class="font-hand text-xl text-ink/50 -rotate-2 inline-block ml-4">free, no key needed</span>
        </div>

        <!-- Step II — PDF -->
        <div class="tape-card relative rounded-lg bg-white p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" style="transform: rotate(0.4deg)" @mousemove="handleSpotlight">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-2.5 mb-2">
            <span class="w-9 h-9 rounded-xl bg-hlgreen grid place-items-center"><UploadCloud class="w-4.5 h-4.5 text-ink" /></span>
            <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60">STEP II</span>
          </div>
          <div class="text-xl font-bold font-display tracking-tight">Upload the PDF — for diagram crops in Review</div>
          <label class="mt-4 block border-2 border-dashed border-ink/15 rounded-2xl p-7 text-center cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors">
            <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
            <UploadCloud class="w-6 h-6 mx-auto text-ink/40" />
            <span class="block mt-2 text-sm text-ink/55">{{ pdfFile ? pdfFile.name : "Drop or click — PDF under 20MB, stored in your browser only" }}</span>
          </label>
          <div v-if="pdfFile" class="text-sm text-correct font-medium mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
        </div>

        <!-- Flow tabs -->
        <div class="flex gap-2 px-1">
          <button @click="activeTab='gem'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab==='gem' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">GEM paste JSON</button>
          <button @click="activeTab='agent'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab==='agent' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">AI Agent — free models</button>
        </div>

        <!-- Step III — Paste -->
        <div v-show="activeTab==='gem'" class="tape-card relative rounded-lg bg-white p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" style="transform: rotate(-0.3deg)" @mousemove="handleSpotlight">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-2.5 mb-2">
            <span class="w-9 h-9 rounded-xl bg-hlyellow grid place-items-center"><ClipboardPaste class="w-4.5 h-4.5 text-ink" /></span>
            <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60">STEP III</span>
          </div>
          <div class="text-xl font-bold font-display tracking-tight">Paste the JSON</div>
          <textarea v-model="pasteText" rows="10" placeholder='Paste full JSON here — e.g. {"meta":{"title":"Test",...},"sections":[],"questions":[...]}' class="mt-4 w-full bg-paper border border-ink/12 rounded-2xl p-4 font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-pen/50 placeholder:text-ink/30"></textarea>
          <div class="mt-4 flex flex-wrap gap-3">
            <button :disabled="parsing" class="px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold disabled:opacity-50 transition-transform hover:-translate-y-0.5" @click="handlePasteParse">{{ parsing ? 'Parsing…' : 'Parse & go to Review' }} <ArrowRight v-if="!parsing" class="w-4 h-4 inline ml-1" /></button>
            <button class="px-5 py-3 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/70 hover:border-ink/30 hover:text-ink transition-colors" @click="pasteText=''">Clear</button>
          </div>
          <div class="mt-4 flex gap-2">
            <input v-model="pasteUrl" placeholder="Or paste a JSON URL and fetch" class="flex-1 bg-paper border border-ink/12 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/50 placeholder:text-ink/35" />
            <button class="px-5 py-2.5 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/70 hover:border-ink/30 hover:text-ink transition-colors" @click="handleUrlFetch">Fetch URL</button>
          </div>
          <div v-if="error" class="mt-4 p-4 bg-redmargin/[0.07] border border-redmargin/30 rounded-2xl text-sm text-redmargin font-medium whitespace-pre-wrap">{{ error }}</div>
          <div v-if="issuesText" class="mt-2 p-4 bg-hlyellow/40 border border-hlyellow rounded-2xl text-xs text-ink/75 whitespace-pre-wrap">{{ issuesText }}</div>
        </div>

        <!-- AI Agent tab — page-chunked extraction -->
        <div v-show="activeTab==='agent'" class="rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" @mousemove="handleSpotlight">
          <div class="flex items-center gap-2.5 mb-1">
            <span class="w-9 h-9 rounded-xl bg-hlblue grid place-items-center"><Cpu class="w-4.5 h-4.5 text-ink" /></span>
            <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60">AGENT</span>
          </div>
          <p class="text-sm font-semibold text-ink/75">Page-by-page agent — har PDF page alag self-contained request. Rate-limit backoff, output-truncation split, Dexie checkpoints + resume built-in.</p>
          <div class="mt-5 border-t border-dashed border-ink/15 pt-5 space-y-4">
            <p class="text-xs text-ink/55">Add/delete provider = one file in <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10">src/lib/providers/</code> + one line in <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10">index.ts</code> — see <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10">providers/README.md</code></p>
            <div class="grid md:grid-cols-3 gap-4">
              <label class="text-xs font-semibold text-ink/70">Provider
                <select :value="fallbackProviderId" @change="(e)=>{fallbackProviderId=(e.target as HTMLSelectElement).value; onProviderChange()}" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                  <option v-for="o in allOptions.filter(x => x.value !== 'custom')" :key="o.value" :value="o.value">{{ o.label }} — {{ o.defaultModel || 'set below' }}</option>
                  <option value="custom">{{ customConfigured ? 'Custom — saved ✓' : 'Custom — any OpenAI-compatible URL' }}</option>
                </select>
                <a v-if="selectedProvider && fallbackProviderId !== 'custom'" :href="selectedProvider.docsUrl" target="_blank" class="text-[11px] underline text-pen mt-1 inline-block">{{ selectedProvider.docsUrl }}</a>
              </label>
              <label class="text-xs font-semibold text-ink/70">Model
                <select v-model="fallbackModel" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                  <option v-for="m in selectedModels" :key="m" :value="m">{{ m }}</option>
                </select>
              </label>
              <label class="text-xs font-semibold text-ink/70">API key (BYOK, or env via proxy)
                <input v-model="fallbackKey" type="password" placeholder="sk-… / gsk_… / nvapi-…" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
              </label>
            </div>

            <!-- Custom provider harness — any OpenAI-compatible endpoint -->
            <div v-if="fallbackProviderId === 'custom'" class="rounded-xl border border-dashed border-pen/40 bg-pen/[0.04] p-4 space-y-3">
              <div class="flex flex-wrap gap-1.5">
                <button v-for="pr in CUSTOM_PRESETS" :key="pr.label" type="button" @click="customBaseUrl = pr.baseUrl; if (!customApiKey) customStatus = pr.label + ': ' + pr.hint" class="px-2.5 py-1 rounded-full border border-ink/15 bg-paper text-[11px] font-semibold text-ink/70 hover:border-pen hover:text-pen transition-colors">{{ pr.label }}</button>
              </div>
              <div class="grid md:grid-cols-2 gap-3">
                <label class="text-xs font-semibold text-ink/70">Base URL
                  <input v-model="customBaseUrl" :placeholder="CUSTOM_PRESETS[0].baseUrl" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                </label>
                <label class="text-xs font-semibold text-ink/70">API key (empty for local)
                  <input v-model="customApiKey" type="password" placeholder="sk-or-… / gsk_… / none" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                </label>
              </div>
              <div class="flex flex-wrap items-end gap-2">
                <label class="text-xs font-semibold text-ink/70 grow">Model
                  <input v-model="customModelInput" list="custom-models" placeholder="fetch below or type exact model id" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                  <datalist id="custom-models"><option v-for="m in customModels" :key="m" :value="m" /></datalist>
                </label>
                <button type="button" @click="fetchCustomModels" class="px-3.5 py-2 rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink/75 hover:border-pen hover:text-pen transition-colors">Fetch models</button>
                <button type="button" @click="saveCustomProvider" class="px-3.5 py-2 rounded-lg bg-pen text-white text-xs font-bold">Save &amp; use</button>
                <button v-if="customConfigured" type="button" @click="removeCustomProvider" class="px-3.5 py-2 rounded-lg border border-redmargin/40 text-redmargin text-xs font-bold hover:bg-redmargin/[0.06]">Remove</button>
              </div>
              <p v-if="customStatus" class="text-[11px]" :class="customStatus.startsWith('Connected') || customStatus.includes('✓') ? 'text-green-700' : 'text-redmargin'">{{ customStatus }}</p>
              <p class="text-[11px] text-ink/50">Works with any OpenAI-compatible <code class="bg-paper px-1 rounded border border-ink/10">POST {base}/chat/completions</code> — OpenRouter, Groq, Together, Cerebras, xAI, Vercel AI Gateway, Ollama/LM Studio, naya free provider — bas URL paste karo. Key browser-local rehti hai.</p>
            </div>

            <label class="flex items-start gap-2 text-xs text-ink/65"><input type="checkbox" v-model="fallbackViaProxy" class="accent-pen mt-0.5" /> <span><span v-if="fallbackProviderId !== 'custom'">viaProxy <code class="bg-paper px-1 rounded border border-ink/10">/api/{{ fallbackProviderId }}/chat</code> — key env-side, browser mein hidden. </span>Custom provider hamesha direct call (key client-local).</span></label>

            <div class="flex flex-wrap gap-3">
              <button :disabled="agentRunning" @click="startAgent(false)" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold disabled:opacity-50 transition-transform hover:-translate-y-0.5"><Play class="w-4 h-4" /> {{ agentRunning ? 'Extracting…' : 'Start page-by-page extraction' }}</button>
              <button v-if="resumeAvailable && !agentRunning" @click="startAgent(true)" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-correct/50 text-green-700 text-sm font-bold hover:bg-correct/[0.07] transition-colors"><RotateCcw class="w-4 h-4" /> Resume checkpoint</button>
              <button v-if="agentRunning" @click="cancelAgent" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-redmargin/40 text-redmargin text-sm font-bold hover:bg-redmargin/[0.06]"><X class="w-4 h-4" /> Cancel</button>
            </div>

            <div v-if="agentProgress.length" class="space-y-2">
              <div class="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
                <div v-for="p in agentProgress" :key="p.index" :title="'Page ' + (p.index+1) + (p.note ? ' — ' + p.note : '')" class="h-7 rounded-md grid place-items-center font-mono text-[10px]" :class="[p.status==='done' ? 'bg-correct/15 text-green-700' : p.status==='running' ? 'bg-pen text-white animate-pulse' : p.status==='failed' ? 'bg-redmargin text-white' : 'bg-ink/[0.06] text-ink/40']">{{ p.index+1 }}</div>
              </div>
              <div class="font-mono text-[11px] text-ink/50">{{ agentProgress.filter(x => x.status==='done').length }}/{{ agentProgress.length }} pages done — checkpoint save hota rahta hai, crash pe Resume dabao</div>
            </div>
            <div v-if="agentError" class="p-4 bg-redmargin/[0.07] border border-redmargin/30 rounded-2xl text-sm text-redmargin font-medium whitespace-pre-wrap">{{ agentError }}</div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<style scoped>
.spotlight-card {
  position: relative;
}
.spotlight-card::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: radial-gradient(420px circle at var(--mouse-x, 50%) var(--mouse-y, 50%), rgba(47, 95, 224, 0.06), transparent 65%);
  opacity: 0;
  transition: opacity 0.4s;
  pointer-events: none;
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
