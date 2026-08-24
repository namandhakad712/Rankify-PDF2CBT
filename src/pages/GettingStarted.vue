<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "Getting Started — Rankify PDF2CBT" })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5">
      <a href="/" class="text-sm font-medium text-ink/50 hover:text-ink transition-colors">← home</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4">the guide</div>
      <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">Getting <span class="relative inline-block">started<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlblue"></span></span></h1>
      <p class="mt-4 text-[16px] text-ink/60 leading-relaxed max-w-xl">Primary flow = GEM paste, no API key, 2 minutes. Fallback AI is optional, for small PDFs only.</p>
      <p class="font-hand text-2xl text-pen mt-2 rotate-1">chai lo, 4 steps baaki hain</p>

      <div class="mt-10 grid gap-6">
        <section class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin">1</span>
            <h2 class="font-display font-bold text-xl tracking-tight">Get JSON from GEM</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li>Open <a href="https://ishortn.ink/gemini-gem" target="_blank" class="text-pen underline decoration-wavy underline-offset-2">ishortn.ink/gemini-gem</a> — preset instructions ready.</li>
            <li>Upload your PDF there (GEM handles big files — no 20MB worry).</li>
            <li>Wait for the JSON, copy it. Format: <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">UniversalPaper</code> or plain <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">{questions:[]}</code>.</li>
            <li>Markdown fences? Our <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">stripFences()</code> handles those.</li>
          </ol>
        </section>

        <section class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin">2</span>
            <h2 class="font-display font-bold text-xl tracking-tight">Paste in /extract + upload PDF</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li><a href="/extract" class="text-pen underline decoration-wavy underline-offset-2">/extract</a> → drop your PDF (&lt;20MB — cached locally for diagram crops).</li>
            <li>Paste the JSON → <b>Parse &amp; go to Review</b>. Errors block, warnings show yellow.</li>
            <li>Got the JSON at a URL? Paste the link → Fetch URL.</li>
          </ol>
        </section>

        <section class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin">3</span>
            <h2 class="font-display font-bold text-xl tracking-tight">Review &amp; crop diagrams</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li>Edit text / options / answer / marks inline — everything is editable.</li>
            <li><b>Crop diagram</b> → the PDF opens → drag a rectangle → crop. Saved to that question.</li>
            <li>Happy? <b>Save &amp; start test</b>.</li>
          </ol>
          <p class="font-hand text-xl text-ink/50 mt-3 -rotate-1">AI galat figure bheje toh yahi par theek karo</p>
        </section>

        <section class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin">4</span>
            <h2 class="font-display font-bold text-xl tracking-tight">Take the test &amp; see results</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li>Real CBT shell: palette (5 states), countdown timer, mark-for-review.</li>
            <li>Submit → report card: score, per-subject bars, question-by-question verdicts.</li>
          </ol>
        </section>

        <section class="rounded-lg bg-hlblue/30 border-2 border-hlblue p-7">
          <h2 class="font-display font-bold text-xl tracking-tight">Optional: Fallback AI</h2>
          <ol class="mt-3 list-decimal list-inside text-[15px] text-ink/70 space-y-1.5 leading-relaxed">
            <li>In <b>/extract</b> toggle "Fallback AI" → pick Mistral / Groq / NVIDIA + model + your key.</li>
            <li><code class="bg-white/70 px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">viaProxy</code> keeps the key server-side on Vercel. Uncheck for direct API calls in local dev.</li>
            <li>Add your own provider = one file + one line. Docs in <code class="bg-white/70 px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">providers/README.md</code>.</li>
          </ol>
          <p class="text-xs text-ink/55 mt-3">Docs: <a href="https://docs.mistral.ai/api/endpoint/chat" class="underline">Mistral</a> · <a href="https://console.groq.com/docs/api-reference" class="underline">Groq</a> · <a href="https://docs.api.nvidia.com/nim/reference/create_chat_completion_v1_chat_completions_post-1" class="underline">NVIDIA NIM</a></p>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">Keys &amp; privacy</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li>Primary GEM: <b>no key</b> — the only thing leaving your device is the PDF you upload to Gemini chat yourself.</li>
            <li>Fallback keys are never stored (memory only), or live in Vercel env vars server-side.</li>
            <li>Everything else stays in your browser. <a href="/privacy" class="text-pen underline decoration-wavy underline-offset-2">Full privacy policy →</a></li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">Fatafat fixes <span class="font-hand text-xl text-ink/45 font-normal">(troubleshooting)</span></h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li><b>Invalid JSON</b> → make sure you copied the whole output; fences are stripped automatically.</li>
            <li><b>PDF &gt;20MB</b> → use the GEM flow (it handles large files); fallback caps at 15k chars.</li>
            <li><b>Crop not working</b> → upload the PDF in Extract first, then Review finds it.</li>
            <li><b>MSQ scoring wrong</b> → answers must be 0-indexed &amp; sorted, e.g. <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">["0","2"]</code> with <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">answer:""</code>.</li>
            <li><b>401 missing key</b> → paste key in the fallback input, or set Vercel env + viaProxy.</li>
          </ul>
        </section>
      </div>
    </div>
  </div>
</template>

<style scoped>
.tape {
  position: absolute;
  top: -26px;
  left: 50%;
  width: 260px;
  height: 66px;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.png') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
</style>
