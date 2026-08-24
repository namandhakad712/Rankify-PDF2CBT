<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "Privacy — Rankify PDF2CBT" })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5">
      <a href="/" class="text-sm font-medium text-ink/50 hover:text-ink transition-colors">← home</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4">the boring-but-important page</div>
      <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">Privacy <span class="relative inline-block">policy<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlgreen"></span></span></h1>
      <p class="mt-4 text-[16px] text-ink/60">Short version: <b class="text-ink">we keep nothing.</b> Long version below.</p>
      <p class="font-hand text-2xl text-correct mt-2 rotate-1">your laptop, your papers, your business.</p>

      <div class="mt-10 grid gap-6">
        <section class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">Basically,</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">We don't collect your PDFs, questions, or results. Everything lives in your browser (IndexedDB + localStorage). The GEM flow is Google's Gemini — you upload your PDF there yourself, under Google's terms.</p>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">1 · What we collect — nothing on our servers</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li><b>PDFs &amp; JSON:</b> stored in your browser — Dexie <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">RankifyPDF2CBT</code> + <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">localStorage rpdf2cbt-*</code>. Never sent to us. The optional fallback proxies forward only the text you approve to the provider you picked.</li>
            <li><b>Keys:</b> BYOK keys typed in the fallback panel are memory-only. Server env keys (<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">MISTRAL_API_KEY</code> etc.) never reach the client.</li>
            <li><b>Analytics:</b> none. No tracking, no telemetry, no cookies-for-convenience.</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">2 · Third parties</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li><b>Gemini GEM</b> → Google Generative AI, under Google's privacy terms.</li>
            <li><b>Fallback providers</b> → <a href="https://mistral.ai/terms" class="text-pen underline">Mistral</a>, <a href="https://groq.com/privacy" class="text-pen underline">Groq</a>, <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-policy" class="text-pen underline">NVIDIA</a> — only the extracted text you choose to send.</li>
            <li><b>Vercel</b> hosts the site — security headers in <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">vercel.json</code>.</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">3 · Data you control</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li>Clear browser site data → everything is gone. That's the whole delete flow.</li>
            <li>Export: copy the JSON from <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">localStorage rpdf2cbt-review/current</code>.</li>
            <li>No account, no email, no sync — fully offline after the GEM paste.</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">4 · Security</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed">
            <li><code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">X-Frame-Options: DENY</code>, HSTS, Permissions-Policy, immutable asset caching.</li>
            <li>CORS on <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">api/*</code> is open for local dev — tighten it to your domain in production.</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)]">
          <h2 class="font-display font-bold text-xl tracking-tight">5 · Contact</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">Open an issue at <a href="https://github.com/namandhakad712/Rankify-PDF2CBT/issues" class="text-pen underline decoration-wavy underline-offset-2">Rankify-PDF2CBT/issues</a>.</p>
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
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
</style>
