<template>
  <div :class="['rk-root min-h-screen bg-background text-foreground antialiased selection:bg-fuchsia-500/30', cursorActive ? 'rk-hide-cursor' : '']">
    <!-- Noise -->
    <div class="noise-overlay" aria-hidden="true"></div>

    <!-- Custom Cursor -->
    <div ref="curDot" class="cur-dot" aria-hidden="true"></div>
    <div ref="curRing" class="cur-ring" aria-hidden="true"></div>

    <!-- Preloader -->
    <div ref="preloader" class="fixed inset-0 z-[100] bg-[#07040c] flex flex-col items-center justify-center">
      <div class="flex overflow-hidden">
        <span
          v-for="(ch, i) in 'RANKIFY'.split('')"
          :key="'pl' + i"
          ref="preChars"
          class="inline-block font-display font-bold text-4xl md:text-6xl tracking-tight text-transparent bg-clip-text bg-gradient-to-b from-violet-300 via-violet-400 to-fuchsia-500 will-change-transform"
        >{{ ch }}</span>
      </div>
      <div ref="preSub" class="mt-3 font-mono text-[11px] uppercase tracking-[0.4em] text-violet-300/50">pdf → cbt</div>
      <div ref="preCount" class="absolute bottom-6 right-8 font-display text-7xl md:text-9xl font-bold text-white/[0.07] tabular-nums">00</div>
      <div class="absolute bottom-0 left-0 h-px w-full bg-white/5">
        <div ref="preBar" class="h-full w-0 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
      </div>
    </div>

    <!-- Nav -->
    <header ref="navEl" class="fixed top-4 inset-x-0 z-50 px-4 -translate-y-24 opacity-0">
      <nav class="mx-auto max-w-6xl flex items-center justify-between gap-4 rounded-full border border-white/10 bg-[#0b0714]/60 pl-5 pr-2 py-2 backdrop-blur-xl shadow-[0_8px_40px_-12px_rgba(139,92,246,0.35)]">
        <RouterLink to="/" class="flex items-baseline gap-2 group" data-cursor>
          <span class="font-display font-bold tracking-tight text-lg text-white">RANKIFY</span>
          <span class="font-mono text-[9px] uppercase tracking-[0.3em] text-violet-400 group-hover:text-fuchsia-400 transition-colors">pdf2cbt</span>
        </RouterLink>
        <div class="hidden md:flex items-center gap-7 text-sm text-white/55">
          <a href="#pipeline" class="hover:text-white transition-colors rk-anchor" data-cursor>Pipeline</a>
          <a href="#features" class="hover:text-white transition-colors rk-anchor" data-cursor>Features</a>
          <a href="#faq" class="hover:text-white transition-colors rk-anchor" data-cursor>FAQ</a>
          <RouterLink to="/about" class="hover:text-white transition-colors" data-cursor>About</RouterLink>
        </div>
        <RouterLink
          to="/extract"
          data-cursor
          class="group relative inline-flex items-center gap-2 rounded-full bg-violet-600 hover:bg-fuchsia-600 px-5 py-2.5 text-sm font-semibold text-white transition-colors overflow-hidden"
        >
          <span class="relative z-10">Start</span>
          <ArrowRight class="relative z-10 w-3.5 h-3.5 group-hover:translate-x-0.5 transition-transform" />
        </RouterLink>
      </nav>
    </header>

    <main>
      <!-- ═══════════ HERO ═══════════ -->
      <section class="relative min-h-[100svh] flex flex-col justify-center overflow-hidden">
        <div ref="heroFx" class="absolute inset-0 z-0 will-change-transform">
          <HalftoneReveal
            src="/hero.webp"
            ink-color="#a78bfa"
            paper-color="#07040c"
            mode="mono"
            :dot-size="1"
            :dot-density="88"
            :angle="26"
            :contrast="1.28"
            :reveal-radius="0.32"
            :edge="0.72"
            :follow="0.32"
            border-radius="0px"
          />
        </div>
        <div class="absolute inset-0 z-[1] bg-gradient-to-b from-[#07040c]/80 via-transparent to-background pointer-events-none"></div>
        <div class="absolute inset-0 z-[1] bg-[radial-gradient(ellipse_at_center,transparent_35%,#07040c_92%)] pointer-events-none"></div>

        <div class="relative z-10 px-6 mx-auto max-w-6xl w-full text-center pt-24">
          <div ref="heroBadgeWrap" class="inline-flex mb-8 overflow-hidden opacity-0">
            <span class="hero-badge inline-flex items-center gap-2.5 rounded-full border border-violet-400/25 bg-violet-500/10 backdrop-blur-md px-4 py-1.5 text-xs font-medium text-violet-200">
              <span class="relative flex h-1.5 w-1.5">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-fuchsia-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-1.5 w-1.5 bg-fuchsia-400"></span>
              </span>
              Open-source · runs entirely in your browser
            </span>
          </div>

          <h1 class="font-display font-bold leading-[0.94] tracking-[-0.03em] text-white text-[clamp(3rem,10vw,8.5rem)]">
            <span class="block overflow-hidden pb-1"><span ref="hLine1" class="block will-change-transform">DEAD PAPER,</span></span>
            <span class="block overflow-hidden pb-2"><span ref="hLine2" class="block will-change-transform"><span class="font-accent font-normal bg-clip-text text-transparent bg-gradient-to-r from-fuchsia-200 via-fuchsia-400 to-violet-300 pr-1">live</span><span class="bg-clip-text text-transparent bg-gradient-to-r from-violet-400 via-fuchsia-400 to-violet-400 bg-[length:200%_auto] animate-flow"> EXAM.</span></span></span>
          </h1>

          <p ref="heroDesc" class="opacity-0 mx-auto mt-7 max-w-xl text-base md:text-lg text-white/55 leading-relaxed">
            Drop any question-paper PDF. Extract with AI, crop diagrams by hand,
            and sit a full computer-based test — without a single server seeing your file.
          </p>

          <div ref="heroCtas" class="opacity-0 mt-10 flex flex-col sm:flex-row gap-4 justify-center items-center">
            <RouterLink
              to="/extract"
              ref="ctaPrimary"
              data-cursor
              @mousemove="magnet"
              @mouseleave="unmagnet"
              class="mag group relative inline-flex items-center gap-3 rounded-full bg-white text-[#0b0714] px-8 py-4 font-semibold overflow-hidden"
            >
              <span class="relative z-10 flex items-center gap-2 transition-colors duration-300 group-hover:text-white">
                Launch extractor
                <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
              </span>
              <span class="absolute inset-0 translate-y-full group-hover:translate-y-0 transition-transform duration-300 ease-out bg-gradient-to-r from-violet-600 to-fuchsia-600"></span>
            </RouterLink>
            <a
              href="#pipeline"
              data-cursor
              class="rk-anchor mag group inline-flex items-center gap-3 rounded-full border border-white/15 hover:border-violet-400/60 px-8 py-4 font-semibold text-white/80 hover:text-white transition-colors"
            >
              See how it works
              <ChevronsDown class="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
            </a>
          </div>
        </div>

        <div class="absolute bottom-8 left-1/2 -translate-x-1/2 z-10 flex flex-col items-center gap-2 text-white/30">
          <span class="font-mono text-[9px] uppercase tracking-[0.35em]">scroll</span>
          <div class="w-px h-10 bg-gradient-to-b from-violet-400/60 to-transparent"></div>
        </div>
      </section>

      <!-- ═══════════ MARQUEE ═══════════ -->
      <section class="relative border-y border-white/[0.06] bg-[#090611] py-6 overflow-hidden" aria-hidden="true">
        <div ref="marqueeTrack" class="flex whitespace-nowrap will-change-transform">
          <div v-for="n in 2" :key="'mq' + n" class="flex shrink-0 items-center">
            <template v-for="(item, i) in marqueeItems" :key="'mqi' + n + i">
              <span class="font-display text-2xl md:text-4xl font-medium tracking-tight text-white/85 px-6">{{ item }}</span>
              <svg class="w-4 h-4 text-fuchsia-500 shrink-0" viewBox="0 0 16 16" fill="currentColor"><path d="M8 0l1.8 6.2L16 8l-6.2 1.8L8 16l-1.8-6.2L0 8l6.2-1.8z"/></svg>
            </template>
          </div>
        </div>
      </section>

      <!-- ═══════════ MANIFESTO SCRUB ═══════════ -->
      <section ref="manifestoSec" class="relative min-h-screen flex items-center justify-center px-6">
        <p ref="manifestoText" class="max-w-4xl text-center font-display font-medium text-[clamp(1.6rem,4.5vw,3.4rem)] leading-[1.25] tracking-tight text-white">
          Your question paper shouldn't die inside a PDF.
          Resurrect it — extract every question, crop every diagram,
          and attempt the exam exactly the way it was meant to be faced.
        </p>
      </section>

      <!-- ═══════════ PIPELINE (horizontal pin) ═══════════ -->
      <section id="pipeline" ref="pipeSec" class="relative border-t border-white/[0.06] bg-[#080510] overflow-hidden">
        <div class="absolute inset-0 opacity-60" aria-hidden="true">
          <DotGrid :gap="30" :dot-size="4" base-color="#7c5cff" active-color="#e879f9" :proximity="170" :opacity="0.55" />
        </div>

        <div class="relative md:h-screen md:overflow-hidden md:flex md:flex-col justify-center">
          <div class="px-6 max-w-6xl mx-auto w-full pt-20 md:pt-0 pb-8 flex items-end justify-between">
            <div>
              <div class="font-mono text-[10px] uppercase tracking-[0.4em] text-violet-400 mb-3">the pipeline</div>
              <h2 data-reveal class="font-display font-bold tracking-tight text-white text-4xl md:text-6xl">PDF in. <span class="font-accent font-normal text-fuchsia-300">exam out.</span></h2>
            </div>
            <div class="hidden md:flex items-center gap-2">
              <span
                v-for="(step, i) in steps"
                :key="'chip' + i"
                class="h-1.5 rounded-full transition-all duration-300"
                :class="pipeStep >= i ? 'w-8 bg-gradient-to-r from-violet-500 to-fuchsia-500' : 'w-3 bg-white/15'"
              ></span>
              <span class="ml-3 font-mono text-xs text-white/40 tabular-nums"><span ref="pipeIdx">01</span><span class="text-white/15"> / 04</span></span>
            </div>
          </div>
          <div class="hidden md:block mx-auto max-w-6xl w-full px-6 mb-10">
            <div class="h-px w-full bg-white/[0.08] relative overflow-hidden">
              <div ref="pipeProgress" class="absolute inset-y-0 left-0 w-full origin-left scale-x-0 bg-gradient-to-r from-violet-500 to-fuchsia-500"></div>
            </div>
          </div>

          <div ref="pipeTrack" class="pipe-track relative flex flex-col md:flex-row md:w-[400vw] will-change-transform">
            <div v-for="(step, i) in steps" :key="'step' + i" class="pipe-panel md:w-screen shrink-0 px-6 md:px-16 lg:px-24 py-10 md:py-0 flex items-center">
              <div
                class="spot group relative w-full max-w-4xl mx-auto rounded-[2rem] border border-white/[0.09] bg-[#0d0918]/80 backdrop-blur-md p-8 md:p-14 overflow-hidden transition-colors duration-500 hover:border-violet-400/40"
                @mousemove="spotlight"
              >
                <div class="spot-glow" aria-hidden="true"></div>
                <div class="absolute -top-10 -right-4 md:right-8 font-display font-extrabold leading-none text-[7rem] md:text-[11rem] text-transparent bg-clip-text bg-gradient-to-b from-violet-500/25 to-fuchsia-500/[0.04] select-none" aria-hidden="true">{{ step.num }}</div>
                <div class="relative z-10 max-w-lg">
                  <div class="mb-6 inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-violet-400/30 bg-gradient-to-br from-violet-500/20 to-fuchsia-500/10 text-violet-300 shadow-[0_0_30px_-8px_rgba(139,92,246,0.6)]">
                    <component :is="step.icon" class="w-6 h-6" />
                  </div>
                  <div class="font-mono text-[10px] uppercase tracking-[0.35em] text-fuchsia-400/80 mb-2">step {{ step.num }}</div>
                  <h3 class="font-display font-bold text-white text-3xl md:text-5xl tracking-tight mb-4">{{ step.title }}</h3>
                  <p class="text-white/55 leading-relaxed text-sm md:text-lg">{{ step.desc }}</p>
                  <div class="mt-7 flex flex-wrap gap-2">
                    <span v-for="tag in step.tags" :key="tag" class="rounded-full border border-violet-400/20 bg-violet-500/10 px-3.5 py-1.5 font-mono text-[10px] uppercase tracking-wider text-violet-200/80">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════ FEATURES BENTO ═══════════ -->
      <section id="features" class="relative px-6 py-28 md:py-36">
        <div class="mx-auto max-w-6xl">
          <div class="mb-14 md:mb-20">
            <div class="font-mono text-[10px] uppercase tracking-[0.4em] text-violet-400 mb-3">why rankify</div>
            <h2 data-reveal class="font-display font-bold tracking-tight text-white text-4xl md:text-6xl max-w-2xl">Built like a <span class="font-accent font-normal text-fuchsia-300">vault,</span><br />feels like a game.</h2>
          </div>
          <div class="grid grid-cols-1 md:grid-cols-3 gap-4 auto-rows-[minmax(180px,auto)]">
            <div
              v-for="(f, i) in features"
              :key="'feat' + i"
              class="spot group relative overflow-hidden rounded-3xl border border-white/[0.08] bg-white/[0.025] p-7 md:p-8 flex flex-col justify-between transition-colors hover:border-violet-400/30"
              :class="f.span"
              :data-i="i"
              @mousemove="spotlight"
            >
              <div class="spot-glow" aria-hidden="true"></div>
              <div class="relative z-10 flex items-start justify-between">
                <div class="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-white/[0.05] text-violet-300 group-hover:text-fuchsia-300 transition-colors">
                  <component :is="f.icon" class="w-5 h-5" />
                </div>
                <ArrowUpRight class="w-4 h-4 text-white/20 group-hover:text-fuchsia-400 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-all" />
              </div>
              <div class="relative z-10 mt-8">
                <h3 class="font-display font-semibold text-white text-lg md:text-xl tracking-tight">{{ f.title }}</h3>
                <p class="mt-2 text-sm text-white/45 leading-relaxed">{{ f.desc }}</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════ STATS ═══════════ -->
      <section ref="statsSec" class="relative border-y border-white/[0.06] bg-[#090611]">
        <div class="mx-auto max-w-6xl grid grid-cols-2 md:grid-cols-4">
          <div v-for="(s, i) in stats" :key="'stat' + i" class="px-6 py-12 md:py-16 border-white/[0.06] [&:not(:last-child)]:border-r last:border-r-0 max-md:[&:nth-child(-n+2)]:border-b max-md:[&:nth-child(2)]:border-r-0">
            <div class="font-display font-bold tracking-tighter text-[clamp(2.6rem,6vw,4.5rem)] leading-none text-transparent bg-clip-text bg-gradient-to-b from-white to-violet-400">
              <span class="stat-num tabular-nums">{{ s.prefix }}{{ s.value }}{{ s.suffix }}</span>
            </div>
            <div class="mt-3 font-mono text-[10px] uppercase tracking-[0.3em] text-white/40">{{ s.label }}</div>
          </div>
        </div>
      </section>

      <!-- ═══════════ PORTALS (InfiniteMenu) ═══════════ -->
      <section class="relative px-6 py-28 md:py-36">
        <div class="mx-auto max-w-5xl text-center">
          <div class="font-mono text-[10px] uppercase tracking-[0.4em] text-violet-400 mb-3">choose your portal</div>
          <h2 data-reveal class="font-display font-bold tracking-tight text-white text-4xl md:text-6xl mb-12">Touch the <span class="font-accent font-normal text-fuchsia-300">blob.</span><br class="hidden md:block" /> Enter the flow.</h2>
          <div class="h-[65vh] min-h-[420px] rounded-[2rem] overflow-hidden border border-white/10 shadow-[0_0_120px_-30px_rgba(139,92,246,0.5)]">
            <InfiniteMenu :items="portals" />
          </div>
        </div>
      </section>

      <!-- ═══════════ FAQ ═══════════ -->
      <section id="faq" class="relative px-6 pb-28 md:pb-36">
        <div class="mx-auto max-w-3xl">
          <div class="mb-12 text-center">
            <div class="font-mono text-[10px] uppercase tracking-[0.4em] text-violet-400 mb-3">questions</div>
            <h2 data-reveal class="font-display font-bold tracking-tight text-white text-4xl md:text-5xl">Straight <span class="font-accent font-normal text-fuchsia-300">answers.</span></h2>
          </div>
          <div class="divide-y divide-white/[0.07] border-y border-white/[0.07]">
            <div v-for="(fq, i) in faqs" :key="'fq' + i" class="group">
              <button
                class="flex w-full items-center justify-between gap-6 py-6 text-left"
                :aria-expanded="openFaq === i"
                @click="toggleFaq(i)"
              >
                <span class="font-display font-medium text-white/85 group-hover:text-white text-base md:text-lg transition-colors">{{ fq.q }}</span>
                <span class="shrink-0 inline-flex h-8 w-8 items-center justify-center rounded-full border border-white/10 text-white/50 transition-all duration-300" :class="openFaq === i ? 'rotate-45 border-fuchsia-400/50 text-fuchsia-400' : ''">
                  <Plus class="w-4 h-4" />
                </span>
              </button>
              <div class="grid transition-[grid-template-rows] duration-400 ease-out" :style="{ gridTemplateRows: openFaq === i ? '1fr' : '0fr' }">
                <div class="overflow-hidden">
                  <p class="pb-6 pr-12 text-sm md:text-[15px] text-white/45 leading-relaxed">{{ fq.a }}</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </main>

    <!-- ═══════════ FOOTER ═══════════ -->
    <footer class="relative overflow-hidden border-t border-white/[0.06] bg-[#07040c]">
      <div class="mx-auto max-w-6xl px-6 pt-16 pb-8">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-10">
          <div>
            <div class="font-display font-bold text-white text-2xl tracking-tight">RANKIFY<span class="text-violet-400">.</span></div>
            <p class="mt-2 max-w-xs text-sm text-white/40 leading-relaxed">The open-source bridge between dead question papers and living computer-based tests.</p>
          </div>
          <div class="flex flex-wrap gap-x-8 gap-y-3 text-sm text-white/50">
            <RouterLink to="/extract" class="hover:text-fuchsia-400 transition-colors" data-cursor>Extract</RouterLink>
            <RouterLink to="/getting-started" class="hover:text-fuchsia-400 transition-colors" data-cursor>Guide</RouterLink>
            <RouterLink to="/about" class="hover:text-fuchsia-400 transition-colors" data-cursor>About</RouterLink>
            <RouterLink to="/privacy" class="hover:text-fuchsia-400 transition-colors" data-cursor>Privacy</RouterLink>
          </div>
          <button ref="topBtn" class="relative h-28 w-28 shrink-0 text-violet-300 hover:text-fuchsia-300 transition-colors" data-cursor aria-label="Back to top">
            <CircularText text="BACK TO TOP · BACK TO TOP · " :spin-duration="14" on-hover="speedUp" class-name="w-full h-full" />
            <ArrowUp class="absolute inset-0 m-auto w-5 h-5" />
          </button>
        </div>
        <div ref="footGiant" class="mt-10 select-none text-center font-display font-bold leading-[0.8] tracking-[-0.04em] text-[19vw] md:text-[15rem] text-transparent" style="-webkit-text-stroke: 1px rgba(167,139,250,0.16)" aria-hidden="true">RANKIFY</div>
        <div class="mt-6 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-white/[0.06] pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-white/30">
          <span>© 2026 rankify-pdf2cbt · MIT</span>
          <span>no servers · no accounts · no leaks</span>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { RouterLink, useRouter } from 'vue-router'
