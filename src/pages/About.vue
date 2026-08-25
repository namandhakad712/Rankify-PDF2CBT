<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
import { t } from '@/lib/i18n'
useHead(() => ({ title: t("about.docTitle") + " — Rankify PDF2CBT" }))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-24 lg:pt-28 pb-16 overflow-x-hidden">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5 min-w-0">
      <a href="/" class="inline-flex min-h-[40px] items-center text-sm font-medium text-ink/50 hover:text-ink transition-colors">{{ t('common.backHome') }}</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4 break-words">{{ t('about.eyebrow') }}</div>
      <h1 class="text-3xl lg:text-4xl md:text-6xl font-display font-extrabold tracking-tight break-words">{{ t('about.h1a') }}<span class="relative inline-block">{{ t('about.h1b') }}<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlyellow"></span></span>{{ t('about.h1c') }}</h1>
      <p class="mt-4 text-[15px] lg:text-[16px] text-ink/60 leading-relaxed max-w-xl break-words">{{ t('about.sub') }}</p>

      <div class="mt-8 lg:mt-10 grid gap-6">
        <div class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(-0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('about.q1.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words">{{ t('about.q1.a') }}<a href="https://ishortn.ink/gemini-gem" class="text-pen underline decoration-wavy underline-offset-2 break-all">GEM JSON paste</a>{{ t('about.q1.b') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('about.q2.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words"><code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">UniversalPaper</code>{{ t('about.q2.a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">subject</code>{{ t('about.q2.b') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('about.q3.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words">{{ t('about.q3.a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">Extract → AI Agent</code>{{ t('about.q3.b') }}<a href="https://github.com/namandhakad712/Rankify-PDF2CBT" class="text-pen underline decoration-wavy underline-offset-2 break-all">GitHub</a>{{ t('about.q3.c') }}</p>
        </div>

        <div class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(0.5deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('about.q4.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words">{{ t('about.q4.a') }}<a href="https://polyformproject.org/licenses/noncommercial/1.0.0" class="text-pen underline decoration-wavy underline-offset-2 break-all">PolyForm Noncommercial 1.0.0</a>{{ t('about.q4.b') }}</p>
        </div>
      </div>

      <p class="mt-10 font-hand text-xl lg:text-2xl text-ink/50 -rotate-1 break-words">{{ t('about.signoff') }}</p>
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
  max-width: 92%;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
@media (max-width: 390px) {
  .tape { width: 190px; height: 50px; top: -20px; }
}
</style>
