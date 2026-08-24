<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted, watch } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import {
  loadProviders,
  upsertProvider,
  deleteProvider as deleteProviderEntry,
  fetchModels as fetchProviderModels,
  fetchEnvStatus,
  normalizeBaseUrl,
  type ProviderEntry,
} from "@/lib/providers"
import { extractPdfPages } from "@/lib/pdf"
import { needsOcr, ocrPdf } from "@/lib/ocr"
import { runAgentExtract, type AgentProgress, type AgentJobState } from "@/lib/agentExtract"
import PipelineFlow, { type PipeStage } from "@/components/PipelineFlow.vue"
import jsonSvg from "@/assets/json-reference.svg"
import pdfSvg from "@/assets/pdf.svg"
import doneUploadSvg from "@/assets/done-upload.svg"
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

const uploadPct = ref<number | null>(null)
const uploadDone = ref(false)

function readWithProgress(f: File): Promise<ArrayBuffer> {
  return new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onprogress = (e) => { if (e.lengthComputable) uploadPct.value = Math.round((e.loaded / e.total) * 100) }
    fr.onload = () => resolve(fr.result as ArrayBuffer)
    fr.onerror = () => reject(fr.error)
    fr.readAsArrayBuffer(f)
  })
}

async function onPdf(e: Event) {
  const t = e.target as HTMLInputElement
  const f = t.files?.[0]
  if (!f) return
  if (f.size > 20 * 1024 * 1024) {
    error.value = "PDF >20MB — compress first"
    return
  }
  pdfFile.value = f
  error.value = null
  uploadDone.value = false
  uploadPct.value = 0
  try {
    const buf = await readWithProgress(f)
    localStorage.setItem("rpdf2cbt-pdf-name", f.name)
    localStorage.setItem("rpdf2cbt-pdf-size", String(f.size))
    const db = getDB()
    // @ts-ignore dexie stores ArrayBuffer fine
    await db.pdfs.put({ id: "__pdf", name: f.name, buffer: buf, updatedAt: Date.now() }).catch(() => {})
    uploadPct.value = 100
    uploadDone.value = true
  } catch {
    error.value = "Could not read this PDF"
  } finally {
    setTimeout(() => { uploadPct.value = null }, 1400)
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
const envStatus = ref<Record<string, boolean>>({})
const envLoaded = ref(false)
void fetchEnvStatus().then((s) => { envStatus.value = s; envLoaded.value = true })

const activeProvider = computed(() => providerList.value.find((p) => p.id === activeProviderId.value))
const ocrReady = computed(() =>
  providerList.value.some((p) => p.id === "mistral") && envStatus.value["MISTRAL_API_KEY"] === true,
)
/** preset usable = no envKey needed OR that env key exists server-side (strict once loaded) */
function presetReady(p: ProviderEntry): boolean {
  if (!p.isPreset || !p.envKey) return true
  if (!envLoaded.value) return true // status fetch in flight — neutral
  return envStatus.value[p.envKey] === true // blank/missing key = NOT available
}
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

function selectModel(id: string, model: string) {
  activeProviderId.value = id
  activeModel.value = model
  const p = providerList.value.find((x) => x.id === id)
  if (p) { p.model = model; upsertProvider({ ...p }) }
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
const pipeStage = ref<PipeStage>("idle")
const resultInfo = ref<{ questions: number; pages: number; provider: string; model: string; ocr: boolean } | null>(null)
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
  pipeStage.value = "read"
  resultInfo.value = null
  try {
    const buf = await pdfFile.value.arrayBuffer()
    let pages = await extractPdfPages(buf)
    if (forceOcr.value || needsOcr(pages)) {
      // text-to-text models can't read scans — Mistral OCR first (625 pages/min free)
      ocrUsed.value = true
      pipeStage.value = "ocr"
      agentProgress.value = [{ index: 0, status: "running", note: "Scanned PDF — running Mistral OCR on all pages…" }]
      pages = await ocrPdf(pdfFile.value)
      if (abortCtl.signal.aborted) throw new Error("cancelled")
    } else {
      ocrUsed.value = false
    }
    const id = jobId.value
    let resumeState: AgentJobState | null = null
    if (resume) {
      const j = await getDB().extractJobs.get(id)
      if (j && j.pages.length === pages.length) resumeState = j as unknown as AgentJobState
    }
    pipeStage.value = "agent"
    const { paper } = await runAgentExtract({
      jobId: id,
      pages,
      entry: { ...prov, model: activeModel.value },
      allProviders: providerList.value.map((p) => ({ ...p, model: p.id === prov.id ? activeModel.value : (p.model || p.models[0] || "") })),
      delayMs: 1500,
      resumeState,
      onProgress: (p) => { agentProgress.value = p },
      onCheckpoint: async (s) => { await getDB().extractJobs.put({ ...s, results: s.results }).catch(() => {}) },
      signal: abortCtl.signal,
    })
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(paper))
    await getDB().papers.put({ id: "review", paper, updatedAt: Date.now() })
    // don't navigate — celebrate first 🎉
    pipeStage.value = "done"
    resultInfo.value = {
      questions: paper.questions.length,
      pages: pages.length,
      provider: prov.name,
      model: activeModel.value,
      ocr: ocrUsed.value,
    }
  } catch (e: unknown) {
    pipeStage.value = "idle"
    agentError.value = e instanceof Error ? e.message : String(e)
  } finally {
    agentRunning.value = false
    abortCtl = null
    void checkResume()
  }
}
function cancelAgent() { abortCtl?.abort() }

function goReview() {
  resultInfo.value = null
  pipeStage.value = "idle"
  router.push("/review")
}
function dismissResult() {
  resultInfo.value = null
  pipeStage.value = "idle"
}

/* ── Session persistence — refresh pe kuch loss nahi ── */
const savedTab = localStorage.getItem("rpdf2cbt-extract-tab")
if (savedTab === "gem" || savedTab === "agent") activeTab.value = savedTab
pasteText.value = localStorage.getItem("rpdf2cbt-extract-paste") || ""
watch(activeTab, (v) => localStorage.setItem("rpdf2cbt-extract-tab", v))
watch(pasteText, (v) => { try { localStorage.setItem("rpdf2cbt-extract-paste", v) } catch { /* quota */ } })
void (async () => {
  try {
    const cached = await getDB().pdfs.get("__pdf")
    if (cached?.buffer && !pdfFile.value) {
      pdfFile.value = new File([cached.buffer], cached.name || "paper.pdf", { type: "application/pdf" })
      void checkResume()
    }
  } catch { /* no cache yet */ }
})()
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
      <p class="ex-sub text-ink/60 mt-3 max-w-xl text-[16px] leading-relaxed">Primary: Gemini GEM paste — free, no key. Or run the built-in AI Agent on any free provider: page-by-page, checkpoints, Mistral OCR for scans.</p>

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
            <div class="mt-5 grid md:grid-cols-[3fr_1fr] gap-3">
              <div class="relative rounded-2xl border border-ink/12 bg-paper overflow-hidden focus-within:border-pen/50">
                <div class="absolute inset-0 grid place-items-center pointer-events-none select-none">
                  <img :src="jsonSvg" alt="" aria-hidden="true" class="w-14 h-14 opacity-[0.07]" />
                </div>
                <textarea v-model="pasteText" rows="12" placeholder='Paste full JSON here — e.g. {"meta":{"title":"Test",...},"sections":[],"questions":[...]}' class="relative w-full min-h-[250px] bg-transparent p-4 font-mono text-xs text-ink focus:outline-none placeholder:text-ink/30"></textarea>
              </div>
              <label class="relative rounded-2xl border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2 text-center p-3 cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors min-h-[250px]">
                <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
                <span class="relative inline-block pointer-events-none select-none">
                  <img :src="pdfSvg" alt="" class="w-14 h-14 opacity-80" />
                  <img v-if="uploadDone" :src="doneUploadSvg" alt="" class="absolute -bottom-1 -right-2 w-6 h-6 drop-shadow" />
                </span>
                <span class="text-[11px] font-semibold text-ink/55 leading-snug px-1 break-all">{{ pdfFile ? pdfFile.name : "Attach the same PDF —diagram crops in Review" }}</span>
                <div v-if="uploadPct !== null" class="w-full px-4 mt-1">
                  <div class="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                    <div class="h-full bg-pen transition-all duration-200" :style="{ width: uploadPct + '%' }"></div>
                  </div>
                  <span class="font-mono text-[10px] text-ink/45 mt-1 inline-block">{{ uploadDone ? "✓ saved to browser" : uploadPct + "%" }}</span>
                </div>
                <span v-else-if="pdfFile && uploadDone" class="font-mono text-[10px] text-correct">✓ {{ (pdfFile.size / 1024 / 1024).toFixed(2) }} MB</span>
              </label>
            </div>
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
        </div>

        <!-- ═══ TAB 2 · AI AGENT ═══ -->
        <div v-show="activeTab==='agent'" class="grid gap-6">
          <div class="flex items-center justify-end">
            <button type="button" @click="showSettings = true" class="inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-ink/15 bg-white text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors shadow-sm">
              <Settings class="w-3.5 h-3.5" /> Settings
            </button>
          </div>
          <div class="rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" @mousemove="handleSpotlight">
            <div class="flex items-center gap-2.5 mb-2">
              <span class="w-9 h-9 rounded-xl bg-hlgreen grid place-items-center"><UploadCloud class="w-4.5 h-4.5 text-ink" /></span>
              <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60">AGENT · STEP 1</span>
            </div>
            <div class="text-xl font-bold font-display tracking-tight">Upload PDF</div>
            <label class="mt-4 block border-2 border-dashed border-ink/15 rounded-2xl p-7 text-center cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors">
              <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
              <span class="relative inline-block pointer-events-none select-none">
                <img :src="pdfSvg" alt="" class="w-12 h-12 mx-auto opacity-80" />
                <img v-if="uploadDone" :src="doneUploadSvg" alt="" class="absolute -bottom-1 -right-2 w-6 h-6 drop-shadow" />
              </span>
              <span class="block mt-2 text-sm text-ink/55">{{ pdfFile ? pdfFile.name : "Drop or click — PDF under 20MB, stored in your browser only" }}</span>
            </label>
            <div v-if="pdfFile" class="text-sm text-correct font-medium mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
            <p v-if="resumeAvailable && !agentRunning" class="mt-3 text-[13px] font-medium text-green-700">✓ Previous checkpoint found — hit Resume checkpoint below</p>
            <label class="mt-3 flex items-start gap-2 text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" v-model="forceOcr" class="accent-pen mt-0.5" />
              <span>Scanned / image-only PDF? Force <b>Mistral OCR</b> needs MISTRAL_API_KEY. <b>Text-based PDFs are read directly — no OCR needed.</b></span>
            </label>
          </div>

        <!-- AI Agent tab — page-chunked extraction -->
        <div v-show="activeTab==='agent'" class="rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card" @mousemove="handleSpotlight">
          <div class="space-y-4">
            <!-- Provider + model pick -->
            <div class="flex items-center justify-between gap-3 rounded-xl bg-paper border border-ink/10 px-4 py-2.5">
              <span class="font-mono text-[11px] text-ink/60 truncate">⚙ {{ activeProvider ? activeProvider.name : 'No provider' }} <span class="text-ink/35">·</span> {{ activeModel || 'no model' }}</span>
              <button @click="showSettings=true" class="text-[11px] font-bold text-pen hover:underline shrink-0">change</button>
            </div>

            <!-- ⚙ Settings modal — preconfigured + local providers -->
            <Teleport to="body">
              <div v-if="showSettings" class="fixed inset-0 z-[200] bg-ink/50 backdrop-blur-sm grid place-items-center p-4" @click.self="showSettings=false">
                <div class="w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 p-6 space-y-5">
                  <div class="flex items-center justify-between">
                    <div class="text-lg font-bold font-display tracking-tight">AI Providers</div>
                    <button @click="showSettings=false" class="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">✕</button>
                  </div>

                  <!-- OCR readiness chip -->
                  <div class="flex items-center gap-2">
                    <span :class="['inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold', ocrReady ? 'bg-correct/[0.1] text-green-700 ring-1 ring-correct/30' : 'bg-redmargin/[0.08] text-redmargin ring-1 ring-redmargin/30']">
                      {{ ocrReady ? "✓ Mistral OCR ready" : "✕ Mistral OCR off" }}
                    </span>
                    <span class="text-[10px] text-ink/40">{{ ocrReady ? "scanned PDFs supported · [FREE] by owner key" : 'add a "mistral" provider in providers.yaml' }}</span>
                  </div>

                  <div>
                    <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45 mb-2">PRECONFIGURED — src/config/providers.yaml</div>
                    <div class="grid sm:grid-cols-2 gap-2.5">
                      <div v-for="p in providerList.filter(x => x.isPreset)" :key="p.id" :class="['relative rounded-2xl border-2 p-3 transition-all overflow-hidden', !presetReady(p) ? 'border-ink/10 opacity-50 grayscale cursor-not-allowed' : activeProviderId===p.id ? 'border-pen bg-pen/[0.04] shadow-[0_10px_25px_-14px_rgba(47,95,224,0.5)]' : 'border-ink/10 hover:border-ink/30']">
                        <div v-if="!presetReady(p)" class="absolute inset-0 z-10 grid place-items-center">
                          <span class="rotate-[-12deg] border-[3px] border-redmargin text-redmargin font-mono font-extrabold tracking-widest text-[10px] uppercase px-3 py-1 rounded-md bg-white/70">env not available</span>
                        </div>
                        <button class="w-full flex items-center justify-between gap-2" @click="presetReady(p) && selectProvider(p.id)">
                          <span class="text-sm font-extrabold font-display text-ink">{{ p.name }}</span>
                          <span :class="['w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold', presetReady(p) && activeProviderId===p.id ? 'bg-pen text-white' : 'bg-ink/[0.06] text-transparent']">✓</span>
                        </button>
                        <div class="font-mono text-[9px] mt-0.5" :class="presetReady(p) ? 'text-green-700' : 'text-redmargin'">{{ p.envKey ? (presetReady(p) ? 'env: ' + p.envKey + ' ✓ detected' : 'env: ' + p.envKey + ' ✗ missing') : 'BYOK' }}</div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <button v-for="m in p.models" :key="m" :disabled="!presetReady(p)" @click="presetReady(p) && selectModel(p.id, m)" :class="['px-2 py-1 rounded-lg font-mono text-[9px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed', presetReady(p) && activeProviderId===p.id && activeModel===m ? 'bg-pen text-white' : 'bg-paper border border-ink/12 text-ink/60 hover:border-pen/50 hover:text-pen']" :title="'use ' + m">{{ m }}</button>
                          <span v-if="!p.models.length" class="font-mono text-[9px] text-ink/35">no models listed</span>
                        </div>
                        <div v-if="PROVIDER_LIMITS[p.id]" class="mt-1.5 font-mono text-[8px] leading-snug text-ink/40">{{ PROVIDER_LIMITS[p.id] }}</div>
                      </div>
                    </div>
                    <p class="mt-2 text-[11px] text-ink/45">Controlled by the repo file <code class="bg-paper px-1 rounded border border-ink/10">providers.yaml</code> — edit it on GitHub and every user gets the update.</p>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45">YOUR LOCAL PROVIDERS — THIS BROWSER ONLY</div>
                    </div>
                    <div class="grid sm:grid-cols-2 gap-2.5">
                      <div v-for="p in providerList.filter(x => !x.isPreset)" :key="p.id" :class="['rounded-2xl border-2 p-3 transition-all', activeProviderId===p.id ? 'border-pen bg-pen/[0.04] shadow-[0_10px_25px_-14px_rgba(47,95,224,0.5)]' : 'border-ink/10 hover:border-ink/30']">
                        <div class="w-full flex items-center justify-between gap-2">
                          <button class="flex items-center gap-1.5 min-w-0" @click="selectProvider(p.id)">
                            <span class="text-sm font-extrabold font-display text-ink truncate">{{ p.name }}</span>
                            <span :class="['w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold', activeProviderId===p.id ? 'bg-pen text-white' : 'bg-ink/[0.06] text-transparent']">✓</span>
                          </button>
                          <span class="flex gap-0.5 shrink-0">
                            <button @click="openEdit(p)" title="Edit" class="w-6 h-6 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/50">✎</button>
                            <button @click="askDelete(p)" title="Remove" class="w-6 h-6 rounded-lg hover:bg-redmargin/10 grid place-items-center text-redmargin">✕</button>
                          </span>
                        </div>
                        <div class="font-mono text-[9px] text-ink/45 truncate mt-0.5">{{ p.baseUrl }} · {{ p.apiKey ? 'client key ✓' : 'no key' }}</div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <button v-for="m in p.models" :key="m" @click="selectModel(p.id, m)" :class="['px-2 py-1 rounded-lg font-mono text-[9px] transition-colors', activeProviderId===p.id && activeModel===m ? 'bg-pen text-white' : 'bg-paper border border-ink/12 text-ink/60 hover:border-pen/50 hover:text-pen']" :title="'use ' + m">{{ m }}</button>
                          <span v-if="!p.models.length" class="font-mono text-[9px] text-ink/35">no models — edit to fetch</span>
                        </div>
                      </div>
                      <button @click="openAdd" class="rounded-2xl border-2 border-dashed border-ink/20 p-3 text-left hover:border-pen/60 hover:bg-pen/[0.03] transition-all min-h-[92px] flex flex-col justify-center">
                        <span class="text-sm font-extrabold font-display text-ink/70">+ Add custom provider</span>
                        <span class="font-mono text-[9px] text-ink/40 mt-1">name · endpoint · key → fetch models</span>
                      </button>
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

            <!-- Live pipeline visualization -->
            <PipelineFlow
              v-if="agentRunning || pipeStage === 'done'"
              :stage="pipeStage"
              :ocr-used="ocrUsed"
              :provider-name="activeProvider?.name || '—'"
              :model-name="activeModel || '—'"
              :progress="agentProgress"
            />

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

  <!-- 🎉 Extraction complete popup -->
  <Teleport to="body">
    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div v-if="resultInfo" class="fixed inset-0 z-[220] bg-ink/60 backdrop-blur-sm grid place-items-center p-4">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 p-8 text-center space-y-4 relative overflow-hidden">
          <span class="absolute -top-6 -right-4 w-28 h-28 rounded-full bg-hlyellow/40 blur-2xl" aria-hidden="true"></span>
          <div class="text-5xl">🎉</div>
          <div class="text-2xl font-extrabold font-display tracking-tight">Extraction complete!</div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-paper border border-ink/10 py-3">
              <div class="text-xl font-extrabold font-display">{{ resultInfo.questions }}</div>
              <div class="font-mono text-[9px] uppercase tracking-wider text-ink/50">questions</div>
            </div>
            <div class="rounded-xl bg-paper border border-ink/10 py-3">
              <div class="text-xl font-extrabold font-display">{{ resultInfo.pages }}</div>
              <div class="font-mono text-[9px] uppercase tracking-wider text-ink/50">pages</div>
            </div>
            <div class="rounded-xl bg-paper border border-ink/10 py-3 px-1">
              <div class="text-[11px] font-bold truncate" :title="resultInfo.provider + ' · ' + resultInfo.model">{{ resultInfo.provider }}</div>
              <div class="font-mono text-[8px] uppercase tracking-wider text-ink/45">{{ resultInfo.ocr ? 'via OCR' : 'direct' }}</div>
            </div>
          </div>
          <p class="text-sm text-ink/55">Paper is ready — diagrams &amp; answers get polished in Review.</p>
          <div class="flex gap-2 justify-center pt-1">
            <button @click="goReview" class="px-7 py-3 rounded-xl bg-pen text-white text-sm font-bold hover:-translate-y-0.5 transition-transform shadow-[0_12px_30px_-12px_rgba(47,95,224,0.7)]">Review now →</button>
            <button @click="dismissResult" class="px-5 py-3 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/65 hover:border-ink/30 hover:text-ink transition-colors">Stay here</button>
          </div>
        </div>
      </div>
    </Transition>
  </Teleport>
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