import { useHead } from '@vueuse/head'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import Lenis from 'lenis'
import {
  ArrowRight, ChevronsDown, ArrowUp, UploadCloud, Wand2, Scissors,
  MonitorPlay, ShieldCheck, KeyRound, BarChart3, Timer, Braces, Languages, Plus, ArrowUpRight
} from 'lucide-vue-next'
import HalftoneReveal from '@/components/HalftoneReveal.vue'
import DotGrid from '@/components/DotGrid.vue'
import InfiniteMenu from '@/components/InfiniteMenu.vue'
import CircularText from '@/components/CircularText.vue'

gsap.registerPlugin(ScrollTrigger, SplitText)

/* ─── data ─── */
const marqueeItems = ['ANY EXAM', 'ANY LANGUAGE', 'ANY SUBJECT', 'MCQ · MSQ · NAT', 'TRUE / FALSE', 'MATCH THE FOLLOWING', 'PASSAGE', 'ASSERTION–REASON']

const steps = [
  { num: '01', icon: UploadCloud, title: 'Drop the PDF', desc: 'Any question paper, up to 20MB. It never leaves your browser — stored straight into IndexedDB on your own machine.', tags: ['≤20MB', 'IndexedDB', 'offline'] },
  { num: '02', icon: Wand2, title: 'Extract with AI', desc: 'Paste JSON straight from the Rankify Gemini GEM — free, no keys. Or flip to fallback mode with Mistral, Groq and NVIDIA behind one interface.', tags: ['Gemini GEM', 'BYOK', 'JSON schema'] },
  { num: '03', icon: Scissors, title: 'Review & crop', desc: 'Every question editable inline. Snip diagrams straight off the rendered PDF canvas — drag a box, done.', tags: ['live edit', 'diagram snip', 'MSQ aware'] },
  { num: '04', icon: MonitorPlay, title: 'Sit the exam', desc: 'A real CBT shell — question palette, countdown timer, mark-for-review. Submit and get instant per-section analytics.', tags: ['palette', 'timer', 'analytics'] }
]

