<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "Privacy — Rankify PDF2CBT Light" })
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans pt-24 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-4 py-10">
      <a href="/" class="text-sm underline">← Home</a>
      <h1 class="text-3xl font-black tracking-tight mt-4">Privacy Policy</h1>
      <p class="text-xs text-zinc-500 mt-1">Last updated: May 2025 · Light wrapper — local-only.</p>

      <div class="mt-6 space-y-6 text-sm leading-relaxed text-zinc-700">
        <section class="border rounded-xl p-4">
          <h2 class="font-bold">Basically,</h2>
          <p class="mt-1 text-zinc-600">We don't collect your PDFs, questions, or results. Everything stays in your browser (Dexie + localStorage). GEM chat is Google's Gemini — you upload PDF there under Google's terms.</p>
        </section>

        <section>
          <h2 class="font-bold">1. What We Collect — Nothing on Our Servers</h2>
          <ul class="mt-2 list-disc list-inside space-y-1 text-zinc-600">
            <li><strong>PDFs & JSON:</strong> Stored in your browser: Dexie <code>RankifyPDF2CBT</code> (<code>papers/pdfs/results</code>) + <code>localStorage rpdf2cbt-*</code>. Never sent to our server except fallback <code>/api/*/chat</code> proxies which forward text to provider (Mistral/Groq/NVIDIA) per 2026 docs.</li>
            <li><strong>Keys:</strong> Fallback BYOK keys you type are not stored (memory only) or use Vercel env <code>MISTRAL_API_KEY</code> server-side. No <code>VITE_</code> client leak.</li>
            <li><strong>Analytics:</strong> None by default in light wrapper. V1 had PostHog/GTA/Clarity — light has no tracking unless you add.</li>
          </ul>
        </section>

        <section>
          <h2 class="font-bold">2. Third Parties</h2>
          <ul class="mt-2 list-disc list-inside space-y-1 text-zinc-600">
            <li><strong>Gemini GEM</strong> <code>ishortn.ink/gemini-gem</code> → Google Generative AI — under Google's privacy.</li>
            <li><strong>Fallback providers</strong> → Mistral <a href="https://mistral.ai/terms" class="underline">mistral.ai/terms</a>, Groq <a href="https://groq.com/privacy" class="underline">groq.com/privacy</a>, NVIDIA <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-policy" class="underline">nvidia.com/privacy</a> — only the 15k text you approve.</li>
            <li><strong>Vercel</strong> hosting — <code>vercel.json</code> headers + functions 30s. See Vercel privacy.</li>
          </ul>
        </section>

        <section>
          <h2 class="font-bold">3. Data You Control</h2>
          <ul class="mt-2 list-disc list-inside space-y-1 text-zinc-600">
            <li>Clear <code>localStorage</code> + Dexie <code>RankifyPDF2CBT</code> in DevTools → Application → deletes all.</li>
            <li>Export: copy JSON from <code>localStorage rpdf2cbt-review/current</code> or future Export button.</li>
            <li>No account, no email, no sync — 100% offline after GEM paste.</li>
          </ul>
        </section>

        <section>
          <h2 class="font-bold">4. Security</h2>
          <ul class="mt-2 list-disc list-inside space-y-1 text-zinc-600">
            <li><code>vercel.json</code> sets <code>X-Frame-Options:DENY</code>, <code>HSTS</code>, <code>Permissions-Policy</code>, <code>Cache-Control immutable</code> for assets.</li>
            <li>CORS <code>*</code> on <code>api/*</code> for local dev; tighten to your domain in prod if needed.</li>
          </ul>
        </section>

        <section>
          <h2 class="font-bold">5. Contact</h2>
          <p class="mt-1 text-zinc-600">Open an issue at <a href="https://github.com/TheMoonVyy/pdf2cbt/issues" class="underline">pdf2cbt/issues</a>. V1 private stays <code>C:\Projects\Rankify-V1</code> — not tracked here.</p>
        </section>
      </div>
    </div>
  </div>
</template>
