<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import {
  loadProviders,
  upsertProvider,
  deleteProvider as deleteProviderEntry,
  fetchModels as fetchProviderModels,
  normalizeBaseUrl,
  type ProviderEntry,
} from "@/lib/providers"
import { extractPdfPages } from "@/lib/pdf"
import { needsOcr, ocrPdf } from "@/lib/ocr"
import { runAgentExtract, type AgentProgress, type AgentJobState } from "@/lib/agentExtract"
import gsap from "gsap"
import { Sparkles, UploadCloud, ClipboardPaste, Cpu, ArrowRight, Play, RotateCcw, X, Settings } from "lucide-vue-next"

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

/* ── Provider manager — the harness window ── */
/* Curated from official docs (console.groq.com/docs/rate-limits, docs.mistral.ai, build.nvidia.com) */
const PROVIDER_LIMITS: Record<string, string> = {
  groq: "Groq free tier (per model): 30 RPM · 1K-14.4K RPD · 6-12K TPM · 128K context",
  mistral: "Mistral free tier: medium ~23 req/min at 356K TPM (best quality) · ministral for volume · large throttled to ~4 req/min",
  nvidia: "NVIDIA trial API: ~40 RPM dynamic shared limit · 100+ models · up to 1M-token context",
}

const providerList = ref<ProviderEntry[]>([])
const activeProviderId = ref("")
const activeModel = ref("")
const showSettings = ref(false)
const formOpen = ref(false)
const formEditingId = ref<string | null>(null)
const formName = ref("")
const formUrl = ref("")
const formKey = ref("")
const formResponse = ref<"openai-completions" | "openai-responses">("openai-completions")
const formModels = ref<string[]>([])
const formModelPick = ref("")
const formManualModel = ref("")
const formStatus = ref<string | null>(null)
const formFetching = ref(false)

const activeProvider = computed(() => providerList.value.find((p) => p.id === activeProviderId.value))
const keyMode = computed(() => {
  const p = activeProvider.value
  if (!p) return "none"
  if (p.isPreset) return p.envKey ? `server env (${p.envKey})` : "BYOK"
  return p.apiKey ? "client ✓" : "direct, no key"
})

function refreshProviders() {
  providerList.value = loadProviders()
  const stillThere = providerList.value.some((p) => p.id === activeProviderId.value)
  if (!stillThere) {
    const first = providerList.value[0]
    activeProviderId.value = first?.id ?? ""
    activeModel.value = first?.model || first?.models[0] || ""
  } else {
    const a = activeProvider.value
    if (a && !a.models.includes(activeModel.value)) activeModel.value = a.model || a.models[0] || ""
  }
}
refreshProviders()

function selectProvider(id: string) {
  activeProviderId.value = id
  const p = activeProvider.value
  activeModel.value = p?.model || p?.models?.[0] || ""
}

function openAdd() {
  formEditingId.value = null
  formName.value = ""
  formUrl.value = ""
  formKey.value = ""
  formResponse.value = "openai-completions"
  formModels.value = []
  formModelPick.value = ""
  formManualModel.value = ""
  formStatus.value = null
  formOpen.value = true
}

function openEdit(p: ProviderEntry) {
  formEditingId.value = p.id
  formName.value = p.name
  formUrl.value = p.baseUrl
  formKey.value = p.apiKey || ""
  formModels.value = [...(p.models || [])]
  formModelPick.value = p.model && p.models.includes(p.model) ? p.model : p.models[0] || ""
  formManualModel.value = ""
  formStatus.value = null
  formOpen.value = true
}

async function formFetch() {
  formStatus.value = null
  if (!formUrl.value.trim()) { formStatus.value = "Endpoint URL required"; return }
  formFetching.value = true
  try {
    const list = await fetchProviderModels(formUrl.value, formKey.value)
    formModels.value = list
    if (!list.length) {
      formStatus.value = "Connected, but no models listed — type a model id manually"
    } else {
      formStatus.value = `Connected — ${list.length} models found`
      if (!formModelPick.value) formModelPick.value = list.find((m) => m.includes("free")) || list[0]
    }
  } catch (e: unknown) {
    formStatus.value = e instanceof Error ? e.message : String(e)
  } finally {
    formFetching.value = false
  }
}

