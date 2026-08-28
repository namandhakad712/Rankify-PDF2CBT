<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { ref, computed, onMounted, onBeforeUnmount, watch } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import {
  loadProviders,
  upsertProvider,
  deleteProvider as deleteProviderEntry,
  fetchModels as fetchProviderModels,
  fetchEnvStatus,
  fetchHealthStatus,
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
import { t } from "@/lib/i18n"


onMounted(() => {
  gsap.from(".ex-hero-badge", { y: 24, opacity: 0, duration: 0.7, ease: "power3.out" })
  gsap.from(".ex-title", { y: 40, opacity: 0, duration: 0.9, delay: 0.1, ease: "power4.out" })
  gsap.from(".ex-sub", { y: 20, opacity: 0, duration: 0.8, delay: 0.25, ease: "power3.out" })
  gsap.from(".tape-card", { y: 50, opacity: 0, duration: 0.8, stagger: 0.12, delay: 0.35, ease: "power2.out" })

  // Tab switch animation
  watch(activeTab, (val) => {
    const selector = val === 'gem' ? '.tab-gem' : '.tab-agent'
    const el = document.querySelector(selector)
    if (el) {
      gsap.fromTo(el, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.5, ease: 'power3.out' })
    }
  })

  // JSON paste glow watcher
  watch(pasteText, (val) => {
    const textarea = document.querySelector('.json-textarea') as HTMLElement
    if (!textarea) return
    if (val.trim().startsWith('{')) {
      textarea.classList.add('json-valid-glow')
    } else {
      textarea.classList.remove('json-valid-glow')
    }
  })
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
  const input = e.target as HTMLInputElement
  const f = input.files?.[0]
  if (!f) return
  if (f.size > 20 * 1024 * 1024) {
    error.value = t("extract.err.pdfTooBig")
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
    error.value = t("extract.err.readFailed")
  } finally {
    setTimeout(() => { uploadPct.value = null }, 1400)
  }
}

async function handlePasteParse() {
  error.value = null
  issuesText.value = null
  if (!pasteText.value.trim()) {
    error.value = t("extract.err.pasteFirst")
    return
  }
  parsing.value = true
  try {
    const r = parsePastedJSON(pasteText.value)
    if (!r.ok) {
      error.value = r.error || t("extract.err.parseFailed")
      if (r.issues) issuesText.value = r.issues.map((x) => `[${x.severity}] ${x.qId ?? ""} ${x.field}: ${x.message}`).join("\n")
      return
    }
    localStorage.setItem("rpdf2cbt-review", JSON.stringify(r.paper))
    await getDB().papers.put({ id: "review", paper: r.paper!, updatedAt: Date.now() })
    issuesText.value = r.issues?.length ? r.issues.map((x) => `[${x.severity}] ${x.field}: ${x.message}`).join("\n") : null
    // brief pause so the loader is visible before handoff
    await new Promise((r) => setTimeout(r, 650))
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
      error.value = r.error || t("extract.err.fetchFailed")
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
/* Rate-limit notes live in i18n under extract.limits.* */
const PROVIDERS_WITH_LIMITS = ["groq", "mistral", "nvidia"]

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
const formStatusOk = ref(false)
const formFetching = ref(false)
const envStatus = ref<Record<string, boolean>>({})
const envLoaded = ref(false)
void fetchEnvStatus().then((s) => { envStatus.value = s; envLoaded.value = true })
const healthStatus = ref<Record<string, { ok: boolean; hasKey: boolean; error?: string }>>({})
const healthLastChecked = ref<number | null>(null)
const healthChecking = ref(false)
async function refreshHealth() {
  healthChecking.value = true
  try {
    const h = await fetchHealthStatus(true)
    healthStatus.value = h
    healthLastChecked.value = Date.now()
  } finally { healthChecking.value = false }
}
void fetchHealthStatus().then((h) => { healthStatus.value = h; healthLastChecked.value = Date.now() })

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
const streakInfoExtract = ref<{count:number;best:number;lastDate:string}|null>(null)
try { const raw = localStorage.getItem("rpdf2cbt-streak"); if (raw) { const s = JSON.parse(raw); if (s.count) streakInfoExtract.value = s } } catch {}

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
  formStatusOk.value = false
  if (!formUrl.value.trim()) { formStatus.value = t("extract.settings.form.errUrl"); return }
  formFetching.value = true
  try {
    const list = await fetchProviderModels(formUrl.value, formKey.value)
    formModels.value = list
    if (!list.length) {
      formStatus.value = t("extract.settings.form.noModels")
      formStatusOk.value = true
    } else {
      formStatus.value = `${t("extract.settings.form.connected")}${list.length} ${t("extract.settings.form.modelsFound")}`
      formStatusOk.value = true
      if (!formModelPick.value) formModelPick.value = list.find((m) => m.includes("free")) || list[0]
    }
  } catch (e: unknown) {
    formStatus.value = e instanceof Error ? e.message : String(e)
  } finally {
    formFetching.value = false
  }
}

function formSave() {
  if (!formName.value.trim()) { formStatus.value = t("extract.settings.form.errName"); formStatusOk.value = false; return }
  if (!formUrl.value.trim()) { formStatus.value = t("extract.settings.form.errUrl"); formStatusOk.value = false; return }
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
  if (!window.confirm(`${t("extract.settings.confirmRemove")} "${p.name}"?`)) return
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
  if (!pdfFile.value) { agentError.value = t("extract.agent.errPdfFirst"); return }
  const prov = activeProvider.value
  if (!prov) { agentError.value = t("extract.agent.errProvider"); return }
  if (!activeModel.value) { agentError.value = t("extract.agent.errModel"); return }
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
      agentProgress.value = [{ index: 0, status: "running", note: t("extract.agent.ocrRunningNote") }]
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

/* ── Past sessions — manage previous CBT attempts & drafts ── */
interface SessionRow { id: number; title: string; when: string; score: string; pct: number; paper: import("@/types").UniversalPaper; resultId?: number }
const pastSessions = ref<SessionRow[]>([])
const draftSession = ref<{ title: string; when: string; qs: number } | null>(null)
/* storage health — warn at 15 papers / 75% quota */
const STORAGE_LIMIT = 15
const storageEstimate = ref<{ usage: number; quota: number; pct: number } | null>(null)
const searchQuery = ref("")
const sessionPage = ref(1)
const SESSION_PAGE_SIZE = 10
const exportBusyId = ref<number | null>(null)

const totalStored = computed(() => pastSessions.value.length + (draftSession.value ? 1 : 0))
const showStorageWarning = computed(() => totalStored.value >= STORAGE_LIMIT)
const storageWarningLevel = computed(() => {
  if (totalStored.value >= STORAGE_LIMIT + 5) return "critical"
  if (totalStored.value >= STORAGE_LIMIT) return "warn"
  if ((storageEstimate.value?.pct ?? 0) >= 80) return "critical"
  if ((storageEstimate.value?.pct ?? 0) >= 65) return "warn"
  return "ok"
})

const filteredSessions = computed(() => {
  const q = searchQuery.value.trim().toLowerCase()
  if (!q) return pastSessions.value
  return pastSessions.value.filter(r => r.title.toLowerCase().includes(q) || r.when.toLowerCase().includes(q))
})
const totalFilteredPages = computed(() => Math.max(1, Math.ceil(filteredSessions.value.length / SESSION_PAGE_SIZE)))
const paginatedSessions = computed(() => {
  const start = (sessionPage.value - 1) * SESSION_PAGE_SIZE
  return filteredSessions.value.slice(start, start + SESSION_PAGE_SIZE)
})
watch(searchQuery, () => { sessionPage.value = 1 })
watch(filteredSessions, () => { if (sessionPage.value > totalFilteredPages.value) sessionPage.value = totalFilteredPages.value })

async function refreshStorageEstimate() {
  try {
    if (navigator.storage?.estimate) {
      const e: any = await navigator.storage.estimate()
      const pct = e.quota ? Math.round(((e.usage || 0) / e.quota) * 100) : 0
      storageEstimate.value = { usage: e.usage || 0, quota: e.quota || 0, pct }
    }
  } catch {}
}

async function loadSessions() {
  try {
    const db = getDB()
    const rows = await db.results.orderBy("createdAt").reverse().toArray()
    pastSessions.value = rows.map((r) => ({
      id: r.id!,
      title: r.paper?.meta?.title || t("extract.past.untitled"),
      when: new Date(r.createdAt).toLocaleString(),
      score: `${r.score?.obtained ?? 0}/${r.score?.total ?? r.paper?.questions?.length ?? 0}`,
      pct: r.score?.percentage ?? 0,
      paper: r.paper,
      resultId: r.id,
    }))
    const draft = await db.papers.get("review")
    draftSession.value = draft?.paper ? { title: draft.paper.meta?.title || t("extract.past.untitledDraft"), when: new Date(draft.updatedAt).toLocaleString(), qs: draft.paper.questions?.length || 0 } : null
    void refreshStorageEstimate()
  } catch { /* table missing on old DBs */ }
}
void loadSessions()

function exportPaperJSON(row: SessionRow) {
  try {
    exportBusyId.value = row.id
    const fname = `${(row.title || 'paper').replace(/[^a-z0-9-_ ]/gi, '_').slice(0, 40)}-${row.id}.json`
    const blob = new Blob([JSON.stringify(row.paper, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fname
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1200)
  } finally {
    setTimeout(() => { exportBusyId.value = null }, 600)
  }
}
function exportDraftJSON() {
  if (!draftSession.value) return
  getDB().papers.get("review").then(rec => {
    if (!rec?.paper) return
    const fname = `${(rec.paper.meta?.title || 'draft').replace(/[^a-z0-9-_ ]/gi, '_').slice(0, 40)}-draft.json`
    const blob = new Blob([JSON.stringify(rec.paper, null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = fname
    a.click()
    setTimeout(() => URL.revokeObjectURL(url), 1200)
  })
}
async function exportAllJSON() {
  if (!pastSessions.value.length) return
  const all = pastSessions.value.map(r => r.paper)
  const blob = new Blob([JSON.stringify(all, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `rankify-export-${new Date().toISOString().slice(0,10)}-${all.length}papers.json`
  a.click()
  setTimeout(() => URL.revokeObjectURL(url), 1200)
}

async function openReport(row: SessionRow) {
  const db = getDB()
  const rec = await db.results.get(row.resultId!)
  if (!rec) return
  localStorage.setItem("rpdf2cbt-last-result", JSON.stringify({ paper: rec.paper, answers: {}, status: {}, createdAt: rec.createdAt, score: rec.score }))
  router.push("/results")
}

async function retake(row: SessionRow) {
  const db = getDB()
  await db.papers.put({ id: "current", paper: JSON.parse(JSON.stringify(row.paper)), updatedAt: Date.now() })
  localStorage.setItem("rpdf2cbt-current", JSON.stringify(row.paper))
  router.push("/test")
}

async function deleteSession(row: SessionRow) {
  if (!window.confirm(`${t("extract.past.confirmA")} "${row.title}" (${row.when})? ${t("extract.past.confirmB")}`)) return
  if (row.resultId != null) await getDB().results.delete(row.resultId)
  await loadSessions()
}

async function deleteDraft() {
  if (!window.confirm(t("extract.past.delDraftQ"))) return
  await getDB().papers.delete("review")
  draftSession.value = null
  void loadSessions()
}

async function openDraft() { router.push("/review") }
function scrollToPastManager() {
  document.getElementById('past-manager')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}

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
      <button class="text-sm font-medium text-ink/50 hover:text-ink transition-colors" @click="router.push('/')">{{ t('extract.backHome') }}</button>

      <div class="mt-5 flex flex-wrap items-center gap-2 ex-hero-badge">
        <span class="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-ink/10 bg-white text-[13px] font-semibold text-ink/70">
          <span class="h-2 w-2 rounded-full bg-correct"></span>
          {{ t('extract.badge') }}
        </span>
        <span v-if="streakInfoExtract" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-hlyellow border border-hlyellow text-xs font-bold text-ink">🔥 {{ streakInfoExtract.count }} day streak · best {{ streakInfoExtract.best }}</span>
      </div>
      <h1 class="ex-title text-4xl md:text-6xl font-display font-extrabold tracking-tight mt-3">
        {{ t('extract.title.1') }}<span class="relative inline-block">{{ t('extract.title.2') }}<span class="absolute inset-x-[-4px] inset-y-[14%] -z-10 rounded-sm bg-hlyellow"></span></span>
      </h1>
      <p class="ex-sub text-ink/60 mt-3 max-w-xl text-[16px] leading-relaxed">{{ t('extract.sub') }}</p>

      <div class="mt-10 grid gap-8">
        <!-- Step I — GEM -->
        <!-- Flow tabs -->
        <div class="sticky top-24 z-30 flex gap-2 px-1 overflow-x-auto">
          <button @click="activeTab='gem'" :class="['min-h-[40px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0', activeTab==='gem' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">{{ t('extract.tab.gem') }}</button>
          <button @click="activeTab='agent'" :class="['min-h-[40px] px-5 py-2.5 rounded-xl text-sm font-bold transition-all shrink-0', activeTab==='agent' ? 'bg-pen text-white shadow-[0_10px_25px_-12px_rgba(47,95,224,0.6)]' : 'bg-white border border-ink/12 text-ink/60 hover:text-ink']">{{ t('extract.tab.agent') }}</button>
        </div>

        <!-- ═══ TAB 1 · GEM — paste JSON ═══ -->
        <div v-show="activeTab==='gem'" class="grid gap-6 tab-gem">
          <div class="tape-card relative rounded-lg bg-white p-4 lg:p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card overflow-hidden" style="transform: rotate(-0.3deg)" @mousemove="handleSpotlight">
            <div class="tape" aria-hidden="true"></div>
            <div class="flex items-center gap-2.5 mb-2 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-pen/10 grid place-items-center shrink-0"><Sparkles class="w-4.5 h-4.5 text-pen" /></span>
              <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-pen break-words">{{ t('extract.gem.label') }}</span>
            </div>
            <div class="text-xl lg:text-2xl font-bold font-display tracking-tight break-words">{{ t('extract.gem.title') }}</div>
            <div class="mt-5 grid grid-cols-1 md:grid-cols-3 gap-3">
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">1</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">{{ t('extract.gem.step1') }}</p>
                <a href="https://ishortn.ink/gemini-gem" target="_blank" @mousemove="handleMagnetic" @mouseleave="resetMagnetic" class="magnetic-btn group mt-3 inline-flex items-center gap-1.5 px-4 py-2 rounded-lg bg-pen text-white text-xs font-bold transition-transform hover:-translate-y-0.5">
                  {{ t('extract.gem.step1.cta') }} <ArrowRight class="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </a>
              </div>
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">2</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">{{ t('extract.gem.step2') }}</p>
                <span class="font-hand text-lg text-ink/45 -rotate-2 inline-block mt-2">ctrl+A, ctrl+C</span>
              </div>
              <div class="rounded-2xl border border-ink/10 bg-paper p-4">
                <div class="font-hand text-2xl text-pen leading-none">3</div>
                <p class="mt-2 text-[13px] text-ink/65 leading-snug">{{ t('extract.gem.step3') }}</p>
                <ClipboardPaste class="w-5 h-5 text-ink/35 mt-2" />
              </div>
            </div>
            <div class="mt-5 grid grid-cols-1 md:grid-cols-[3fr_1fr] gap-3">
              <div class="relative min-w-0 rounded-2xl border border-ink/12 bg-paper overflow-hidden focus-within:border-pen/50">
                <div class="absolute inset-0 grid place-items-center pointer-events-none select-none">
                  <img :src="jsonSvg" alt="" aria-hidden="true" class="w-14 h-14 opacity-[0.07]" />
                </div>
                <textarea v-model="pasteText" rows="12" :placeholder="t('extract.gem.pastePlaceholder')" class="json-textarea relative w-full min-w-0 min-h-[250px] bg-transparent p-4 font-mono text-xs text-ink focus:outline-none placeholder:text-ink/30 break-words"></textarea>
              </div>
              <label class="relative min-w-0 rounded-2xl border-2 border-dashed border-ink/15 flex flex-col items-center justify-center gap-2 text-center p-3 cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors min-h-[250px]">
                <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
                <span class="relative inline-block pointer-events-none select-none">
                  <img :src="pdfSvg" alt="" class="w-14 h-14 opacity-80" />
                  <img v-if="uploadDone" :src="doneUploadSvg" alt="" class="absolute -bottom-1 -right-2 w-6 h-6 drop-shadow" />
                </span>
                <span class="text-[11px] font-semibold text-ink/55 leading-snug px-1 break-all">{{ pdfFile ? pdfFile.name : t('extract.gem.pdfPrompt') }}</span>
                <div v-if="uploadPct !== null" class="w-full px-4 mt-1">
                  <div class="h-1.5 rounded-full bg-ink/10 overflow-hidden">
                    <div class="h-full bg-pen transition-all duration-200" :style="{ width: uploadPct + '%' }"></div>
                  </div>
                  <span class="font-mono text-[10px] text-ink/45 mt-1 inline-block">{{ uploadDone ? t('extract.gem.savedToBrowser') : uploadPct + "%" }}</span>
                </div>
                <span v-else-if="pdfFile && uploadDone" class="font-mono text-[10px] text-correct">✓ {{ (pdfFile.size / 1024 / 1024).toFixed(2) }} MB</span>
              </label>
            </div>
            <div class="mt-4 flex flex-wrap gap-3">
              <button :disabled="parsing" class="min-h-[44px] px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold disabled:opacity-50 transition-transform hover:-translate-y-0.5" @click="handlePasteParse">{{ parsing ? t('extract.gem.parsing') : t('extract.gem.parseBtn') }} <ArrowRight v-if="!parsing" class="w-4 h-4 inline ml-1" /></button>
              <button class="min-h-[44px] px-5 py-3 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/70 hover:border-ink/30 hover:text-ink transition-colors" @click="pasteText=''">{{ t('extract.gem.clear') }}</button>
            </div>
            <div class="mt-4 flex flex-col sm:flex-row gap-2">
              <input v-model="pasteUrl" :placeholder="t('extract.gem.urlPlaceholder')" class="flex-1 min-w-0 w-full bg-paper border border-ink/12 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/50 placeholder:text-ink/35 break-all" />
              <button class="min-h-[44px] px-5 py-2.5 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/70 hover:border-ink/30 hover:text-ink transition-colors shrink-0" @click="handleUrlFetch">{{ t('extract.gem.fetchUrl') }}</button>
            </div>
            <div v-if="error" class="mt-4 p-4 bg-redmargin/[0.07] border border-redmargin/30 rounded-2xl text-sm text-redmargin font-medium whitespace-pre-wrap break-words break-all overflow-hidden">{{ error }}</div>
            <div v-if="issuesText" class="mt-2 p-4 bg-hlyellow/40 border border-hlyellow rounded-2xl text-xs text-ink/75 whitespace-pre-wrap break-words break-all overflow-hidden">{{ issuesText }}</div>
          </div>
        </div>

        <!-- ═══ TAB 2 · AI AGENT ═══ -->
        <div v-show="activeTab==='agent'" class="grid gap-6 tab-agent">
          <div class="flex items-center justify-end">
            <button type="button" @click="showSettings = true" class="min-h-[40px] inline-flex items-center gap-2 px-4 py-2 rounded-xl border border-ink/15 bg-white text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors shadow-sm">
              <Settings class="w-3.5 h-3.5" /> {{ t('extract.agent.settingsBtn') }}
            </button>
          </div>
          <div class="rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card overflow-hidden" @mousemove="handleSpotlight">
            <div class="flex items-center gap-2.5 mb-2 min-w-0">
              <span class="w-9 h-9 rounded-xl bg-hlgreen grid place-items-center shrink-0"><UploadCloud class="w-4.5 h-4.5 text-ink" /></span>
              <span class="font-mono text-[11px] font-bold tracking-[0.25em] text-ink/60 break-words">{{ t('extract.agent.stepLabel') }}</span>
            </div>
            <div class="text-lg lg:text-xl font-bold font-display tracking-tight break-words">{{ t('extract.agent.uploadTitle') }}</div>
            <label class="mt-4 block border-2 border-dashed border-ink/15 rounded-2xl p-7 text-center cursor-pointer hover:border-pen/50 hover:bg-pen/[0.03] transition-colors">
              <input type="file" accept="application/pdf" class="hidden" @change="(e)=>{onPdf(e); onPdfAgent()}" />
              <span class="relative inline-block pointer-events-none select-none">
                <img :src="pdfSvg" alt="" class="w-12 h-12 mx-auto opacity-80" />
                <img v-if="uploadDone" :src="doneUploadSvg" alt="" class="absolute -bottom-1 -right-2 w-6 h-6 drop-shadow" />
              </span>
              <span class="block mt-2 text-sm text-ink/55">{{ pdfFile ? pdfFile.name : t('extract.agent.dropHint') }}</span>
            </label>
            <div v-if="pdfFile" class="text-sm text-correct font-medium mt-2">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
            <p v-if="resumeAvailable && !agentRunning" class="mt-3 text-[13px] font-medium text-green-700">✓ {{ t('extract.agent.checkpointFound') }}</p>
            <label class="mt-3 flex items-start gap-2 text-xs text-ink/60 cursor-pointer">
              <input type="checkbox" v-model="forceOcr" class="accent-pen mt-0.5" />
              <span>{{ t('extract.agent.ocrQ') }}<b>Mistral OCR</b>{{ t('extract.agent.ocrNeeds') }}<b>{{ t('extract.agent.ocrDirect') }}</b></span>
            </label>
          </div>

        <!-- AI Agent tab — page-chunked extraction -->
        <div v-show="activeTab==='agent'" class="rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] spotlight-card overflow-hidden" @mousemove="handleSpotlight">
          <div class="space-y-4">
            <!-- Provider + model pick -->
            <div class="flex items-center justify-between gap-2 lg:gap-3 rounded-xl bg-paper border border-ink/10 px-3 lg:px-4 py-2.5 min-h-[40px]">
              <span class="font-mono text-[11px] text-ink/60 truncate min-w-0 break-all">⚙ {{ activeProvider ? activeProvider.name : t('extract.agent.noProvider') }} <span class="text-ink/35">·</span> {{ activeModel || t('extract.agent.noModel') }}</span>
              <button @click="showSettings=true" class="min-h-[40px] px-3 py-1 text-[11px] font-bold text-pen hover:underline shrink-0">{{ t('extract.agent.change') }}</button>
            </div>

            <!-- ⚙ Settings modal — preconfigured + local providers -->
            <Teleport to="body">
              <div v-if="showSettings" class="fixed inset-0 z-[200] bg-ink/50 backdrop-blur-sm grid place-items-center p-4" @click.self="showSettings=false">
                <div class="w-full max-w-xl max-h-[85vh] overflow-auto rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 p-6 space-y-5">
                  <div class="flex items-center justify-between">
                    <div class="text-lg font-bold font-display tracking-tight">{{ t('extract.settings.title') }}</div>
                    <button @click="showSettings=false" class="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60">✕</button>
                  </div>

                  <!-- OCR readiness chip + health refresh -->
                  <div class="flex items-center gap-2 flex-wrap">
                    <span :class="['inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-bold', ocrReady ? 'bg-correct/[0.1] text-green-700 ring-1 ring-correct/30' : 'bg-redmargin/[0.08] text-redmargin ring-1 ring-redmargin/30']">
                      {{ ocrReady ? "✓ " + t('extract.settings.ocrReady') : "✕ " + t('extract.settings.ocrOff') }}
                    </span>
                    <span class="text-[10px] text-ink/40">{{ ocrReady ? t('extract.settings.ocrReadyNote') : t('extract.settings.ocrOffNote') }}</span>
                  </div>
                  <div class="flex items-center gap-2">
                    <button @click="refreshHealth" :disabled="healthChecking" class="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-ink/10 bg-paper text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen disabled:opacity-40">{{ healthChecking ? 'Checking…' : '↻ Recheck providers' }}</button>
                    <span v-if="healthLastChecked" class="font-mono text-[10px] text-ink/35">last: {{ new Date(healthLastChecked).toLocaleTimeString() }} · cached 24h</span>
                    <span v-else class="font-mono text-[10px] text-ink/35">cached 24h</span>
                  </div>

                  <div>
                    <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45 mb-2">{{ t('extract.settings.preconfigured') }}</div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div v-for="p in providerList.filter(x => x.isPreset)" :key="p.id" :class="['relative rounded-2xl border-2 p-3 transition-all overflow-hidden min-w-0', !presetReady(p) ? 'border-ink/10 opacity-50 grayscale cursor-not-allowed' : healthStatus[p.id] && !healthStatus[p.id].ok ? 'border-amber-300 opacity-90' : activeProviderId===p.id ? 'border-pen bg-pen/[0.04] shadow-[0_10px_25px_-14px_rgba(47,95,224,0.5)]' : 'border-ink/10 hover:border-ink/30']">
                        <div v-if="!presetReady(p)" class="absolute inset-0 z-10 grid place-items-center">
                          <span class="rotate-[-12deg] border-[3px] border-redmargin text-redmargin font-mono font-extrabold tracking-widest text-[10px] uppercase px-3 py-1 rounded-md bg-white/70">{{ t('extract.settings.envNotAvailable') }}</span>
                        </div>
                        <div v-else-if="healthStatus[p.id] && !healthStatus[p.id].ok" class="absolute inset-0 z-10 grid place-items-center pointer-events-none">
                          <span class="rotate-[-12deg] border-[3px] border-amber-500 text-amber-600 font-mono font-extrabold tracking-widest text-[10px] uppercase px-3 py-1 rounded-md bg-white/85 shadow-sm">Provider not working</span>
                        </div>
                        <button class="w-full flex items-center justify-between gap-2" @click="presetReady(p) && selectProvider(p.id)">
                          <span class="text-sm font-extrabold font-display text-ink">{{ p.name }}</span>
                          <span :class="['w-5 h-5 rounded-full grid place-items-center text-[10px] font-bold', presetReady(p) && activeProviderId===p.id ? 'bg-pen text-white' : 'bg-ink/[0.06] text-transparent']">✓</span>
                        </button>
                        <div class="font-mono text-[9px] mt-0.5" :class="presetReady(p) ? 'text-green-700' : 'text-redmargin'">{{ p.envKey ? (presetReady(p) ? 'env: ' + p.envKey + t('extract.settings.envDetected') : 'env: ' + p.envKey + t('extract.settings.envMissing')) : t('extract.settings.byok') }}</div>
                        <div v-if="healthStatus[p.id]" class="font-mono text-[8px] mt-0.5 truncate" :class="healthStatus[p.id]!.ok ? 'text-green-700' : 'text-amber-600'">{{ healthStatus[p.id]!.ok ? '✓ working' : '✗ not working' + (healthStatus[p.id]!.error ? ' — ' + (healthStatus[p.id]!.error as string).slice(0,45) : '') }}</div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <button v-for="m in p.models" :key="m" :disabled="!presetReady(p)" @click="presetReady(p) && selectModel(p.id, m)" :class="['px-2 py-1 rounded-lg font-mono text-[9px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed', presetReady(p) && activeProviderId===p.id && activeModel===m ? 'bg-pen text-white' : 'bg-paper border border-ink/12 text-ink/60 hover:border-pen/50 hover:text-pen']" :title="t('extract.settings.useModel') + m">{{ m }}</button>
                          <span v-if="!p.models.length" class="font-mono text-[9px] text-ink/35">{{ t('extract.settings.noModelsListed') }}</span>
                        </div>
                        <div v-if="PROVIDERS_WITH_LIMITS.includes(p.id)" class="mt-1.5 font-mono text-[8px] leading-snug text-ink/40">{{ t('extract.limits.' + p.id) }}</div>
                      </div>
                    </div>
                    <p class="mt-2 text-[11px] text-ink/45">{{ t('extract.settings.limitsNote.a') }}<code class="bg-paper px-1 rounded border border-ink/10">providers.yaml</code>{{ t('extract.settings.limitsNote.b') }}</p>
                  </div>

                  <div>
                    <div class="flex items-center justify-between mb-2">
                      <div class="font-mono text-[10px] font-bold tracking-[0.25em] text-ink/45">{{ t('extract.settings.localTitle') }}</div>
                    </div>
                    <div class="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      <div v-for="p in providerList.filter(x => !x.isPreset)" :key="p.id" :class="['rounded-2xl border-2 p-3 transition-all min-w-0', activeProviderId===p.id ? 'border-pen bg-pen/[0.04] shadow-[0_10px_25px_-14px_rgba(47,95,224,0.5)]' : 'border-ink/10 hover:border-ink/30']">
                        <div class="w-full flex items-center justify-between gap-2">
                          <button class="flex items-center gap-1.5 min-w-0" @click="selectProvider(p.id)">
                            <span class="text-sm font-extrabold font-display text-ink truncate">{{ p.name }}</span>
                            <span :class="['w-5 h-5 shrink-0 rounded-full grid place-items-center text-[10px] font-bold', activeProviderId===p.id ? 'bg-pen text-white' : 'bg-ink/[0.06] text-transparent']">✓</span>
                          </button>
                          <span class="flex gap-0.5 shrink-0">
                            <button @click="openEdit(p)" :title="t('extract.settings.titleEdit')" class="w-6 h-6 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/50">✎</button>
                            <button @click="askDelete(p)" :title="t('extract.settings.titleRemove')" class="w-6 h-6 rounded-lg hover:bg-redmargin/10 grid place-items-center text-redmargin">✕</button>
                          </span>
                        </div>
                        <div class="font-mono text-[9px] text-ink/45 truncate mt-0.5">{{ p.baseUrl }} · {{ p.apiKey ? t('extract.settings.clientKey') : t('extract.settings.noKey') }}</div>
                        <div class="mt-2 flex flex-wrap gap-1">
                          <button v-for="m in p.models" :key="m" @click="selectModel(p.id, m)" :class="['px-2 py-1 rounded-lg font-mono text-[9px] transition-colors', activeProviderId===p.id && activeModel===m ? 'bg-pen text-white' : 'bg-paper border border-ink/12 text-ink/60 hover:border-pen/50 hover:text-pen']" :title="t('extract.settings.useModel') + m">{{ m }}</button>
                          <span v-if="!p.models.length" class="font-mono text-[9px] text-ink/35">{{ t('extract.settings.noModelsEdit') }}</span>
                        </div>
                      </div>
                      <button @click="openAdd" class="rounded-2xl border-2 border-dashed border-ink/20 p-3 text-left hover:border-pen/60 hover:bg-pen/[0.03] transition-all min-h-[92px] flex flex-col justify-center">
                        <span class="text-sm font-extrabold font-display text-ink/70">{{ t('extract.settings.addTitle') }}</span>
                        <span class="font-mono text-[9px] text-ink/40 mt-1">{{ t('extract.settings.addSub') }}</span>
                      </button>
                    </div>
                  </div>

                  <!-- Add / Edit local form -->
                  <div v-if="formOpen" class="rounded-xl border border-dashed border-pen/40 bg-pen/[0.04] p-4 space-y-3 overflow-hidden">
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label class="text-xs font-semibold text-ink/70 min-w-0">{{ t('extract.settings.form.name') }}
                        <input v-model="formName" :placeholder="t('extract.settings.form.namePh')" class="mt-1 w-full min-w-0 border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                      </label>
                      <label class="text-xs font-semibold text-ink/70 min-w-0">{{ t('extract.settings.form.url') }}
                        <input v-model="formUrl" :placeholder="t('extract.settings.form.urlPh')" class="mt-1 w-full min-w-0 border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40 break-all" />
                      </label>
                    </div>
                    <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                      <label class="text-xs font-semibold text-ink/70">{{ t('extract.settings.form.response') }}
                        <select v-model="formResponse" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                          <option value="openai-completions">{{ t('extract.settings.form.resp1') }}</option>
                          <option value="openai-responses">{{ t('extract.settings.form.resp2') }}</option>
                        </select>
                      </label>
                      <label class="text-xs font-semibold text-ink/70">{{ t('extract.settings.form.key') }} <span class="font-normal text-ink/45">{{ t('extract.settings.form.keyNote') }}</span>
                        <input v-model="formKey" type="password" :placeholder="t('extract.settings.form.keyPh')" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                      </label>
                    </div>
                    <div class="flex flex-wrap gap-2">
                      <button type="button" :disabled="formFetching" @click="formFetch" class="min-h-[40px] px-3.5 py-2 rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink/75 hover:border-pen hover:text-pen transition-colors disabled:opacity-50">{{ formFetching ? t('extract.settings.form.fetching') : t('extract.settings.form.fetch') }}</button>
                      <button type="button" @click="formSave" class="min-h-[40px] px-3.5 py-2 rounded-lg bg-pen text-white text-xs font-bold">{{ formEditingId ? t('extract.settings.form.update') : t('extract.settings.form.save') }}</button>
                      <button type="button" @click="formOpen=false" class="min-h-[40px] px-3.5 py-2 rounded-lg border border-ink/15 bg-paper text-xs font-bold text-ink/60 hover:text-ink">{{ t('extract.settings.form.cancel') }}</button>
                    </div>
                    <label v-if="formModels.length" class="block text-xs font-semibold text-ink/70">{{ t('extract.settings.form.defaultModel') }}
                      <select v-model="formModelPick" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
                        <option v-for="m in formModels" :key="m" :value="m">{{ m }}</option>
                      </select>
                    </label>
                    <label v-else class="block text-xs font-semibold text-ink/70">{{ t('extract.settings.form.modelId') }}
                      <input v-model="formManualModel" :placeholder="t('extract.settings.form.modelIdPh')" class="mt-1 w-full border border-ink/15 rounded-lg px-2.5 py-2 bg-white text-ink focus:outline-none focus:ring-2 focus:ring-pen/40" />
                    </label>
                    <p v-if="formStatus" class="text-[11px] font-medium" :class="formStatusOk ? 'text-green-700' : 'text-redmargin'">{{ formStatus }}</p>
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
              <button :disabled="agentRunning" @click="startAgent(false)" class="min-h-[44px] inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-pen text-white text-sm font-bold disabled:opacity-50 transition-transform hover:-translate-y-0.5"><Play class="w-4 h-4" /> {{ agentRunning ? t('extract.agent.starting') : t('extract.agent.startBtn') }}</button>
              <button v-if="resumeAvailable && !agentRunning" @click="startAgent(true)" class="min-h-[44px] inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-correct/50 text-green-700 text-sm font-bold hover:bg-correct/[0.07] transition-colors"><RotateCcw class="w-4 h-4" /> {{ t('extract.agent.resume') }}</button>
              <button v-if="agentRunning" @click="cancelAgent" class="min-h-[44px] inline-flex items-center gap-2 px-5 py-3 rounded-xl border-2 border-redmargin/40 text-redmargin text-sm font-bold hover:bg-redmargin/[0.06]"><X class="w-4 h-4" /> {{ t('extract.agent.cancel') }}</button>
            </div>

            <div v-if="agentProgress.length" class="space-y-2 overflow-hidden">
              <div class="grid grid-cols-6 sm:grid-cols-8 lg:grid-cols-12 gap-1.5">
                <div v-for="p in agentProgress" :key="p.index" :title="t('extract.agent.pagePrefix') + (p.index+1) + (p.note ? ' — ' + p.note : '')" class="h-7 rounded-md grid place-items-center font-mono text-[10px]" :class="[p.status==='done' ? 'bg-correct/15 text-green-700' : p.status==='running' ? 'bg-pen text-white animate-pulse' : p.status==='failed' ? 'bg-redmargin text-white' : 'bg-ink/[0.06] text-ink/40']">{{ p.index+1 }}</div>
              </div>
              <div class="font-mono text-[11px] text-ink/50">{{ agentProgress.filter(x => x.status==='done').length }}/{{ agentProgress.length }} {{ t('extract.agent.pagesDone') }}{{ ocrUsed ? ' · ' + t('extract.agent.ocrUsedNote') : '' }}</div>
            </div>
            <div v-if="agentError" class="p-4 bg-redmargin/[0.07] border border-redmargin/30 rounded-2xl text-sm text-redmargin font-medium whitespace-pre-wrap">{{ agentError }}</div>
            <div v-if="agentError" class="mt-3 p-4 rounded-2xl bg-paper border border-ink/10 text-sm">
              <div class="font-display font-bold text-sm text-ink">Stuck? Don't wait —</div>
              <ul class="mt-1.5 list-disc list-inside text-ink/60 space-y-1 leading-relaxed">
                <li><b>401</b> Missing key → on <code>localhost:5173</code> add <code>.env.local</code> with <code>MISTRAL_API_KEY=...</code> or add a local BYOK provider in Settings.</li>
                <li><b>502</b> Bad Gateway → provider down or endpoint not in <code>providers.yaml</code>. Tap <b>change</b> to switch model, or use <b>GEM flow</b> (free, no key, 100+ pages, no 20MB limit).</li>
                <li>Progress shows <code>failed</code> → you still get partial paper if some pages succeeded. Hit <b>Cancel</b> then <b>Resume</b> — checkpoints save per batch.</li>
              </ul>
              <div class="mt-3 flex flex-wrap gap-2">
                <button @click="activeTab='gem'" class="px-4 py-2 rounded-xl bg-pen text-white text-xs font-bold hover:-translate-y-0.5 transition-transform">Try GEM flow →</button>
                <button @click="showSettings=true" class="px-4 py-2 rounded-xl border-2 border-ink/12 bg-white text-xs font-bold text-ink/70 hover:border-ink/30">Switch provider</button>
              </div>
              <div class="mt-2 font-mono text-[10px] text-ink/35">Tip: poolside 1M/32k now batches 12 pages/req (was 5) → 46p in 4 req vs 16. labs 256k batches 8. Less waiting, uses your maxTokens.</div>
            </div>
          </div>
          </div>
        </div>

        <!-- Storage health banner — shows at 15+ papers or 65%+ quota -->
        <div v-if="showStorageWarning || (storageEstimate && storageEstimate.pct >= 65)" :class="['rounded-2xl border-2 p-4 flex flex-col sm:flex-row gap-3 items-start sm:items-center', storageWarningLevel==='critical' ? 'bg-redmargin/[0.06] border-redmargin/30' : 'bg-hlyellow/25 border-hlyellow']">
          <div class="shrink-0 w-10 h-10 rounded-xl grid place-items-center text-lg" :class="storageWarningLevel==='critical' ? 'bg-redmargin text-white' : 'bg-hlyellow text-ink'">⚠</div>
          <div class="flex-1 min-w-0">
            <div class="font-display font-bold text-sm" :class="storageWarningLevel==='critical' ? 'text-redmargin' : 'text-ink'">{{ totalStored >= STORAGE_LIMIT ? `Storage almost full — ${totalStored}/${STORAGE_LIMIT}+ papers` : `Storage getting full — ${storageEstimate?.pct ?? 0}% used` }}</div>
            <div class="text-xs text-ink/60 mt-0.5 leading-snug">Browser IndexedDB is limited (Safari ~50MB). Export old papers as JSON before deleting — otherwise they'll be lost on "Clear site data". You have <b>{{ totalStored }} papers</b> saved{{ storageEstimate ? ` · ${ (storageEstimate.usage/1024/1024).toFixed(1)} / ${(storageEstimate.quota/1024/1024).toFixed(0)} MB (${storageEstimate.pct}%)` : '' }}.</div>
          </div>
          <div class="flex flex-wrap gap-2 shrink-0">
            <button @click="exportAllJSON" class="min-h-[40px] px-4 py-2 rounded-xl bg-ink text-white text-xs font-bold hover:bg-ink/90 transition-colors">⤓ Export all JSON</button>
            <button @click="scrollToPastManager" class="min-h-[40px] px-4 py-2 rounded-xl border-2 border-ink/15 bg-white text-xs font-bold text-ink/70 hover:border-ink/30">Manage →</button>
          </div>
        </div>

        <!-- Past sessions manager -->
        <div id="past-manager" v-if="pastSessions.length || draftSession" class="mt-6 rounded-2xl bg-white p-4 lg:p-5 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.22)] ring-1 ring-ink/[0.06] overflow-hidden">
          <div class="flex flex-wrap items-center justify-between gap-2 mb-3">
            <div class="font-display font-bold tracking-tight text-sm break-words">{{ t('extract.past.title') }}</div>
            <div class="flex items-center gap-2">
              <span class="font-mono text-[10px] text-ink/40 break-words">{{ filteredSessions.length }}/{{ pastSessions.length }} {{ t('extract.past.attempts') }}</span>
              <button v-if="pastSessions.length > 1" @click="exportAllJSON" class="hidden sm:inline-flex min-h-[28px] px-2.5 py-1 rounded-lg bg-paper border border-ink/12 text-[10px] font-bold text-ink/60 hover:border-pen hover:text-pen transition-colors">⤓ Export all</button>
            </div>
          </div>

          <!-- search + quota hint -->
          <div v-if="pastSessions.length > 5" class="flex flex-col sm:flex-row gap-2 mb-3">
            <div class="flex-1 relative">
              <input v-model="searchQuery" placeholder="Search papers…" class="w-full border border-ink/12 rounded-xl pl-9 pr-3 py-2 text-sm bg-paper focus:outline-none focus:ring-2 focus:ring-pen/40 placeholder:text-ink/35" />
              <span class="absolute left-3 top-1/2 -translate-y-1/2 text-ink/35 text-sm">⌕</span>
            </div>
            <span v-if="storageEstimate" class="hidden lg:inline-flex items-center font-mono text-[10px] text-ink/40 px-2.5 py-2 rounded-xl bg-paper border border-ink/10">{{ storageEstimate.pct }}% storage · {{ totalStored }} papers</span>
          </div>

          <div v-if="paginatedSessions.length" class="space-y-1.5">
            <div v-for="row in paginatedSessions" :key="row.id" class="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2.5 rounded-xl border border-ink/10 hover:border-ink/25 transition-colors min-w-0">
              <span :class="['font-mono text-xs font-bold px-2 py-0.5 rounded-full shrink-0', row.pct >= 60 ? 'bg-correct/[0.12] text-green-700' : row.pct >= 35 ? 'bg-hlyellow/60 text-ink' : 'bg-redmargin/[0.1] text-redmargin']">{{ row.pct }}%</span>
              <span class="text-sm font-semibold text-ink truncate min-w-0 flex-1 break-words">{{ row.title }}</span>
              <span class="font-mono text-[10px] text-ink/45 shrink-0">{{ row.score }}</span>
              <span class="font-mono text-[10px] text-ink/35 hidden sm:inline break-words">{{ row.when }}</span>
              <span class="flex flex-wrap gap-1.5 ml-auto">
                <button @click="exportPaperJSON(row)" :disabled="exportBusyId===row.id" class="min-h-[40px] px-3 py-1.5 rounded-lg bg-paper border border-ink/12 text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40">{{ exportBusyId===row.id ? '…' : '⤓ JSON' }}</button>
                <button @click="openReport(row)" :title="t('extract.past.viewReportT')" class="min-h-[40px] px-3 py-1.5 rounded-lg bg-paper border border-ink/12 text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors">{{ t('extract.past.report') }}</button>
                <button @click="retake(row)" :title="t('extract.past.retake')" class="min-h-[40px] px-3 py-1.5 rounded-lg bg-paper border border-ink/12 text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors">{{ t('extract.past.retake') }}</button>
                <button @click="deleteSession(row)" :title="t('extract.past.deleteT')" class="min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-lg border border-redmargin/30 text-[11px] font-bold text-redmargin hover:bg-redmargin/[0.06] transition-colors">✕</button>
              </span>
            </div>
          </div>
          <div v-else-if="pastSessions.length && !filteredSessions.length" class="text-xs text-ink/45 py-6 text-center">No papers match "{{ searchQuery }}" — clear search to see all {{ pastSessions.length }}.</div>

          <!-- pagination -->
          <div v-if="totalFilteredPages > 1" class="mt-3 flex items-center justify-between gap-2 pt-3 border-t border-ink/[0.06]">
            <button :disabled="sessionPage<=1" @click="sessionPage--" class="min-h-[36px] px-3 py-1.5 rounded-lg border border-ink/12 text-xs font-bold text-ink/60 hover:text-ink disabled:opacity-30 disabled:pointer-events-none">← Prev</button>
            <span class="font-mono text-[11px] text-ink/45">{{ sessionPage }} / {{ totalFilteredPages }} · {{ filteredSessions.length }} papers</span>
            <button :disabled="sessionPage>=totalFilteredPages" @click="sessionPage++" class="min-h-[36px] px-3 py-1.5 rounded-lg border border-ink/12 text-xs font-bold text-ink/60 hover:text-ink disabled:opacity-30 disabled:pointer-events-none">Next →</button>
          </div>

          <div v-if="draftSession" class="mt-2.5 pt-2.5 border-t border-dashed border-ink/15 flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 min-w-0">
            <span class="font-mono text-[10px] font-bold uppercase tracking-wider bg-hlblue px-2 py-0.5 rounded-full shrink-0">{{ t('extract.past.draftBadge') }}</span>
            <span class="text-sm font-semibold text-ink truncate flex-1 min-w-0 break-words">{{ draftSession.title }}</span>
            <span class="font-mono text-[10px] text-ink/45 break-words">{{ draftSession.qs }} {{ t('extract.past.questionsWord') }} · {{ draftSession.when }}</span>
            <span class="flex flex-wrap gap-1.5 ml-auto">
              <button @click="exportDraftJSON" class="min-h-[40px] px-3 py-1.5 rounded-lg bg-paper border border-ink/12 text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors">⤓ JSON</button>
              <button @click="openDraft" class="min-h-[40px] px-3 py-1.5 rounded-lg bg-paper border border-ink/12 text-[11px] font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors">{{ t('extract.past.openReview') }}</button>
              <button @click="deleteDraft" :title="t('extract.past.deleteDraftT')" class="min-h-[40px] min-w-[40px] px-3 py-1.5 rounded-lg border border-redmargin/30 text-[11px] font-bold text-redmargin hover:bg-redmargin/[0.06] transition-colors">✕</button>
            </span>
          </div>
          <div v-if="!pastSessions.length && !draftSession" class="text-xs text-ink/45 py-2">{{ t('extract.past.empty') }}</div>
        </div>
      </div>
    </div>
  </div>

  <!-- 🎉 Extraction complete popup -->
  <Teleport to="body">
    <!-- Parse → Review loader -->
    <Transition enter-active-class="transition duration-200" enter-from-class="opacity-0" leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div v-if="parsing" class="fixed inset-0 z-[230] bg-white/85 backdrop-blur-sm grid place-items-center">
        <div class="flex flex-col items-center gap-4">
          <span class="relative w-14 h-14">
            <span class="absolute inset-0 rounded-full border-[3px] border-pen/15"></span>
            <span class="absolute inset-0 rounded-full border-[3px] border-transparent border-t-pen animate-spin"></span>
          </span>
          <div class="text-sm font-bold font-display text-ink/70">{{ t('extract.loader.title') }}</div>
          <div class="font-hand text-lg text-ink/45 -rotate-1">{{ t('extract.loader.sub') }}</div>
        </div>
      </div>
    </Transition>
    <Transition enter-active-class="transition duration-300" enter-from-class="opacity-0" leave-active-class="transition duration-200" leave-to-class="opacity-0">
      <div v-if="resultInfo" class="fixed inset-0 z-[220] bg-ink/60 backdrop-blur-sm grid place-items-center p-4">
        <div class="w-full max-w-md rounded-2xl bg-white shadow-2xl ring-1 ring-ink/10 p-8 text-center space-y-4 relative overflow-hidden">
          <span class="absolute -top-6 -right-4 w-28 h-28 rounded-full bg-hlyellow/40 blur-2xl" aria-hidden="true"></span>
          <div class="text-5xl">🎉</div>
          <div class="text-2xl font-extrabold font-display tracking-tight">{{ t('extract.done.title') }}</div>
          <div class="grid grid-cols-3 gap-2 text-center">
            <div class="rounded-xl bg-paper border border-ink/10 py-3">
              <div class="text-xl font-extrabold font-display">{{ resultInfo.questions }}</div>
              <div class="font-mono text-[9px] uppercase tracking-wider text-ink/50">{{ t('extract.done.questions') }}</div>
            </div>
            <div class="rounded-xl bg-paper border border-ink/10 py-3">
              <div class="text-xl font-extrabold font-display">{{ resultInfo.pages }}</div>
              <div class="font-mono text-[9px] uppercase tracking-wider text-ink/50">{{ t('extract.done.pages') }}</div>
            </div>
            <div class="rounded-xl bg-paper border border-ink/10 py-3 px-1">
              <div class="text-[11px] font-bold truncate" :title="resultInfo.provider + ' · ' + resultInfo.model">{{ resultInfo.provider }}</div>
              <div class="font-mono text-[8px] uppercase tracking-wider text-ink/45">{{ resultInfo.ocr ? t('extract.done.viaOcr') : t('extract.done.direct') }}</div>
            </div>
          </div>
          <p class="text-sm text-ink/55">{{ t('extract.done.note') }}</p>
          <div class="flex gap-2 justify-center pt-1">
            <button @click="goReview" class="px-7 py-3 rounded-xl bg-pen text-white text-sm font-bold hover:-translate-y-0.5 transition-transform shadow-[0_12px_30px_-12px_rgba(47,95,224,0.7)]">{{ t('extract.done.reviewBtn') }}</button>
            <button @click="dismissResult" class="px-5 py-3 rounded-xl border-2 border-ink/12 text-sm font-semibold text-ink/65 hover:border-ink/30 hover:text-ink transition-colors">{{ t('extract.done.stay') }}</button>
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
  max-width: 92%;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
@media (max-width: 390px) {
  .tape { width: 190px; height: 50px; top: -20px; }
}
.json-textarea.json-valid-glow {
  box-shadow: 0 0 0 2px rgba(31, 164, 92, 0.3), 0 0 20px rgba(31, 164, 92, 0.1);
  border-color: rgba(31, 164, 92, 0.4);
  transition: box-shadow 0.3s, border-color 0.3s;
}
.spotlight-card {
  transition: transform 0.2s ease;
  transform-style: preserve-3d;
}
</style>