const features = [
  { icon: ShieldCheck, title: 'Local-first privacy', desc: 'Papers, answers, results — everything lives in your browser. Zero uploads, zero accounts, zero telemetry.', span: 'md:col-span-2 md:row-span-1' },
  { icon: KeyRound, title: 'Bring your own key', desc: 'Fallback AI is a registry: Mistral, Groq, NVIDIA. Add a provider in one file.', span: '' },
  { icon: Scissors, title: 'Manual diagram crop', desc: 'AI misreads figures; you don\'t. Crop regions off the actual PDF render.', span: '' },
  { icon: Timer, title: 'Exam-grade CBT shell', desc: 'Timer, palette states, mark-for-review — the real feel of test day.', span: '' },
  { icon: Braces, title: 'One universal schema', desc: 'Nine question types, any subject, any language. JSON in, exam out.', span: '' },
  { icon: BarChart3, title: 'Instant analytics', desc: 'Per-subject bars, per-question verdicts, right after submit.', span: '' },
  { icon: Languages, title: 'Truly multilingual', desc: 'Hindi, English, Tamil, Bangla — text is just UTF-8. Nothing is hardcoded.', span: 'md:col-span-2' }
]

const stats = [
  { value: 9, suffix: '', prefix: '', label: 'question types' },
  { value: 100, suffix: '%', prefix: '', label: 'on-device' },
  { value: 3, suffix: '', prefix: '', label: 'fallback AIs' },
  { value: 0, suffix: '', prefix: '', label: 'signups needed' }
]

