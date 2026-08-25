<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
import { t } from '@/lib/i18n'
useHead(() => ({ title: t("about.docTitle") + " — Rankify PDF2CBT" }))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-28 pb-16">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5">
      <a href="/" class="text-sm font-medium text-ink/50 hover:text-ink transition-colors">{{ t('common.backHome') }}</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4">{{ t('about.eyebrow') }}</div>
      <h1 class="text-4xl md:text-6xl font-display font-extrabold tracking-tight">{{ t('about.h1a') }}<span class="relative inline-block">{{ t('about.h1b') }}<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlyellow"></span></span>{{ t('about.h1c') }}</h1>
      <p class="mt-4 text-[16px] text-ink/60 leading-relaxed max-w-xl">{{ t('about.sub') }}</p>

      <div class="mt-10 grid gap-6">
        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">{{ t('about.q1.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">{{ t('about.q1.a') }}<a href="https://ishortn.ink/gemini-gem" class="text-pen underline decoration-wavy underline-offset-2">GEM JSON paste</a>{{ t('about.q1.b') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">{{ t('about.q2.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed"><code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">UniversalPaper</code>{{ t('about.q2.a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">subject</code>{{ t('about.q2.b') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">{{ t('about.q3.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">{{ t('about.q3.a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px]">Extract → AI Agent</code>{{ t('about.q3.b') }}<a href="https://github.com/namandhakad712/Rankify-PDF2CBT" class="text-pen underline decoration-wavy underline-offset-2">GitHub</a>{{ t('about.q3.c') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06]" style="transform: rotate(0.5deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-xl tracking-tight">{{ t('about.q4.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed">{{ t('about.q4.a') }}<a href="https://polyformproject.org/licenses/noncommercial/1.0.0" class="text-pen underline decoration-wavy underline-offset-2">PolyForm Noncommercial 1.0.0</a>{{ t('about.q4.b') }}</p>
        </div>
      </div>

      <p class="mt-10 font-hand text-2xl text-ink/50 -rotate-1">{{ t('about.signoff') }}</p>
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
