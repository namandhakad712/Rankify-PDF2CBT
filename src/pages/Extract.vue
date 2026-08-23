<script setup lang="ts">
import { ref, computed } from "vue"
import { useRouter } from "vue-router"
import { parsePastedJSON, fetchAndParse } from "@/lib/parse"
import { getDB } from "@/lib/db"
import { providers, providerOptions } from "@/lib/providers"
import { extractPdfText } from "@/lib/pdf"

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
  <div class="min-h-screen bg-zinc-50">
    <div class="max-w-4xl mx-auto px-4 py-8">
      <button class="text-sm underline" @click="router.push('/')">← Home</button>
      <h1 class="text-2xl font-bold mt-2">Extract — Paste JSON from GEM</h1>
      <p class="text-sm text-zinc-500">Primary flow: GEM chat → copy JSON → paste here. Fallback AI only for small PDFs.</p>

      <div class="mt-6 grid gap-4">
        <!-- Step 1 GEM -->
        <div class="bg-white border rounded-2xl p-4">
          <div class="font-semibold">Step 1 — Get JSON from GEM</div>
          <p class="text-sm text-zinc-500">Open preset GEM, upload PDF there, copy the JSON output.</p>
          <a href="https://ishortn.ink/gemini-gem" target="_blank" class="inline-block mt-2 px-4 py-2 rounded-full bg-violet-600 text-white text-sm">Open GEM Chat →</a>
        </div>

        <!-- Step 2 PDF -->
        <div class="bg-white border rounded-2xl p-4">
          <div class="font-semibold">Step 2 — Upload PDF (for diagram cropping in Review)</div>
          <input type="file" accept="application/pdf" @change="onPdf" class="mt-2 block w-full text-sm border rounded p-2" />
          <div v-if="pdfFile" class="text-xs text-green-600 mt-1">✓ {{ pdfFile.name }} — {{ (pdfFile.size/1024/1024).toFixed(2) }} MB</div>
          <div v-else class="text-xs text-zinc-400 mt-1">PDF <20MB. Stored locally for per-question crop in Review.</div>
        </div>

        <!-- Step 3 Paste -->
        <div class="bg-white border rounded-2xl p-4">
          <div class="font-semibold">Step 3 — Paste JSON</div>
          <textarea v-model="pasteText" rows="10" placeholder='Paste full JSON here — e.g. {"meta":{"title":"Test",...},"sections":[],"questions":[...]} or {"questions":[...]}' class="mt-2 w-full border rounded p-3 font-mono text-xs"></textarea>
          <div class="mt-2 flex gap-2">
            <button :disabled="parsing" class="px-5 py-2 rounded-full bg-zinc-900 text-white text-sm disabled:opacity-50" @click="handlePasteParse">{{ parsing ? 'Parsing...' : 'Parse & Go to Review →' }}</button>
            <button class="px-4 py-2 rounded-full border text-sm" @click="pasteText=''">Clear</button>
          </div>
          <div class="mt-3 flex gap-2">
            <input v-model="pasteUrl" placeholder="Or paste JSON URL and fetch" class="flex-1 border rounded px-3 py-2 text-sm" />
            <button class="px-4 py-2 rounded border text-sm" @click="handleUrlFetch">Fetch URL</button>
          </div>
          <div v-if="error" class="mt-3 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700 whitespace-pre-wrap">{{ error }}</div>
          <div v-if="issuesText" class="mt-2 p-3 bg-amber-50 border border-amber-200 rounded text-xs whitespace-pre-wrap">{{ issuesText }}</div>
        </div>

        <!-- Fallback — Modular Providers -->
        <div class="bg-white border rounded-2xl p-4">
          <button class="text-sm font-medium underline" @click="showFallback=!showFallback">{{ showFallback ? 'Hide' : 'Show' }} Fallback AI — Modular (Mistral / Groq / NVIDIA) for &lt;10 Q PDFs</button>
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
