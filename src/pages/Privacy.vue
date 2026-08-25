<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
import { t } from '@/lib/i18n'
useHead(() => ({ title: t("privacy.docTitle") + " — Rankify PDF2CBT" }))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-24 lg:pt-28 pb-16 overflow-x-hidden">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5 min-w-0">
      <a href="/" class="inline-flex min-h-[40px] items-center text-sm font-medium text-ink/50 hover:text-ink transition-colors">{{ t('common.backHome') }}</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4 break-words">{{ t('privacy.eyebrow') }}</div>
      <h1 class="text-3xl lg:text-4xl md:text-6xl font-display font-extrabold tracking-tight break-words">{{ t('privacy.h1a') }}<span class="relative inline-block">{{ t('privacy.h1b') }}<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlgreen"></span></span></h1>
      <p class="mt-4 text-[15px] lg:text-[16px] text-ink/60 break-words">{{ t('privacy.sub.a') }}<b class="text-ink">{{ t('privacy.sub.b') }}</b>{{ t('privacy.sub.c') }}</p>
      <p class="font-hand text-xl lg:text-2xl text-correct mt-2 rotate-1 break-words">{{ t('privacy.tagline') }}</p>

      <div class="mt-8 lg:mt-10 grid gap-6">
        <section class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s1.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words">{{ t('privacy.s1.body') }}</p>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s2.title') }}</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words"><b>{{ t('privacy.s2.l1.bold') }}</b>{{ t('privacy.s2.l1a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">RankifyPDF2CBT</code>{{ t('privacy.s2.l1b') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">localStorage rpdf2cbt-*</code>{{ t('privacy.s2.l1c') }}</li>
            <li class="break-words"><b>{{ t('privacy.s2.l2.bold') }}</b>{{ t('privacy.s2.l2a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">MISTRAL_API_KEY</code>{{ t('privacy.s2.l2b') }}</li>
            <li class="break-words"><b>{{ t('privacy.s2.l3.bold') }}</b>{{ t('privacy.s2.l3a') }}</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s3.title') }}</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words"><b>Gemini GEM</b>{{ t('privacy.s3.l1b') }}</li>
            <li class="break-words"><b>{{ t('privacy.s3.l2.bold') }}</b>{{ t('privacy.s3.l2.mid') }}<a href="https://mistral.ai/terms" class="text-pen underline break-all">Mistral</a>, <a href="https://groq.com/privacy" class="text-pen underline break-all">Groq</a>, <a href="https://www.nvidia.com/en-us/about-nvidia/privacy-policy" class="text-pen underline break-all">NVIDIA</a>{{ t('privacy.s3.l2.tail') }}</li>
            <li class="break-words"><b>Vercel</b>{{ t('privacy.s3.l3a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">vercel.json</code>{{ t('privacy.s3.l3b') }}</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s4.title') }}</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('privacy.s4.l1') }}</li>
            <li class="break-words">{{ t('privacy.s4.l2a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">localStorage rpdf2cbt-review/current</code>{{ t('privacy.s4.l2b') }}</li>
            <li class="break-words">{{ t('privacy.s4.l3') }}</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s5.title') }}</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words"><code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">X-Frame-Options: DENY</code>{{ t('privacy.s5.l1a') }}</li>
            <li class="break-words">{{ t('privacy.s5.l2a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">api/*</code>{{ t('privacy.s5.l2b') }}</li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('privacy.s6.title') }}</h2>
          <p class="mt-2 text-[15px] text-ink/65 leading-relaxed break-words">{{ t('privacy.s6.a') }}<a href="https://github.com/namandhakad712/Rankify-PDF2CBT/issues" class="text-pen underline decoration-wavy underline-offset-2 break-all">Rankify-PDF2CBT/issues</a>{{ t('privacy.s6.b') }}</p>
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
  max-width: 92%;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
@media (max-width: 390px) {
  .tape { width: 190px; height: 50px; top: -20px; }
}
</style>