const portals = [
  { image: '/images/infinite-scroll/competitive-prep.webp', link: '/extract', title: 'Start extracting', description: 'PDF → live exam in minutes' },
  { image: '/images/infinite-scroll/smart-work.webp', link: '/getting-started', title: 'How it works', description: 'The GEM workflow, step by step' },
  { image: '/images/infinite-scroll/freedom-of-time.webp', link: '/results', title: 'Analytics', description: 'Your last attempt, decoded' },
  { image: '/images/infinite-scroll/first-time-test-takers.webp', link: '/about', title: 'About the project', description: 'Why this exists' }
]

const faqs = [
  { q: 'Does my PDF get uploaded anywhere?', a: 'No. The file is read in-browser and kept in IndexedDB on your device. There is no backend storage at all — the only network calls are the optional fallback-AI proxies, and those carry just the extracted text you choose to send.' },
  { q: 'Which exams / subjects are supported?', a: 'All of them. The schema is universal — school tests, university semesters, government mocks, language quizzes. Subjects, sections and chapters are free-form strings, so nothing is hardcoded to one exam.' },
  { q: 'Do I need an API key?', a: 'Not for the primary flow: you chat with our public Gemini GEM, copy the JSON, paste it back. Keys are only needed if you enable fallback extraction with Mistral, Groq or NVIDIA.' },
  { q: 'How are diagrams and figures handled?', a: 'Deliberately by hand. In Review you open the source PDF, see the question context, and drag a crop box over the figure. The snippet is stored with the question and shown during the test — no hallucinated images.' },
  { q: 'What question types can I ask for?', a: 'MCQ, multi-select, numeric answer, true/false, fill-in-the-blank, match-the-following, assertion–reason, passage-based and long answer. Marking schemes respect partial and negative marking where defined.' }
]

