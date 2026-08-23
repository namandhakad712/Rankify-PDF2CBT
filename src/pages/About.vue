<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
useHead({ title: "About — Rankify PDF2CBT Light" })
</script>

<template>
  <div class="min-h-screen bg-background text-foreground font-sans pt-24 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-4 py-10">
      <a href="/" class="text-sm underline">← Home</a>
      <h1 class="text-3xl font-black tracking-tight mt-4">About — Universal Light Wrapper</h1>
      <p class="text-sm text-zinc-500 mt-2">Rebuilt from Rankify-V1 private (pdf2cbt + GEM jugaad). V1 was heavy (273 SFC, 3 DBs, 4 AI clients). Light keeps only what works.</p>

      <div class="mt-6 grid gap-4">
        <div class="border rounded-xl p-4">
          <h2 class="font-bold">Why Light?</h2>
          <p class="text-sm text-zinc-600 mt-1">V1 won hackathons on idea + homepage, but manual crop + multi-provider stack made it heavy & unreliable. By the end, only <a href="https://ishortn.ink/gemini-gem" class="underline text-violet-600">GEM JSON paste</a> was reliable. Light keeps that + manual per-Q crop (the only 100% accurate part) + single CBT shell.</p>
        </div>
        <div class="border rounded-xl p-4">
          <h2 class="font-bold">Universal, not JEE-locked</h2>
          <p class="text-sm text-zinc-600 mt-1"><code>UniversalPaper</code> <code>src/types/index.ts</code> has <code>subject:string|null</code> free — not <code>physics|chemistry</code> enum. No <code>vocabulary.ts</code> 120 topics lock. Any exam: SSC, UPSC, GATE, School, custom. Validate warns, not blocks.</p>
        </div>
        <div class="border rounded-xl p-4">
          <h2 class="font-bold">Stack</h2>
          <p class="text-sm text-zinc-600 mt-1">Vite 8 Rolldown 110KB initial, Vue 3.5, Tailwind 4, Dexie single DB, pdfjs-dist 5 (no mupdf), reka-ui + lucide. No Nuxt layers, no Lenis, no gsap suite, no echarts. <a href="https://github.com/TheMoonVyy/pdf2cbt" class="underline">pdf2cbt</a> base + GEM jugaad.</p>
        </div>
        <div class="border rounded-xl p-4">
          <h2 class="font-bold">Providers Modular</h2>
          <p class="text-sm text-zinc-600 mt-1">Fallback only for &lt;10 Q PDFs. <code>src/lib/providers/</code> — one file = one provider (Mistral/Groq/NVIDIA). Add <code>cerebras.ts</code> + <code>api/cerebras/chat.ts</code> + 1 line in <code>index.ts</code>. Docs in <code>providers/README.md</code>.</p>
        </div>
        <div class="border rounded-xl p-4">
          <h2 class="font-bold">Private V1</h2>
          <p class="text-sm text-zinc-600 mt-1"><code>C:\Projects\Rankify-V1</code> stays private (AGPL). This repo MIT — open source, no submodule, no copy of V1 LICENSE.</p>
        </div>
      </div>

      <div class="mt-8 text-xs text-zinc-400">Built for every exam — by a student, for students. Inspired by Rankify V1 Beautiful README, rebuilt light & universal.</div>
    </div>
  </div>
</template>
