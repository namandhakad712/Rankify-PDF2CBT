<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "About — Rankify PDF2CBT" })
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5">
      <a href="/" class="text-sm font-medium text-ink/50 hover:text-ink transition-colors">← home</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4">the story</div>
      <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">Why we <span class="relative inline-block">rebuilt<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlyellow"></span></span> everything</h1>
      <p class="mt-4 text-[16px] text-ink/60 leading-relaxed max-w-xl">Question papers deserve better than copy-paste. Rankify turns any PDF — a class test, a coaching sheet, last year's board paper — into a real mock exam you can actually attempt.</p>

      <div class="mt-10 grid gap-6">
        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">Why "light"?</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">The core flow is simple: <a href="https://ishortn.ink/gemini-gem" class="text-pen underline decoration-wavy underline-offset-2">GEM JSON paste</a> for extraction, hand-cropped diagrams for accuracy, and one clean exam shell to attempt. Everything stays in your browser.</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">Universal, not exam-locked</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed"><code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">UniversalPaper</code> keeps <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">subject</code> as a free string — no hardcoded topic enums. School unit test, board paper, SSC, GATE, your own quiz — all first-class citizens. Validation warns, it never blocks.</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">The stack (nerd corner)</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">Vite 8 (Rolldown) · Vue 3.5 · Tailwind 4 · Dexie (one DB) · pdfjs-dist 5 · GSAP + Lenis for the notebook feel. Fallback AI is a modular registry: <code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">src/lib/providers/</code> — one file = one provider. Open on <a href="https://github.com/namandhakad712/Rankify-PDF2CBT" class="text-pen underline decoration-wavy underline-offset-2">GitHub</a>.</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.5deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">Free for learning</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">This repo is <a href="https://polyformproject.org/licenses/noncommercial/1.0.0" class="text-pen underline decoration-wavy underline-offset-2">PolyForm Noncommercial 1.0.0</a> — free for personal, research &amp; education. Commercial use needs separate permission. No accounts, no paywalls.</p>
        </div>
      </div>

      <p class="mt-10 font-hand text-2xl text-ink/50 -rotate-1">built for every exam — by a student, for students.</p>
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