/* ─── refs ─── */
const preloader = ref(null)
const preChars = ref([])
const preSub = ref(null)
const preCount = ref(null)
const preBar = ref(null)
const navEl = ref(null)
const heroFx = ref(null)
const heroBadgeWrap = ref(null)
const hLine1 = ref(null)
const hLine2 = ref(null)
const heroDesc = ref(null)
const heroCtas = ref(null)
const ctaPrimary = ref(null)
const manifestoSec = ref(null)
const manifestoText = ref(null)
const pipeSec = ref(null)
const pipeTrack = ref(null)
const pipeProgress = ref(null)
const pipeIdx = ref(null)
const statsSec = ref(null)
const footGiant = ref(null)
const topBtn = ref(null)
const marqueeTrack = ref(null)
const curDot = ref(null)
const curRing = ref(null)
const openFaq = ref(-1)
const pipeStep = ref(0)
const cursorActive = ref(false)

const router = useRouter()
let lenis = null
let mm = null
let cursorRaf = 0
let introPlayed = false

const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function toggleFaq (i) {
  openFaq.value = openFaq.value === i ? -1 : i
}

function magnet (e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  gsap.to(el, { x: (e.clientX - r.left - r.width / 2) * 0.25, y: (e.clientY - r.top - r.height / 2) * 0.35, duration: 0.4, ease: 'power3.out' })
}
function unmagnet (e) {
  gsap.to(e.currentTarget, { x: 0, y: 0, duration: 0.7, ease: 'elastic.out(1,0.4)' })
}

