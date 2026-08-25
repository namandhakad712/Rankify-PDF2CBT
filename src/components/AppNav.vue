<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { BookOpen, Info, ShieldCheck, ArrowRight } from 'lucide-vue-next'
import { t } from '@/lib/i18n'
import LangSwitch from '@/components/LangSwitch.vue'
</script>

<template>
  <nav class="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl">
    <div class="flex items-center justify-between rounded-2xl border border-ink/[0.08] bg-white/85 pl-5 pr-2.5 py-2.5 shadow-[0_2px_20px_-8px_rgba(35,32,58,0.15)] backdrop-blur-md">
      <RouterLink to="/" class="flex items-baseline gap-1.5 group">
        <span class="font-display font-bold text-xl tracking-tight text-ink group-hover:text-pen transition-colors">Rankify</span>
        <span class="font-hand text-lg text-redmargin -rotate-6 inline-block">pdf→cbt</span>
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink to="/getting-started" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5">
          <BookOpen class="w-4 h-4" /> {{ t('nav.guide') }}
        </RouterLink>
        <RouterLink to="/about" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5">
          <Info class="w-4 h-4" /> {{ t('nav.about') }}
        </RouterLink>
        <RouterLink to="/privacy" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5">
          <ShieldCheck class="w-4 h-4" /> {{ t('nav.privacy') }}
        </RouterLink>
      </div>

      <div class="flex items-center gap-2">
        <LangSwitch />
        <RouterLink
          to="/extract"
          class="inline-flex items-center gap-2 rounded-xl bg-pen px-4 py-2 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 whitespace-nowrap"
        >
          {{ t('nav.cta') }}
          <ArrowRight class="w-3.5 h-3.5" />
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