function formSave() {
  if (!formName.value.trim()) { formStatus.value = "Name required"; return }
  if (!formUrl.value.trim()) { formStatus.value = "Endpoint URL required"; return }
  const chosen = formModelPick.value || formManualModel.value || formModels.value[0] || ""
  const prev = formEditingId.value ? providerList.value.find((p) => p.id === formEditingId.value) : null
  const entry: ProviderEntry = {
    id: formEditingId.value ?? `${normalizeBaseUrl(formUrl.value).replace(/[^a-z0-9]+/gi, "-").toLowerCase()}-${Date.now().toString(36)}`,
    name: formName.value.trim(),
    baseUrl: normalizeBaseUrl(formUrl.value),
    apiKey: formKey.value.trim() || prev?.apiKey || "",
    response: formResponse.value as ProviderEntry["response"],
    models: formModels.value.length ? formModels.value : chosen ? [chosen] : [],
    model: chosen,
    docsUrl: prev?.docsUrl,
  }
  upsertProvider(entry)
  refreshProviders()
  selectProvider(entry.id)
  formOpen.value = false
}

function askDelete(p: ProviderEntry) {
  if (!window.confirm(`Remove provider "${p.name}"?`)) return
  deleteProviderEntry(p.id)
  refreshProviders()
}

/* ── AI Agent — page-chunked extraction ── */
const activeTab = ref<"gem" | "agent">("gem")
const agentRunning = ref(false)
const agentError = ref<string | null>(null)
const agentProgress = ref<AgentProgress[]>([])
const resumeAvailable = ref(false)
const forceOcr = ref(false)
const ocrUsed = ref(false)
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
  if (!pdfFile.value) { agentError.value = "Upload a PDF first"; return }
  const prov = activeProvider.value
  if (!prov) { agentError.value = "Add or select a provider first"; return }
  if (!activeModel.value) { agentError.value = "Pick a model"; return }
  agentRunning.value = true
  abortCtl = new AbortController()
  try {
    const buf = await pdfFile.value.arrayBuffer()
    let pages = await extractPdfPages(buf)
    if (forceOcr.value || needsOcr(pages)) {
      // text-to-text models can't read scans — Mistral OCR first (625 pages/min free)
      ocrUsed.value = true
      agentProgress.value = [{ index: 0, status: "running", note: "Scanned PDF — running Mistral OCR on all pages…" }]
      pages = await ocrPdf(pdfFile.value)
    } else {
      ocrUsed.value = false
    }
    const id = jobId.value
    let resumeState: AgentJobState | null = null
    if (resume) {
      const j = await getDB().extractJobs.get(id)
      if (j && j.pages.length === pages.length) resumeState = j as unknown as AgentJobState
    }
    const { paper } = await runAgentExtract({
      jobId: id,
      pages,
      entry: { ...prov, model: activeModel.value },
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
        <!-- Flow tabs -->
        <div class="sticky top-24 z-30 flex gap-2 px-1">
          <button @click="activeTab='gem'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab==='gem' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">Gemini GEM flow</button>
          <button @click="activeTab='agent'" :class="['px-5 py-2.5 rounded-xl text-sm font-bold transition-all', activeTab==='agent' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">AI Agent — free models</button>
        </div>

        <!-- ═══ TAB 1 · GEM — paste JSON ═══ -->
        <div v-show="activeTab==='gem'" class="grid gap-6">
          <div class="tape-card relative rounded-lg bg-white p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" style="transform: rotate(-0.3deg)" @mousemove="handleSpotlight">
            <div class="tape" aria-hidden="true"></div>
            <div class="flex items-center gap-2.5 mb-2">
              <span class="w-9 h-9 rounded-xl bg-pen/10 grid place-items-center"><Sparkles class="w-4.5 h-4.5 text-pen" /></span>
              <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-pen">GEM FLOW · FREE · NO KEY</span>
            </div>
            <div class="text-2xl font-bold font-display tracking-tight">Three steps. Done.</div>
            <div class="mt-5 grid md:grid-cols-3 gap-3">
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">1</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">Open the GEM chat, upload your PDF there</p>
                <a href="https://ishortn.ink/gemini-gem" target="_blank" @mousemove="handleMagnetic" @mouseleave="resetMagnetic" class="magnetic-btn group mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pen text-white text-xs font-bold transition-transform hover:-translate-y-0.5">
                  Open GEM Chat <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">2</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">Copy the full JSON the GEM returns</p>
                <span class="font-hand text-lg text-ink/45 -rotate-2 inline-block mt-2">ctrl+A, ctrl+C</span>
              </div>
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">3</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">Paste it below → straight to Review</p>
                <ClipboardPaste class="w-5 h-5 text-ink/35 mt-2" />
              </div>
            </div>
            <textarea v-model="pasteText" rows="10" placeholder='Paste full JSON here — e.g. {"meta":{"title":"Test",...},"sections":[],"questions":[...]}' class="mt-5 w-full bg-paper border border-ink/12 rounded-2xl p-4 font-mono text-xs text-ink focus:outline-none focus:ring-2 focus:ring-pen/50 placeholder:text-ink/30"></textarea>
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

          <details class="rounded-lg bg-white ring-1 ring-ink/[0.06] p-5">
            <summary class="cursor-pointer text-sm font-semibold text-ink/70 hover:text-ink select-none">Optional — upload the PDF here too <span class="text-ink/45 font-normal">(only for diagram crops in Review)</span></summary>
            <label class="mt-4 block border-2 border-dashed border-ink/15 rounded-2xl p-6 text-center cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors">
              <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
              <UploadCloud class="w-6 h-6 mx-auto text-ink/40" />
              <span class="block mt-2 text-sm text-ink/55">{{ pdfFile ? pdfFile.name : "PDF under 20MB — browser mein hi store hota hai" }}</span>
            </label>
            <div v-if="pdfFile" class="text-sm text-correct font-medium mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
          </details>
        </div>

        <!-- ═══ TAB 2 · AI AGENT ═══ -->
        <div v-show="activeTab==='agent'" class="grid gap-6">
          <div class="rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" @mousemove="handleSpotlight">
            <div class="flex items-center gap-2.5 mb-2">
              <span class="w-9 h-9 rounded-xl bg-hlgreen grid place-items-center"><UploadCloud class="w-4.5 h-4.5 text-ink" /></span>
              <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60">AGENT · STEP 1</span>
            </div>
            <div class="text-xl font-bold font-display tracking-tight">Upload PDF</div>
            <label class="mt-4 block border-2 border-dashed border-ink/15 rounded-2xl p-7 text-center cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors">
              <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
              <UploadCloud class="w-6 h-6 mx-auto text-ink/40" />
              <span class="block mt-2 text-sm text-ink/55">{{ pdfFile ? pdfFile.name : "Drop or click — PDF under 20MB, stored in your browser only" }}</span>
            </label>
            <div v-if="pdfFile" class="text-sm text-correct font-medium mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
            <p v-if="resumeAvailable && !agentRunning" class="mt-3 text-[13px] font-medium text-green-700">✓ Previous checkpoint found — hit Resume checkpoint below</p>
            <label class="mt-3 flex items-start gap-2 text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" v-model="forceOcr" class="accent-pen mt-0.5" />
              <span>Scanned / image-only PDF? Force <b>Mistral OCR</b> first (625 pages/min free tier, needs MISTRAL_API_KEY on Vercel; PDF &lt; 4.5MB). Text-based PDFs are read directly — no OCR needed.</span>
            </label>
          </div>

        <!-- AI Agent tab — page-chunked extraction -->
        <div v-show="activeTab==='agent'" class="rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" @mousemove="handleSpotlight">
          <div class="flex items-center justify-end mb-3">
            <button type="button" @click="showSettings = true" title="AI providers &amp; settings" class="inline-flex items-center justify-center w-9 h-9 rounded-lg border border-ink/15 bg-paper text-ink/50 hover:border-pen hover:text-pen transition-colors"><Settings class="w-4 h-4" /></button>
          </div>
          <div class="space-y-4">
            <!-- Provider + model pick -->
            <div class="grid md:grid-cols-2 gap-3">
              <label class="text-xs font-semibold text-ink/70">Provider
                <select v-model="activeProviderId" @change="selectProvider(activeProviderId)" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                  <optgroup label="Preconfigured — providers.yaml">
                    <option v-for="p in providerList.filter(x => x.isPreset)" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </optgroup>
                  <optgroup v-if="providerList.some(x => !x.isPreset)" label="Your local providers">
                    <option v-for="p in providerList.filter(x => !x.isPreset)" :key="p.id" :value="p.id">{{ p.name }}</option>
                  </optgroup>
                </select>
              </label>
              <label class="text-xs font-semibold text-ink/70">Model
                <select v-if="activeProvider?.models?.length" v-model="activeModel" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                  <option v-for="m in activeProvider.models" :key="m" :value="m">{{ m }}</option>
                </select>
                <input v-else v-model="activeModel" placeholder="model id" class="mt-1.5 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
              </label>
            </div>
            <div class="font-mono text-[11px] text-ink/45">
              {{ activeProvider ? activeProvider.baseUrl : 'no provider selected' }}
              · key: {{ keyMode }}
            </div>
            <p class="text-[11px] font-mono text-ink/45">Free-tier snapshot: {{ PROVIDER_LIMITS[activeProviderId] || 'depends on your endpoint' }}</p>

            <!-- ⚙ Settings modal — preconfigured + local providers -->
            <Teleport to="body">
              <div v-if="showSettings" class="fixed inset-0 z-[200] bg-ink/50 backdrop-blur-sm grid place-items-center p-4" @click.self="showSettings=false">
                <div class="w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 p-6 space-y-5">
                  <div class="flex items-center justify-between">
                    <div class="text-lg font-bold font-display tracking-tight">AI Providers</div>
                    <button @click="showSettings=false" class="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">✕</button>
                  </div>

                  <div>
                    <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45 mb-2">PRECONFIGURED — src/config/providers.yaml</div>
                    <div class="space-y-1.5">
                      <button v-for="p in providerList.filter(x => x.isPreset)" :key="p.id" @click="selectProvider(p.id); showSettings=false" :class="['w-full flex items-center justify-between gap-2 px-3 py-2.5 rounded-xl border text-left transition-colors', activeProviderId===p.id ? 'border-pen bg-pen/[0.05]' : 'border-ink/10 hover:border-ink/25']">
                        <span>
                          <span class="block text-sm font-bold text-ink">{{ p.name }}</span>
                          <span class="block font-mono text-[10px] text-ink/45 truncate">{{ p.baseUrl }}</span>
                        </span>
                        <span class="text-right shrink-0">
                          <span class="block font-mono text-[10px] text-ink/60">{{ p.models.length }} models</span>
                          <span class="block font-mono text-[9px] text-green-700">{{ p.envKey ? 'env: ' + p.envKey : 'BYOK' }}</span>
                        </span>
                      </button>
                    </div>
                    <p class="mt-2 text-[11px] text-ink/45">Controlled by the repo file <code class="bg-paper px-1 rounded border border-ink/10">providers.yaml</code> — edit it on GitHub and every user gets the update.</p>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45">YOUR LOCAL PROVIDERS — THIS BROWSER ONLY</div>
                      <button @click="openAdd" class="px-2.5 py-1 rounded-full text-[11px] font-bold bg-hlyellow text-ink hover:brightness-95">+ Add</button>
                    </div>
                    <div v-if="!providerList.some(x => !x.isPreset)" class="text-xs text-ink/45 py-2">None yet — add any OpenAI-compatible endpoint for your own session.</div>
                    <div v-else class="space-y-1.5">
                      <div v-for="p in providerList.filter(x => !x.isPreset)" :key="p.id" class="flex items-center justify-between gap-2 px-3 py-2 rounded-xl border border-ink/10">
                        <button class="text-left min-w-0" @click="selectProvider(p.id); showSettings=false">
                          <span class="block text-sm font-bold text-ink">{{ p.name }}</span>
                          <span class="block font-mono text-[10px] text-ink/45 truncate">{{ p.baseUrl }}</span>
                        </button>
                        <span class="flex gap-1 shrink-0">
                          <button @click="openEdit(p)" title="Edit" class="w-7 h-7 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/60">✎</button>
                          <button @click="askDelete(p)" title="Remove" class="w-7 h-7 rounded-lg hover:bg-redmargin/10 grid place-items-center text-redmargin">✕</button>
                        </span>
                      </div>
                    </div>
                  </div>

                  <!-- Add / Edit local form -->
                  <div v-if="formOpen" class="rounded-xl border border-dashed border-pen/40 bg-pen/[0.04] p-4 space-y-3">
                    <div class="grid md:grid-cols-2 gap-3">
                      <label class="text-xs font-semibold text-ink/70">Name
                        <input v-model="formName" placeholder="My free API / Ollama local" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                      </label>
                      <label class="text-xs font-semibold text-ink/70">API endpoint (base URL)
                        <input v-model="formUrl" placeholder="https://api.provider.com/v1" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                      </label>
                    </div>
                    <div class="grid md:grid-cols-2 gap-3">
                      <label class="text-xs font-semibold text-ink/70">Response API
                        <select v-model="formResponse" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                          <option value="openai-completions">OpenAI Chat Completions (/chat/completions)</option>
                          <option value="openai-responses">OpenAI Responses (/responses)</option>
                        </select>
                      </label>
                      <label class="text-xs font-semibold text-ink/70">API key <span class="font-normal text-ink/45">(blank = unauthenticated / local)</span>
                        <input v-model="formKey" type="password" placeholder="sk-… or leave empty" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                      </label>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button type="button" :disabled="formFetching" @click="formFetch" class="px-3.5 py-2 rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink/75 hover:border-pen hover:text-pen transition-colors disabled:opacity-50">{{ formFetching ? 'Fetching…' : 'Fetch models' }}</button>
                      <button type="button" @click="formSave" class="px-3.5 py-2 rounded-lg bg-pen text-white text-xs font-bold">{{ formEditingId ? 'Update' : 'Save provider' }}</button>
                      <button type="button" @click="formOpen=false" class="px-3.5 py-2 rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink/60 hover:text-ink">Cancel</button>
                    </div>
                    <label v-if="formModels.length" class="block text-xs font-semibold text-ink/70">Default model
                      <select v-model="formModelPick" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                        <option v-for="m in formModels" :key="m" :value="m">{{ m }}</option>
                      </select>
                    </label>
                    <label v-else class="block text-xs font-semibold text-ink/70">Model id
                      <input v-model="formManualModel" placeholder="type exact model id" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                    </label>
                    <p v-if="formStatus" class="text-[11px] font-medium" :class="formStatus.startsWith('Connected') || formStatus.includes('✓') ? 'text-green-700' : 'text-redmargin'">{{ formStatus }}</p>
                  </div>
                </div>
              </div>
            </Teleport>

            <div class="flex flex-wrap gap-3">
              <button :disabled="agentRunning" @click="startAgent(false)" class="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold disabled:opacity-50 transition-transform hover:-translate-y-0.5"><Play class="w-4 h-4" /> {{ agentRunning ? 'Extracting…' : 'Start page-by-page extraction' }}</button>
              <button v-if="resumeAvailable && !agentRunning" @click="startAgent(true)" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-correct/50 text-green-700 text-sm font-bold hover:bg-correct/[0.07] transition-colors"><RotateCcw class="w-4 h-4" /> Resume checkpoint</button>
              <button v-if="agentRunning" @click="cancelAgent" class="inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-redmargin/40 text-redmargin text-sm font-bold hover:bg-redmargin/[0.06]"><X class="w-4 h-4" /> Cancel</button>
            </div>

            <div v-if="agentProgress.length" class="space-y-2">
              <div class="grid grid-cols-8 sm:grid-cols-12 gap-1.5">
                <div v-for="p in agentProgress" :key="p.index" :title="'Page ' + (p.index+1) + (p.note ? ' — ' + p.note : '')" class="h-7 rounded-md grid place-items-center font-mono text-[10px]" :class="[p.status==='done' ? 'bg-correct/15 text-green-700' : p.status==='running' ? 'bg-pen text-white animate-pulse' : p.status==='failed' ? 'bg-redmargin text-white' : 'bg-ink/[0.06] text-ink/40']">{{ p.index+1 }}</div>
              </div>
              <div class="font-mono text-[11px] text-ink/50">{{ agentProgress.filter(x => x.status==='done').length }}/{{ agentProgress.length }} pages done — checkpoints save as you go; if it crashes, hit Resume{{ ocrUsed ? ' · Mistral OCR used' : '' }}</div>
            </div>
            <div v-if="agentError" class="p-4 bg-redmargin/[0.07] border border-redmargin/30 rounded-2xl text-sm text-redmargin font-medium whitespace-pre-wrap">{{ agentError }}</div>
          </div>
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