function spotlight (e) {
  const el = e.currentTarget
  const r = el.getBoundingClientRect()
  el.style.setProperty('--mx', (e.clientX - r.left) + 'px')
  el.style.setProperty('--my', (e.clientY - r.top) + 'px')
}

function playIntro () {
  if (introPlayed) return
  introPlayed = true
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.to(navEl.value, { y: 0, opacity: 1, duration: 1 }, 0.1)
  if (!reduced && window.innerWidth >= 768) {
    const s1 = new SplitText(hLine1.value, { type: 'chars' })
    const s2 = new SplitText(hLine2.value, { type: 'chars' })
    tl.from(s1.chars, { yPercent: 115, rotate: 4, duration: 1.1, stagger: 0.028 }, 0)
    tl.from(s2.chars, { yPercent: 115, rotate: -4, duration: 1.1, stagger: 0.028 }, 0.08)
  } else {
    tl.from([hLine1.value, hLine2.value], { yPercent: 110, duration: 0.9 }, 0)
  }
  tl.to(heroBadgeWrap.value, { opacity: 1, y: 0, duration: 0.7 }, 0.25)
  tl.to(heroDesc.value, { opacity: 1, y: 0, duration: 0.8 }, 0.45)
  tl.to(heroCtas.value, { opacity: 1, y: 0, duration: 0.8 }, 0.58)
}

