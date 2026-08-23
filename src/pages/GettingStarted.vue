<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "Getting Started — Rankify PDF2CBT" })
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans pt-24 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-4 py-10">
      <a href="/" class="text-sm underline">← Home</a>
      <h1 class="text-3xl font-black tracking-tight mt-4">Getting Started</h1>
      <p class="text-sm text-zinc-500 mt-2">GEM paste primary — no key. Fallback AI only for small PDFs.</p>

      <div class="mt-6 space-y-6">
        <section class="border rounded-xl p-4">
          <h2 class="font-bold">1. Get JSON from GEM (2 min)</h2>
          <ol class="mt-2 list-decimal list-inside text-sm text-zinc-700 space-y-1">
            <li>Open <a href="https://ishortn.ink/gemini-gem" target="_blank" class="underline text-violet-600">ishortn.ink/gemini-gem</a> — preset instructions.</li>
            <li>Upload PDF there (GEM handles chunking, no 20MB worry).</li>
            <li>Wait for JSON — copy. It is <code>UniversalPaper {meta, sections, questions}</code> or <code>{questions:[]}</code>.</li>
            <li>Optional: If JSON is <code>```json fences</code>, our <code>stripFences()</code> <code>src/lib/parse.ts:8</code> handles it.</li>
          </ol>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="font-bold">2. Paste in /extract + Upload PDF</h2>
          <ol class="mt-2 list-decimal list-inside text-sm text-zinc-700 space-y-1">
            <li>Go <a href="/extract" class="underline">/extract</a> → Step 2: drop PDF &lt;20MB (cached to Dexie <code>pdfs.__pdf</code> for crop).</li>
            <li>Step 3: paste JSON → <code>Parse & Go to Review</code>. We <code>normalizeText</code> per <code>AGENT.md:440</code>, <code>validatePaper()</code> — errors block, warnings yellow.</li>
            <li>Or paste JSON URL → <code>Fetch URL</code> (handles CORS via <code>fetch()</code>).</li>
          </ol>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="font-bold">3. Review & Crop Diagrams per Question</h2>
          <ol class="mt-2 list-decimal list-inside text-sm text-zinc-700 space-y-1">
            <li>Edit <code>text / options / answer / marks</code> inline. <code>hasDiagram</code> checkbox.</li>
            <li>Click <code>Crop Diagram</code> → pdfjs canvas (1.5x) → drag rect → <code>Crop</code> → saves <code>dataURL</code> to <code>diagrams[]</code>.</li>
            <li>Page nav Prev/Next, delete × on image. <code>Save & Start Test</code> → writes <code>localStorage rpdf2cbt-current</code> + Dexie <code>papers:current</code>.</li>
          </ol>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="font-bold">4. Take CBT & Results</h2>
          <ol class="mt-2 list-decimal list-inside text-sm text-zinc-700 space-y-1">
            <li><code>/test</code> single shell: palette 5 states (<code>notVisited/notAnswered/answered/marked/markedAnswered</code>), timer <code>durationMinutes*60</code>, autosave, <code>MSQ</code> uses checkbox <code>answers[] 0-index</code>.</li>
            <li>Diagrams show as <code>&lt;img&gt;</code>, not span. Submit → <code>localStorage rpdf2cbt-last-result</code> + Dexie <code>results</code>.</li>
            <li><code>/results</code> simple bars (no echarts) + per-Q <code>You vs Ans</code> (MSQ join). Export JSON via browser devtools or future button.</li>
          </ol>
        </section>

        <section class="border rounded-xl p-4 bg-violet-50 border-violet-200">
          <h2 class="font-bold text-violet-900">Fallback AI (for &lt;10 Q PDFs, optional)</h2>
          <ol class="mt-2 list-decimal list-inside text-sm text-violet-900/80 space-y-1">
            <li>In <code>/extract</code> toggle “Fallback” → pick Provider <code>Mistral/Groq/NVIDIA</code> (from <code>src/lib/providers/index.ts</code>) + model + BYOK key.</li>
            <li><code>viaProxy:true</code> → <code>POST /api/&lt;id&gt;/chat</code> hides key (Vercel env <code>MISTRAL_API_KEY</code>). Uncheck for direct <code>https://api.../v1/chat/completions</code> (local dev).</li>
            <li>We <code>extractPdfText()</code> first 4 pages 15k → provider <code>response_format: json_object</code> → <code>parsePastedJSON()</code>. Add provider: see <code>providers/README.md</code>.</li>
          </ol>
          <p class="text-xs text-violet-700 mt-2">Docs: Mistral <a href="https://docs.mistral.ai/api/endpoint/chat" class="underline">chat</a> · Groq <a href="https://console.groq.com/docs/api-reference" class="underline">api</a> · NVIDIA <a href="https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1" class="underline">NIM</a></p>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="font-bold">Keys & Privacy</h2>
          <ul class="mt-2 list-disc list-inside text-sm text-zinc-700 space-y-1">
            <li>Primary GEM: <strong>no key</strong> — nothing leaves device except PDF you upload to Gemini chat.</li>
            <li>Fallback: BYOK in input (not stored) OR Vercel env <code>MISTRAL_API_KEY</code> etc (server-only, no <code>VITE_</code> prefix). See <code>.env.example</code>.</li>
            <li>All PDF + JSON local: Dexie single DB <code>RankifyPDF2CBT</code> + <code>localStorage rpdf2cbt-*</code>. No tracking. <a href="/privacy" class="underline">Privacy →</a></li>
          </ul>
        </section>

        <section class="border rounded-xl p-4">
          <h2 class="font-bold">Troubleshooting</h2>
          <ul class="mt-2 list-disc list-inside text-sm text-zinc-700 space-y-1">
            <li><code>Invalid JSON</code> → strip fences, ensure JSON starts <code>{</code> or <code>[</code>. Check gemini output copied fully.</li>
            <li><code>PDF &gt;20MB</code> → compress or use GEM (handles large). Fallback caps 15k text.</li>
            <li><code>No crop</code> → upload PDF in Extract first, then Review loads <code>pdfs.__pdf</code>. Worker 1.2MB lazy.</li>
            <li><code>MSQ wrong</code> → ensure <code>answers: ["0","2"]</code> 0-index sorted, <code>answer:""</code>.</li>
            <li><code>401 Missing API key</code> → add key in fallback input or set Vercel env + use viaProxy.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>
