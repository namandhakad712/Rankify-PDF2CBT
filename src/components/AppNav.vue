<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { BookOpen, Info, ShieldCheck, ArrowRight } from 'lucide-vue-next'
import gsap from 'gsap'
import { t } from '@/lib/i18n'
import LangSwitch from '@/components/LangSwitch.vue'

const logoGlow = ref(false)
let keyBuffer = ''
let clickCount = 0
let clickTimer: ReturnType<typeof setTimeout> | null = null

// Easter egg: Konami code
const KONAMI = 'ArrowUpArrowUpArrowDownArrowDownArrowLeftArrowRightArrowLeftArrowRightba'
function onKeyDown(e: KeyboardEvent) {
  keyBuffer += e.key
  if (keyBuffer.length > 20) keyBuffer = keyBuffer.slice(-20)
  if (keyBuffer.includes(KONAMI)) {
    keyBuffer = ''
    triggerConfetti()
  }
  // Easter egg: type 'rankify'
  if (keyBuffer.endsWith('rankify')) {
    logoGlow.value = true
    setTimeout(() => { logoGlow.value = false }, 2000)
    keyBuffer = ''
  }
}

// Easter egg: triple-click logo
function onLogoClick() {
  clickCount++
  if (clickCount === 1) {
    clickTimer = setTimeout(() => { clickCount = 0 }, 400)
  } else if (clickCount >= 3) {
    clickCount = 0
    if (clickTimer) clearTimeout(clickTimer)
    triggerConfetti()
  }
}

async function triggerConfetti() {
  try {
    const confetti = (await import('canvas-confetti')).default
    confetti({ particleCount: 100, spread: 70, origin: { y: 0.1 }, colors: ['#2F5FE0', '#FFD84D', '#1FA45C', '#FF9EC0', '#7c3aed'] })
  } catch {}
}

onMounted(() => { window.addEventListener('keydown', onKeyDown) })
onBeforeUnmount(() => { window.removeEventListener('keydown', onKeyDown) })
</script>

<template>
  <nav class="fixed top-4 left-1/2 -translate-x-1/2 z-40 w-[92%] max-w-3xl">
    <div class="flex items-center justify-between gap-2 rounded-2xl border border-ink/[0.08] bg-white/85 pl-4 lg:pl-5 pr-2.5 py-2.5 shadow-[0_2px_20px_-8px_rgba(35,32,58,0.15)] backdrop-blur-md">
      <RouterLink to="/" class="flex items-baseline gap-1.5 group shrink-0" @click="onLogoClick">
        <span class="font-display font-bold text-lg lg:text-xl tracking-tight text-ink group-hover:text-pen transition-colors" :class="logoGlow ? 'text-pen drop-shadow-[0_0_8px_rgba(47,95,224,0.6)]' : ''">Rankify</span>
        <span class="font-hand text-base lg:text-lg text-redmargin -rotate-6 inline-block">pdf→cbt</span>
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink to="/getting-started" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5 min-h-[40px]">
          <BookOpen class="w-4 h-4" /> {{ t('nav.guide') }}
        </RouterLink>
        <RouterLink to="/about" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5 min-h-[40px]">
          <Info class="w-4 h-4" /> {{ t('nav.about') }}
        </RouterLink>
        <RouterLink to="/privacy" class="px-3.5 py-2 text-[15px] font-medium text-ink/60 hover:text-ink rounded-lg hover:bg-paper transition-colors inline-flex items-center gap-1.5 min-h-[40px]">
          <ShieldCheck class="w-4 h-4" /> {{ t('nav.privacy') }}
        </RouterLink>
      </div>

      <div class="flex items-center gap-2 shrink-0">
        <LangSwitch />
        <RouterLink
          to="/extract"
          class="inline-flex items-center gap-2 rounded-xl bg-pen px-3 lg:px-4 py-2.5 text-sm font-semibold text-white transition-transform hover:-translate-y-0.5 whitespace-nowrap min-h-[40px]"
        >
          {{ t('nav.cta') }}
          <ArrowRight class="w-3.5 h-3.5 shrink-0" />
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