onMounted(() => {
  /* Lenis */
  lenis = new Lenis({ duration: reduced ? 0 : 1.15, smoothWheel: !reduced })
  lenis.on('scroll', ScrollTrigger.update)
  const tick = t => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)
  lenis.stop()

  document.documentElement.classList.add('dark')

  /* anchors through lenis */
  document.querySelectorAll('.rk-anchor').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href')
      if (id && id.startsWith('#')) {
        e.preventDefault()
        lenis.scrollTo(id, { offset: -80, duration: 1.4 })
      }
    })
  })

  /* Preloader */
  if (reduced) {
    preloader.value.style.display = 'none'
    playIntro()
    lenis.start()
  } else {
    const cnt = { v: 0 }
    const tl = gsap.timeline({
      onComplete: () => {
        lenis.start()
        playIntro()
      }
    })
    tl.from(preChars.value, { yPercent: 120, opacity: 0, duration: 0.7, stagger: 0.055, ease: 'expo.out' }, 0)
    tl.from(preSub.value, { opacity: 0, y: 12, duration: 0.5 }, 0.4)
    tl.to(cnt, {
      v: 100, duration: 1.7, ease: 'power2.inOut',
      onUpdate: () => {
        preCount.value.textContent = String(Math.round(cnt.v)).padStart(2, '0')
        preBar.value.style.width = cnt.v + '%'
      }
    }, 0.2)
    tl.to(preloader.value, { yPercent: -100, duration: 1, ease: 'expo.inOut' }, '+=0.15')
    tl.set(preloader.value, { display: 'none' })
  }

  /* Hero parallax out */
  if (!reduced) {
    gsap.to(heroFx.value, {
      yPercent: 14, scale: 1.06, opacity: 0.35, ease: 'none',
      scrollTrigger: { trigger: heroFx.value.closest('section'), start: 'top top', end: 'bottom top', scrub: true }
    })
  }

  /* Manifesto word scrub */
  if (!reduced) {
    const split = new SplitText(manifestoText.value, { type: 'words' })
    gsap.fromTo(split.words, { opacity: 0.1 }, {
      opacity: 1, stagger: 0.06, ease: 'none',
      scrollTrigger: { trigger: manifestoSec.value, start: 'top 75%', end: 'center 45%', scrub: 0.6 }
    })
  }

  /* Horizontal pipeline */
  mm = gsap.matchMedia()
  mm.add('(min-width: 768px)', () => {
    if (reduced) return
    const tween = gsap.to(pipeTrack.value, {
      xPercent: -75, ease: 'none',
      scrollTrigger: {
        trigger: pipeSec.value,
        start: 'top top',
        end: '+=320%',
        pin: true,
        scrub: 0.8,
        anticipatePin: 1,
        invalidateOnRefresh: true,
        onUpdate: self => {
          pipeProgress.value.style.transform = `scaleX(${self.progress})`
          const idx = Math.min(3, Math.floor(self.progress * 4))
          pipeIdx.value.textContent = String(idx + 1).padStart(2, '0')
          pipeStep.value = idx
        }
      }
    })
    return () => tween.scrollTrigger && tween.scrollTrigger.kill()
  })

  /* Scroll-velocity marquee */
  let mqX = 0
  const mqTick = () => {
    if (!marqueeTrack.value) return
    const v = Math.min(Math.abs(lenis.velocity || 0), 60) / 60
    mqX -= 0.045 + v * 0.5
    if (mqX <= -50) mqX += 50
    const skew = v * 4
    marqueeTrack.value.style.transform = `translateX(${mqX}%) skewX(${skew}deg)`
  }
  gsap.ticker.add(mqTick)

  /* Masked word reveals for section headings */
  if (!reduced) {
    document.querySelectorAll('[data-reveal]').forEach(el => {
      const sp = new SplitText(el, { type: 'words', wordsClass: 'rv-word' })
      sp.words.forEach(w => {
        w.style.display = 'inline-block'
        w.style.willChange = 'transform'
      })
      gsap.from(sp.words, {
        yPercent: 120, rotate: 3, duration: 0.9, ease: 'expo.out', stagger: 0.06,
        scrollTrigger: { trigger: el, start: 'top 88%', once: true }
      })
    })
  }

  /* Stats count-up */
  ScrollTrigger.create({
    trigger: statsSec.value,
    start: 'top 78%',
    once: true,
    onEnter: () => {
      stats.forEach((s, i) => {
        const el = statsSec.value.querySelectorAll('.stat-num')[i]
        const target = s.value
        if (reduced) { el.textContent = s.prefix + target + s.suffix; return }
        const o = { v: 0 }
        gsap.to(o, {
          v: target, duration: 1.6, delay: i * 0.12, ease: 'power3.out',
          onUpdate: () => { el.textContent = s.prefix + Math.round(o.v) + s.suffix }
        })
      })
    }
  })

  /* Footer giant drift */
  if (!reduced) {
    gsap.fromTo(footGiant.value, { yPercent: 34 }, {
      yPercent: 0, ease: 'none',
      scrollTrigger: { trigger: footGiant.value, start: 'top bottom', end: 'bottom bottom', scrub: 0.5 }
    })
  }

  topBtn.value.addEventListener('click', () => lenis.scrollTo(0, { duration: 1.6 }))

  /* Custom cursor */
  if (window.matchMedia('(pointer: fine)').matches && !reduced) {
    cursorActive.value = true
    const dot = curDot.value
    const ring = curRing.value
    let mx = innerWidth / 2, my = innerHeight / 2, rx = mx, ry = my
    const move = e => { mx = e.clientX; my = e.clientY }
    window.addEventListener('pointermove', move, { passive: true })
    const loopC = () => {
      cursorRaf = requestAnimationFrame(loopC)
      rx += (mx - rx) * 0.16
      ry += (my - ry) * 0.16
      dot.style.transform = `translate(${mx}px,${my}px)`
      ring.style.transform = `translate(${rx}px,${ry}px) translate(-50%,-50%)`
    }
    loopC()
    const over = e => {
      const hot = e.target.closest('[data-cursor]')
      gsap.to(ring, { scale: hot ? 2.2 : 1, borderColor: hot ? 'rgba(217,70,239,0.8)' : 'rgba(167,139,250,0.5)', duration: 0.3 })
    }
    window.addEventListener('pointerover', over, { passive: true })
  }
})

