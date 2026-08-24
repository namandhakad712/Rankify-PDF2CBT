<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink } from 'vue-router'
import { BookOpen, Info, ShieldCheck, ArrowRight, Languages, Check, ArrowUpRight } from 'lucide-vue-next'
import { locale, setLocale, t, type Locale } from '@/lib/i18n'

const open = ref(false)
const rootEl = ref<HTMLElement | null>(null)

const options: { id: Locale; label: string; native: string }[] = [
  { id: 'en', label: 'English', native: 'English' },
  { id: 'hi', label: 'Hindi', native: 'हिन्दी' },
  { id: 'hinglish', label: 'Hinglish', native: 'Hinglish' }
]

function pick(l: Locale): void {
  setLocale(l)
  open.value = false
}

function onDocPointer(e: PointerEvent): void {
  if (open.value && rootEl.value && !rootEl.value.contains(e.target as Node)) open.value = false
}
function onKey(e: KeyboardEvent): void {
  if (e.key === 'Escape') open.value = false
}

onMounted(() => {
  document.addEventListener('pointerdown', onDocPointer)
  document.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  document.removeEventListener('pointerdown', onDocPointer)
  document.removeEventListener('keydown', onKey)
})
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
        <div ref="rootEl" class="relative">
          <button
            type="button"
            class="grid h-9 w-9 place-items-center rounded-full border border-ink/10 bg-white text-ink/65 hover:text-ink hover:border-ink/25 transition-colors"
            :aria-expanded="open"
            aria-haspopup="menu"
            aria-label="Change language"
            @click="open = !open"
          >
            <Languages class="w-4.5 h-4.5" />
          </button>

          <Transition
            enter-active-class="transition duration-150 ease-out"
            enter-from-class="opacity-0 scale-95 -translate-y-1"
            enter-to-class="opacity-100 scale-100 translate-y-0"
            leave-active-class="transition duration-100 ease-in"
            leave-from-class="opacity-100 scale-100"
            leave-to-class="opacity-0 scale-95"
          >
            <div
              v-if="open"
              role="menu"
              class="absolute right-0 top-full mt-2 w-52 origin-top-right rounded-xl border border-ink/[0.08] bg-white p-1.5 shadow-[0_18px_50px_-18px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.05]"
            >
              <button
                v-for="o in options"
                :key="o.id"
                type="button"
                role="menuitemradio"
                :aria-checked="locale === o.id"
                class="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-medium transition-colors"
                :class="locale === o.id ? 'bg-pen/[0.07] text-pen' : 'text-ink/70 hover:bg-paper hover:text-ink'"
                @click="pick(o.id)"
              >
                <span>{{ o.native }}<span v-if="o.label !== o.native" class="ml-1.5 text-ink/45 font-normal">{{ o.label }}</span></span>
                <Check v-if="locale === o.id" class="w-4 h-4 shrink-0" />
              </button>

              <div class="my-1.5 border-t border-dashed border-ink/10"></div>

              <a
                href="https://github.com/namandhakad712/Rankify-PDF2CBT/issues/new?template=language_request.yml"
                target="_blank"
                rel="noopener"
                role="menuitem"
                class="w-full flex items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-sm font-semibold text-ink/75 hover:bg-hlyellow/30 hover:text-ink transition-colors"
              >
                Want another language?
                <ArrowUpRight class="w-4 h-4 shrink-0" />
              </a>
            </div>
          </Transition>
        </div>

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
