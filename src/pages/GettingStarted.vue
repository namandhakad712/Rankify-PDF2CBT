<script setup lang="ts">
import AppNav from '@/components/AppNav.vue'
import { useHead } from "@vueuse/head"
import { t } from '@/lib/i18n'
useHead(() => ({ title: t("gs.docTitle") + " — Rankify PDF2CBT" }))
</script>

<template>
  <div class="min-h-screen bg-paper text-ink font-sans pt-24 lg:pt-28 pb-16 overflow-x-hidden">
    <AppNav />
    <div class="max-w-3xl mx-auto px-5 min-w-0">
      <a href="/" class="inline-flex min-h-[40px] items-center text-sm font-medium text-ink/50 hover:text-ink transition-colors">{{ t('common.backHome') }}</a>

      <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-2 mt-4 break-words">{{ t('gs.eyebrow') }}</div>
      <h1 class="text-3xl lg:text-4xl md:text-6xl font-display font-extrabold tracking-tight break-words">{{ t('gs.h1a') }}<span class="relative inline-block">{{ t('gs.h1b') }}<span class="absolute inset-x-[-4px] inset-y-[16%] -z-10 rounded-sm bg-hlblue"></span></span></h1>
      <p class="mt-4 text-[15px] lg:text-[16px] text-ink/60 leading-relaxed max-w-xl break-words">{{ t('gs.sub.a') }}<b>Gemini GEM flow</b>{{ t('gs.sub.b') }}<b>AI Agent</b>{{ t('gs.sub.c') }}</p>
      <p class="font-hand text-xl lg:text-2xl text-pen mt-2 rotate-1 break-words">{{ t('gs.chai') }}</p>

      <div class="mt-8 lg:mt-10 grid gap-6">
        <section class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(-0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3 min-w-0">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin shrink-0">1</span>
            <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words min-w-0">{{ t('gs.s1.title') }}</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('gs.s1.l1a') }}<a href="https://ishortn.ink/gemini-gem" target="_blank" class="text-pen underline decoration-wavy underline-offset-2 break-all">ishortn.ink/gemini-gem</a>{{ t('gs.s1.l1b') }}</li>
            <li class="break-words">{{ t('gs.s1.l2') }}</li>
            <li class="break-words">{{ t('gs.s1.l3a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">UniversalPaper</code>{{ t('gs.s1.l3b') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">{questions:[]}</code>.</li>
            <li class="break-words">{{ t('gs.s1.l4a') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">stripFences()</code>{{ t('gs.s1.l4b') }}</li>
          </ol>
        </section>

        <section class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3 min-w-0">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin shrink-0">2</span>
            <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words min-w-0">{{ t('gs.s2.title') }}</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words"><a href="/extract" class="text-pen underline decoration-wavy underline-offset-2 break-all">/extract</a>{{ t('gs.s2.l1') }}</li>
            <li class="break-words">{{ t('gs.s2.l2a') }}<b>Parse &amp; go to Review</b>{{ t('gs.s2.l2b') }}</li>
            <li class="break-words">{{ t('gs.s2.l3') }}</li>
          </ol>
        </section>

        <section class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(-0.3deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3 min-w-0">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin shrink-0">3</span>
            <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words min-w-0">{{ t('gs.s3.title') }}</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('gs.s3.l1') }}</li>
            <li class="break-words"><b>Crop diagram</b>{{ t('gs.s3.l2a') }}</li>
            <li class="break-words">{{ t('gs.s3.l3a') }}<b>{{ t('gs.s3.saveStart') }}</b>.</li>
          </ol>
          <p class="font-hand text-lg lg:text-xl text-ink/50 mt-3 -rotate-1 break-words">{{ t('gs.s3.note') }}</p>
        </section>

        <section class="relative rounded-lg bg-white p-4 lg:p-7 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] overflow-hidden" style="transform: rotate(0.4deg)">
          <div class="tape" aria-hidden="true"></div>
          <div class="flex items-center gap-3 min-w-0">
            <span class="grade grid h-10 w-10 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-xl font-bold text-redmargin shrink-0">4</span>
            <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words min-w-0">{{ t('gs.s4.title') }}</h2>
          </div>
          <ol class="mt-4 list-decimal list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('gs.s4.l1') }}</li>
            <li class="break-words">{{ t('gs.s4.l2') }}</li>
          </ol>
        </section>

        <section class="rounded-lg bg-hlblue/30 border-2 border-hlblue p-4 lg:p-7 overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('gs.opt.title') }}</h2>
          <ol class="mt-3 list-decimal list-inside text-[15px] text-ink/70 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('gs.opt.l1a') }}<b>/extract</b>{{ t('gs.opt.l1b') }}<b>AI Agent</b>{{ t('gs.opt.l1c') }}</li>
            <li class="break-words">{{ t('gs.opt.l2a') }}<code class="bg-white/70 px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">providers.yaml</code>{{ t('gs.opt.l2b') }}<b>Settings</b>{{ t('gs.opt.l2c') }}</li>
            <li class="break-words">{{ t('gs.opt.l3') }}</li>
            <li class="break-words">{{ t('gs.opt.l4a') }}<b>Force Mistral OCR</b>{{ t('gs.opt.l4b') }}</li>
            <li class="break-words">{{ t('gs.opt.l5a') }}<b>+ Add custom provider</b>{{ t('gs.opt.l5b') }}</li>
          </ol>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('gs.keys.title') }}</h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words">{{ t('gs.keys.l1a') }}<b>{{ t('gs.keys.noKey') }}</b>{{ t('gs.keys.l1b') }}</li>
            <li class="break-words">{{ t('gs.keys.l2') }}</li>
            <li class="break-words">{{ t('gs.keys.l3a') }}<a href="/privacy" class="text-pen underline decoration-wavy underline-offset-2 break-all">{{ t('gs.keys.l3b') }}</a></li>
          </ul>
        </section>

        <section class="rounded-lg bg-white p-4 lg:p-7 ring-1 ring-ink/[0.06] shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] overflow-hidden">
          <h2 class="font-display font-bold text-lg lg:text-xl tracking-tight break-words">{{ t('gs.fix.title') }} <span class="font-hand text-lg lg:text-xl text-ink/45 font-normal break-words">{{ t('gs.fix.sub') }}</span></h2>
          <ul class="mt-3 list-disc list-inside text-[15px] text-ink/65 space-y-1.5 leading-relaxed break-words">
            <li class="break-words"><b>{{ t('gs.fix.l1a') }}</b>{{ t('gs.fix.l1b') }}</li>
            <li class="break-words"><b>{{ t('gs.fix.l2a') }}</b>{{ t('gs.fix.l2b') }}</li>
            <li class="break-words"><b>{{ t('gs.fix.l3a') }}</b>{{ t('gs.fix.l3b') }}</li>
            <li class="break-words"><b>{{ t('gs.fix.l4a') }}</b>{{ t('gs.fix.l4b') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">["0","2"]</code>{{ t('gs.fix.l4c') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">answer:""</code>.</li>
            <li class="break-words"><b>{{ t('gs.fix.l5a') }}</b>{{ t('gs.fix.l5b') }}<code class="bg-paper px-1.5 py-0.5 rounded border border-ink/10 text-[13px] break-all">GROQ_API_KEY</code>{{ t('gs.fix.l5c') }}</li>
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
  max-width: 92%;
  transform: translateX(-50%) rotate(-1.8deg);
  background: url('/images/notebook/tape-washi.webp') center/contain no-repeat;
  filter: drop-shadow(0 4px 10px rgba(35,32,58,0.12));
}
@media (max-width: 390px) {
  .tape { width: 190px; height: 50px; top: -20px; }
}
</style>