onBeforeUnmount(() => {
  if (mm) mm.revert()
  ScrollTrigger.getAll().forEach(t => t.kill())
  gsap.ticker.remove(mqTick)
  if (cursorRaf) cancelAnimationFrame(cursorRaf)
  if (lenis) lenis.destroy()
})

const headScripts = computed(() => [
  {
    type: 'application/ld+json',
    children: JSON.stringify({
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'Rankify PDF2CBT',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'USD' }
    })
  }
])

useHead({
  title: 'Rankify — Dead paper, live exam',
  meta: [
    { name: 'description', content: 'Turn any question-paper PDF into a full computer-based mock test. AI extraction, manual diagram crops, real CBT shell — 100% in your browser.' },
    { property: 'og:title', content: 'Rankify — Dead paper, live exam' },
    { property: 'og:image', content: '/og-image.png' }
  ],
  script: headScripts
})
</script>

<style scoped>
.rk-root {
  --violet: #8b5cf6;
  --fuchsia: #d946ef;
}

.rk-hide-cursor,
.rk-hide-cursor * {
  cursor: none !important;
}

.noise-overlay {
  position: fixed;
  inset: 0;
  z-index: 90;
  pointer-events: none;
  opacity: 0.05;
  mix-blend-mode: overlay;
  background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='160' height='160'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='2'/%3E%3C/filter%3E%3Crect width='160' height='160' filter='url(%23n)'/%3E%3C/svg%3E");
}

.cur-dot,
.cur-ring {
  position: fixed;
  top: 0;
  left: 0;
  z-index: 95;
  pointer-events: none;
  display: none;
}

@media (pointer: fine) {
  .cur-dot,
  .cur-ring {
    display: block;
  }
}

.cur-dot {
  width: 6px;
  height: 6px;
  margin: -3px 0 0 -3px;
  border-radius: 9999px;
  background: #d8b4fe;
}

.cur-ring {
  width: 34px;
  height: 34px;
  border-radius: 9999px;
  border: 1px solid rgba(167, 139, 250, 0.5);
}

@keyframes flow {
  to { background-position: 200% center; }
}

.animate-flow {
  animation: flow 5s linear infinite;
}

.spot-glow {
  position: absolute;
  inset: 0;
  opacity: 0;
  transition: opacity 0.4s;
  background: radial-gradient(340px circle at var(--mx, 50%) var(--my, 50%), rgba(139, 92, 246, 0.16), transparent 65%);
  pointer-events: none;
}

.spot:hover .spot-glow {
  opacity: 1;
}

@media (prefers-reduced-motion: reduce) {
  .animate-flow {
    animation: none;
  }
}
</style>
