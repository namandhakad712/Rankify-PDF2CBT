<template>
  <div ref="root" class="nb-root">
    <div ref="progressBar" class="fixed top-0 left-0 h-[3px] w-full bg-pen origin-left scale-x-0 z-[70] pointer-events-none"></div>
    <!-- Ink trail canvas — whole page, pencil texture -->
    <canvas ref="inkCanvas" class="ink-canvas" aria-hidden="true"></canvas>
    <div class="pointer-events-none fixed inset-0 z-[90]">
      <Crosshair :container-ref="reportCardRef" fixed color="#F26D6D" />
    </div>

    <!-- ═══════════ NAV ═══════════ -->
    <header ref="navEl" class="fixed top-0 inset-x-0 z-50 -translate-y-20 opacity-0">
      <nav class="mx-auto max-w-6xl px-5">
        <div class="mt-4 flex items-center justify-between gap-2 rounded-2xl border border-ink/[0.08] bg-white/85 pl-4 lg:pl-5 pr-2.5 py-2.5 shadow-[0_2px_20px_-8px_rgba(35,32,58,0.15)] backdrop-blur-md">
          <RouterLink to="/" class="flex items-baseline gap-1.5 shrink-0">
            <span class="font-display font-bold text-lg lg:text-xl tracking-tight text-ink">Rankify</span>
            <span class="font-hand text-base lg:text-lg text-redmargin -rotate-6 inline-block">pdf→cbt</span>
          </RouterLink>
          <div class="hidden md:flex items-center gap-7 text-[15px] font-medium text-ink/60">
            <a href="#how" class="hover:text-ink transition-colors nb-anchor">{{ t('home.nav.how') }}</a>
            <a href="#features" class="hover:text-ink transition-colors nb-anchor">{{ t('home.nav.features') }}</a>
            <a href="#faq" class="hover:text-ink transition-colors nb-anchor">{{ t('home.nav.faq') }}</a>
            <RouterLink to="/about" class="hover:text-ink transition-colors">{{ t('nav.about') }}</RouterLink>
          </div>
          <div class="flex items-center gap-2 shrink-0">
            <LangSwitch />
            <RouterLink
              to="/extract"
              class="group relative inline-flex items-center gap-2 rounded-xl bg-pen px-4 lg:px-5 py-2.5 text-[14px] lg:text-[15px] font-semibold text-white transition-transform hover:-translate-y-0.5 active:translate-y-0 whitespace-nowrap min-h-[40px]"
            >
              {{ t('nav.cta') }}
              <ArrowRight class="w-4 h-4 group-hover:translate-x-0.5 transition-transform shrink-0" />
            </RouterLink>
          </div>
        </div>
      </nav>
    </header>

    <main>
      <!-- ═══════════ HERO ═══════════ -->
      <section class="paper relative pt-28 lg:pt-36 pb-16 lg:pb-20 md:pt-44 md:pb-28">
        <div class="mx-auto max-w-6xl px-5 grid grid-cols-1 lg:grid-cols-[1.1fr_0.9fr] gap-8 lg:gap-14 items-center">
          <!-- Copy -->
          <div>
            <div ref="heroBadge" class="opacity-0 inline-flex items-center gap-2 rounded-full border border-ink/10 bg-white px-4 py-1.5 text-[13px] font-semibold text-ink/70 mb-7">
              <span class="h-2 w-2 rounded-full bg-correct"></span>
              {{ t('hero.badge') }}
            </div>

            <h1 class="font-display font-extrabold tracking-[-0.03em] text-ink leading-[1.02] text-[clamp(2.7rem,6.2vw,5.2rem)]">
              <span class="block overflow-hidden"><span ref="hLine1" class="block">{{ t('hero.headline.1') }}</span></span>
              <span class="block overflow-hidden pb-2"><span ref="hLine2" class="block">{{ t('hero.headline.2a') }}
                <span class="relative inline-block whitespace-nowrap">
                  <span ref="hl1" class="hl-block absolute inset-x-[-6px] inset-y-[8%] -z-0 rounded-sm bg-hlyellow origin-left scale-x-0"></span>
                  <span data-scramble class="font-hand relative z-10 font-semibold text-[1.12em] tracking-normal">{{ t('hero.headline.2b') }}</span>
                </span>
                {{ t('hero.headline.2c') }}
              </span></span>
            </h1>

            <p ref="heroSub" class="opacity-0 mt-6 max-w-md text-[17px] leading-relaxed text-ink/60">
              {{ t('hero.sub') }}
            </p>

            <div ref="heroCtas" class="opacity-0 mt-9 flex flex-wrap items-center gap-3 lg:gap-4">
              <a href="https://www.producthunt.com/products/rankify-2?embed=true&utm_source=badge-featured&utm_medium=badge&utm_campaign=badge-rankify-3" target="_blank" rel="noopener noreferrer" class="block">
                <img alt="Rankify on Product Hunt" width="250" height="54" src="/ph-badge.svg" class="block" />
              </a>
              <a href="#how" class="nb-anchor inline-flex items-center gap-2 rounded-2xl border-2 border-ink/12 px-6 lg:px-7 py-3 lg:py-[14px] text-base font-bold text-ink/75 hover:border-ink/30 hover:text-ink transition-colors min-h-[44px]">
                {{ t('hero.cta2') }}
              </a>
              <span ref="note1" class="font-hand text-lg lg:text-xl text-ink/55 -rotate-3 opacity-0 inline-block break-words">{{ t('hero.note') }}</span>
            </div>

          </div>

          <!-- Interactive mini exam sheet -->
          <div class="relative min-w-0">
            <img src="/images/notebook/hero-stack.webp" alt="" fetchpriority="high" decoding="async" class="hidden lg:block absolute -top-10 -right-8 w-52 pointer-events-none select-none z-20" style="filter: drop-shadow(0 16px 32px rgba(35,32,58,0.15));" ref="heroFloat" />
            <img src="/images/notebook/floating-notebook-pdf.webp" alt="" loading="lazy" decoding="async" class="hidden lg:block absolute -bottom-8 -left-6 w-32 pointer-events-none select-none opacity-90 rotate-3 z-20" style="filter: drop-shadow(0 10px 20px rgba(35,32,58,0.12));" />
            <div ref="examSheet" class="relative mx-auto max-w-md rotate-[0.8deg] lg:rotate-[1.2deg] rounded-xl bg-white shadow-[0_24px_60px_-24px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.07] overflow-hidden">
              <!-- sheet margin -->
              <div class="pointer-events-none absolute inset-y-0 left-8 lg:left-11 w-px bg-redmargin/40"></div>
              <div class="px-4 lg:px-6 pl-10 lg:pl-16 pt-6 pb-7">
                <div class="flex items-center justify-between border-b border-dashed border-ink/15 pb-3">
                  <span class="font-mono text-[10px] uppercase tracking-[0.25em] text-ink/45">mock test · auto-generated</span>
                  <span class="font-mono text-[10px] font-medium text-correct">● live preview</span>
                </div>

                <p class="mt-5 font-semibold text-ink text-[15px]"><span class="font-mono text-ink/40 mr-2">Q1.</span>Acceleration of a body moving with uniform velocity is…</p>
                <div class="mt-3 space-y-2">
                  <button
                    v-for="opt in q1opts"
                    :key="opt.k"
                    class="qopt group flex w-full items-center gap-3 rounded-lg border px-3.5 py-2.5 text-left text-[15px] transition-all min-h-[44px] break-words"
                    :class="picked1 === opt.k
                      ? (opt.k === 'D' ? 'border-correct/60 bg-correct/[0.07] text-ink' : 'border-redmargin/60 bg-redmargin/[0.06] text-ink')
                      : 'border-ink/10 bg-paper hover:border-ink/25 text-ink/75'"
                    @click="picked1 = opt.k"
                  >
                    <span class="grid h-6 w-6 shrink-0 place-items-center rounded-md border text-[12px] font-bold" :class="picked1 === opt.k ? (opt.k === 'D' ? 'border-correct bg-correct text-white' : 'border-redmargin bg-redmargin text-white') : 'border-ink/20 text-ink/50'">{{ opt.k }}</span>
                    <span class="flex-1 break-words min-w-0">{{ opt.t }}</span>
                    <svg v-if="picked1 === opt.k && opt.k === 'D'" class="w-5 h-5 text-correct shrink-0 tick-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
                    <svg v-else-if="picked1 === opt.k" class="w-5 h-5 text-redmargin shrink-0 tick-pop" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
                  </button>
                </div>
                <p v-if="picked1" class="font-hand text-lg mt-2 ml-1" :class="picked1 === 'D' ? 'text-correct -rotate-2' : 'text-redmargin rotate-1'">
                  {{ picked1 === 'D' ? 'exactly! zero acceleration ✓' : 'oops — uniform velocity means a = 0!' }}
                </p>

                <p class="mt-6 font-semibold text-ink text-[15px]"><span class="font-mono text-ink/40 mr-2">Q2.</span>S.I. unit of force?</p>
                <div class="mt-3 flex gap-2">
                  <span v-for="u in ['N','J','W','Pa']" :key="u" class="rounded-lg border border-ink/10 bg-paper px-3.5 py-2 font-mono text-sm text-ink/70">{{ u }}</span>
                  <span class="font-hand text-lg text-ink/50 self-center ml-1 rotate-2">…you'll answer these for real</span>
                </div>
              </div>
            </div>

            <!-- floating doodle stickers -->
            <div ref="stk1" class="absolute -top-7 -left-3 md:-left-9 opacity-0"><svg width="54" height="54" viewBox="0 0 54 54" fill="none"><path d="M27 4l5.5 15.5L49 21l-13 10.5L40.5 48 27 38.5 13.5 48 18 31.5 5 21l16.5-1.5z" fill="#FFD84D" stroke="#23203A" stroke-width="2.5" stroke-linejoin="round" transform="rotate(-12 27 27)"/></svg></div>
            <div ref="stk2" class="absolute top-1/3 -right-3 md:-right-8 opacity-0">
              <div class="grid h-16 w-16 rotate-6 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-2xl font-bold text-redmargin bg-white/80">A+</div>
            </div>
            <div ref="stk3" class="absolute -bottom-6 left-8 opacity-0">
              <img src="/images/notebook/doodle-arrow.webp" alt="" loading="lazy" decoding="async" class="w-20 pointer-events-none select-none" style="filter: drop-shadow(0 4px 10px rgba(35,32,58,0.08));" />
            </div>
            <span ref="note2" class="absolute -bottom-9 right-2 font-hand text-xl text-pen rotate-2 opacity-0">↑ your exam, in ~40 seconds</span>
          </div>
        </div>
      </section>

      <!-- ═══════════ MARQUEE ═══════════ -->
      <section class="border-y-2 border-ink/[0.07] bg-white py-5 overflow-hidden" aria-hidden="true">
        <div ref="marqueeTrack" class="flex whitespace-nowrap will-change-transform">
          <div v-for="n in 2" :key="'mq' + n" class="flex shrink-0 items-center">
            <template v-for="(item, i) in marqueeItems" :key="'mqi' + n + i">
              <span class="font-display text-xl md:text-3xl font-bold tracking-tight text-ink/85 px-7">{{ item }}</span>
              <svg class="w-3.5 h-3.5 shrink-0" viewBox="0 0 16 16" :fill="i % 2 ? '#FF9EC0' : '#FFD84D'" stroke="#23203A" stroke-width="1"><path d="M8 1l2 4.6L15 6l-3.6 3.2L12.5 14 8 11.4 3.5 14l1.1-4.8L1 6l5-.4z"/></svg>
            </template>
          </div>
        </div>
      </section>

      <!-- ═══════════ HOW IT WORKS ═══════════ -->
      <section id="how" class="paper relative py-16 lg:py-24 md:py-32 overflow-hidden">
        <ImageTrail :items="trailImages" :threshold="70" class="z-10" />
        <div class="mx-auto max-w-6xl px-5 relative z-20">
          <div class="max-w-xl">
            <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-3">{{ t('how.instructions') }}</div>
            <h2 data-reveal class="font-display font-extrabold tracking-tight text-ink text-3xl lg:text-4xl md:text-6xl leading-[1.05] break-words">{{ t('how.headline') }}</h2>
            <p class="mt-4 font-hand text-xl lg:text-2xl text-ink/50 -rotate-1 break-words">{{ t('how.sub') }}</p>
          </div>

          <div class="mt-10 lg:mt-14 grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-7 md:gap-6">
            <div v-for="(s, i) in steps" :key="'step' + i" data-sticker-trigger class="tape-card group relative rounded-lg bg-white p-6 lg:p-7 pt-9 shadow-[0_14px_40px_-18px_rgba(35,32,58,0.28)] ring-1 ring-ink/[0.06] transition-transform duration-300 hover:-translate-y-1.5 overflow-hidden" :style="{ transform: `rotate(${s.tilt}deg)` }">
              <div class="tape" aria-hidden="true"></div>
              <div class="flex items-start justify-between">
                <span class="font-display text-5xl font-extrabold text-ink/10 group-hover:text-hlyellow transition-colors">{{ s.roman }}</span>
                <span class="grid h-12 w-12 place-items-center rounded-xl bg-paper ring-1 ring-ink/[0.08] text-ink/70" v-html="s.icon"></span>
              </div>
              <h3 class="mt-5 font-display font-bold text-ink text-2xl tracking-tight">{{ s.title }}</h3>
              <p class="mt-2.5 text-[15px] leading-relaxed text-ink/60">{{ s.desc }}</p>
              <p class="mt-4 font-hand text-xl text-pen">{{ s.note }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════ FEATURES · STICKY NOTES ═══════════ -->
      <section id="features" class="relative bg-[#F4EFE3] border-y-2 border-ink/[0.07] py-16 lg:py-24 md:py-32">
        <img src="/images/notebook/sticker-pack.webp" alt="" loading="lazy" decoding="async" class="hidden lg:block absolute -top-6 right-6 w-56 pointer-events-none select-none opacity-90 rotate-2" style="filter: drop-shadow(0 12px 24px rgba(35,32,58,0.12));" />
        <div class="mx-auto max-w-6xl px-5 relative">
          <div class="flex flex-wrap items-end justify-between gap-6">
            <div class="max-w-xl">
              <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-3">stuck to the fridge</div>
              <h2 data-reveal class="font-display font-extrabold tracking-tight text-ink text-3xl lg:text-4xl md:text-6xl leading-[1.05] break-words">Why students<br />keep it <span class="font-hand font-semibold text-[1.1em]">pinned.</span></h2>
            </div>
            <p class="font-hand text-xl lg:text-2xl text-ink/45 rotate-2 break-words">hover them, they wake up</p>
          </div>

          <div class="mt-10 lg:mt-14 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-x-7 lg:gap-y-10">
            <div
              v-for="(f, i) in features"
              :key="'feat' + i"
              data-sticker-trigger
              class="sticky-note relative rounded-[4px] p-6 pt-8 shadow-[0_16px_36px_-16px_rgba(35,32,58,0.35)] transition-all duration-300 hover:!rotate-0 hover:-translate-y-2 hover:shadow-[0_24px_48px_-16px_rgba(35,32,58,0.4)]"
              :class="f.cls"
              :style="{ transform: `rotate(${f.tilt}deg)` }"
            >
              <div class="tape" aria-hidden="true"></div>
              <ImageTrail :items="[f.sticker]" :threshold="50" />
              <div class="text-ink/75" v-html="f.icon"></div>
              <h3 class="mt-4 font-display font-bold text-ink text-xl tracking-tight">{{ f.title }}</h3>
              <p class="mt-2 text-[15px] leading-relaxed text-ink/65">{{ f.desc }}</p>
            </div>
          </div>
        </div>
      </section>

      <!-- ═══════════ NO-LIST ═══════════ -->
      <section class="paper relative py-24 md:py-36">
        <div class="mx-auto max-w-4xl px-5 text-center">
          <p class="font-hand text-3xl text-ink/50 -rotate-1 mb-6">grown-ups ask this constantly ↓</p>
          <h2 data-reveal class="font-display font-extrabold tracking-tight text-ink text-4xl md:text-6xl">{{ t('nolist.headline') }}</h2>
          <div class="mt-12 grid sm:grid-cols-2 gap-x-12 gap-y-6 text-left max-w-2xl mx-auto">
            <div v-for="(n, i) in noList" :key="'no' + i" class="flex items-center gap-4">
              <span class="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-redmargin/10">
                <svg class="w-4.5 h-4.5 text-redmargin" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
              </span>
              <span class="relative font-display font-bold text-ink/80 text-xl md:text-2xl tracking-tight">
                {{ t('nolist.' + (i+1)) }}
                <span class="strike absolute left-[-2%] top-1/2 h-[3px] w-[104%] origin-left scale-x-0 rounded bg-redmargin/80"></span>
              </span>
            </div>
          </div>
          <p class="mt-10 font-hand text-2xl text-correct rotate-1">{{ t('nolist.subtitle') }}</p>
        </div>
      </section>

      <!-- ═══════════ SYLLABUS CHECKLIST ═══════════ -->
      <section class="relative bg-white border-y-2 border-ink/[0.07] py-16 lg:py-24 md:py-32">
        <div class="mx-auto max-w-5xl px-5 grid grid-cols-1 lg:grid-cols-[0.9fr_1.1fr] gap-8 lg:gap-12 items-center">
          <div class="min-w-0">
            <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-3">coverage check</div>
            <h2 data-reveal class="font-display font-extrabold tracking-tight text-ink text-3xl lg:text-4xl md:text-6xl leading-[1.05] break-words">Every question<br />type you get <span class="relative inline-block"><span class="hl absolute inset-x-[-5px] inset-y-[14%] -z-0 rounded-sm bg-hlgreen origin-left scale-x-0"></span><span class="relative z-10">marked</span></span> on.</h2>
            <p class="mt-5 text-[15px] lg:text-[16px] leading-relaxed text-ink/60 max-w-sm break-words">School unit tests, board papers, university semesters, entrance mocks — the schema doesn't care. Text stays exactly in your language.</p>
          </div>
          <ul class="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-4">
            <li v-for="(qt, i) in qtypes" :key="'qt' + i" class="check-row flex items-center gap-3.5 border-b border-dashed border-ink/10 pb-3.5">
              <span class="check-box grid h-6 w-6 shrink-0 place-items-center rounded-md border-2 border-ink/25 bg-paper">
                <svg class="check-tick w-4 h-4 text-correct" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>
              </span>
              <span class="font-semibold text-ink/80 text-[15px]">{{ t('qtype.' + (i+1)) }}</span>
            </li>
          </ul>
        </div>
      </section>

      <!-- ═══════════ REPORT CARD ═══════════ -->
      <section class="paper relative py-16 lg:py-24 md:py-32">
        <div class="mx-auto max-w-3xl px-5">
          <div ref="reportCardRef" class="relative overflow-hidden rounded-2xl bg-white p-4 lg:p-8 md:p-12 shadow-[0_30px_70px_-30px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.07] rotate-[-0.4deg] lg:rotate-[-0.6deg]">
            <div class="flex items-center justify-between border-b-2 border-ink/10 pb-5">
              <div>
                <div class="font-mono text-[10px] uppercase tracking-[0.3em] text-ink/45">{{ t('report.term') }}</div>
                <h2 class="font-display font-extrabold text-ink text-3xl md:text-4xl tracking-tight mt-1">{{ t('report.headline') }}</h2>
              </div>
              <div class="font-hand text-2xl text-ink/40 -rotate-3 hidden sm:block">{{ t('report.subtitle') }}</div>
            </div>
            <div class="divide-y divide-dashed divide-ink/10">
              <div v-for="(r, i) in report" :key="'rc' + i" class="flex items-center gap-2 lg:gap-4 py-4 lg:py-5 min-w-0">
                <span class="font-display font-bold text-ink text-base lg:text-lg md:text-xl tracking-tight break-words min-w-0">{{ r.subject }}</span>
                <span class="flex-1 border-b border-dotted border-ink/25 mx-1 hidden sm:block"></span>
                <span class="font-mono text-xs lg:text-sm text-ink/55 tabular-nums break-words min-w-0 text-right sm:text-left flex-1 sm:flex-none">{{ r.detail }}</span>
                <span class="grade grid h-10 w-10 lg:h-11 lg:w-11 shrink-0 rotate-6 place-items-center rounded-full border-[2.5px] border-redmargin font-hand text-lg lg:text-xl font-bold text-redmargin bg-redmargin/[0.04]">{{ r.grade }}</span>
              </div>
            </div>
            <p class="mt-6 font-hand text-2xl text-pen rotate-[-1deg] text-right">{{ t('report.signature') }}: <span class="border-b-2 border-dashed border-ink/30 px-6">{{ t('report.signature.yours') }}</span></p>
          </div>
        </div>
      </section>

      <!-- ═══════════ FAQ ═══════════ -->
      <section id="faq" class="relative bg-white border-t-2 border-ink/[0.07] py-16 lg:py-24 md:py-32">
        <div class="mx-auto max-w-3xl px-5">
          <div class="text-center mb-12">
            <div class="font-mono text-[11px] uppercase tracking-[0.3em] text-ink/45 mb-3">raise your hand</div>
            <h2 data-reveal class="font-display font-extrabold tracking-tight text-ink text-3xl lg:text-4xl md:text-6xl break-words">Asked in every <span class="font-hand font-semibold text-[1.1em]">class.</span></h2>
          </div>
          <div class="divide-y divide-ink/10 border-y-2 border-ink/[0.08]">
            <div v-for="(fq, i) in faqs" :key="'fq' + i" class="group">
              <button class="flex w-full items-center justify-between gap-4 lg:gap-6 py-5 lg:py-6 text-left min-h-[44px]" :aria-expanded="openFaq === i" @click="openFaq = openFaq === i ? -1 : i">
                <span class="font-display font-bold text-ink/85 group-hover:text-ink text-base lg:text-lg md:text-xl tracking-tight transition-colors break-words min-w-0">{{ fq.q }}</span>
                <span class="grid h-10 w-10 lg:h-9 lg:w-9 shrink-0 place-items-center rounded-full border-2 border-ink/15 text-ink/60 transition-all duration-300" :class="openFaq === i ? 'rotate-45 border-pen text-pen' : ''">
                  <Plus class="w-4 h-4" />
                </span>
              </button>
              <div class="grid transition-[grid-template-rows] duration-400 ease-out" :style="{ gridTemplateRows: openFaq === i ? '1fr' : '0fr' }">
                <div class="overflow-hidden">
                  <p class="pb-7 pr-14 text-[15.5px] leading-relaxed text-ink/60">{{ fq.a }}</p>
                </div>
              </div>
            </div>
          </div>
          <p class="mt-10 text-center font-hand text-2xl text-ink/45 -rotate-1">{{ t('faq.subtitle') }}</p>
        </div>
      </section>
    </main>

    <!-- ═══════════ FOOTER ═══════════ -->
    <footer class="relative overflow-hidden bg-ink rounded-t-[2rem] lg:rounded-t-[3rem] mx-auto">
      <div class="absolute inset-0">
        <Dither :wave-speed="0" :wave-frequency="1.9" :wave-amplitude="0.26" :color-num="4" :pixel-size="2" :mouse-radius="0.3" />
      </div>
      <img src="/images/notebook/footer-doodle.webp" alt="" loading="lazy" decoding="async" class="hidden lg:block absolute right-8 -top-10 w-44 pointer-events-none select-none invert opacity-20 rotate-3" />
      <div class="mx-auto max-w-6xl px-5 pt-10 lg:pt-16 pb-8 relative z-10">
        <div class="flex flex-col md:flex-row md:items-end justify-between gap-8 lg:gap-10">
          <div class="min-w-0">
            <div class="flex items-baseline gap-2">
              <span class="font-display font-extrabold text-cream text-2xl lg:text-3xl tracking-tight">Rankify</span>
              <span class="font-hand text-lg lg:text-xl text-hlyellow -rotate-6">pdf→cbt</span>
            </div>
            <p class="mt-3 max-w-xs text-[14px] lg:text-[15px] leading-relaxed text-cream/60 break-words">{{ t('footer.subtitle') }}</p>
          </div>
          <nav class="flex flex-col items-start md:items-end gap-3 lg:gap-3.5 min-w-0" aria-label="Footer">
            <RouterLink to="/extract" class="font-display font-bold text-lg lg:text-xl tracking-tight text-cream/90 hover:text-hlyellow transition-colors min-h-[40px] flex items-center break-words">{{ t('footer.link.extract') }}</RouterLink>
            <RouterLink to="/getting-started" class="font-display font-bold text-lg lg:text-xl tracking-tight text-cream/90 hover:text-hlyellow transition-colors min-h-[40px] flex items-center break-words">{{ t('footer.link.gettingStarted') }}</RouterLink>
            <RouterLink to="/about" class="font-display font-bold text-lg lg:text-xl tracking-tight text-cream/90 hover:text-hlyellow transition-colors min-h-[40px] flex items-center break-words">{{ t('footer.link.about') }}</RouterLink>
            <RouterLink to="/privacy" class="font-display font-bold text-lg lg:text-xl tracking-tight text-cream/90 hover:text-hlyellow transition-colors min-h-[40px] flex items-center break-words">{{ t('footer.link.privacy') }}</RouterLink>
          </nav>
          <button class="relative h-32 w-32 lg:h-36 lg:w-36 md:h-40 md:w-40 shrink-0 text-cream/75 hover:text-hlyellow transition-colors min-h-[44px]" aria-label="Back to top" @click="toTop">
            <CircularText :text="t('footer.back') + '  •  ' + t('footer.back') + '  •  '" :spin-duration="14" on-hover="speedUp" class-name="w-full h-full" />
            <ArrowUp class="absolute inset-0 m-auto w-6 h-6" />
          </button>
        </div>
        <div class="mt-8 lg:mt-12 select-none text-center font-display font-extrabold leading-[0.8] tracking-[-0.04em] text-[18vw] md:text-[13rem] text-transparent break-words" style="-webkit-text-stroke: 1.5px rgba(251,248,241,0.28)" aria-hidden="true">RANKIFY</div>
        <div class="mt-8 flex flex-col sm:flex-row items-center justify-between gap-3 border-t-2 border-cream/[0.12] pt-6 font-mono text-[10px] uppercase tracking-[0.25em] text-cream/45 break-words">
          <span class="break-words">{{ t('footer.copyright') }}</span>
          <div class="flex items-center gap-4">
            <span class="font-hand text-base lg:text-lg normal-case tracking-normal text-hlyellow break-words" style="text-shadow: 0 0 14px rgba(255,216,77,0.6), 0 0 38px rgba(255,216,77,0.3);">{{ t('footer.students') }}</span>
            <a href="https://github.com/namandhakad712/Rankify-PDF2CBT" target="_blank" rel="noopener noreferrer" class="text-cream/50 hover:text-cream transition-colors" aria-label="GitHub">
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/></svg>
            </a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onBeforeUnmount, defineAsyncComponent } from 'vue'
import { RouterLink } from 'vue-router'
import { useHead } from '@vueuse/head'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText } from 'gsap/SplitText'
import { Flip } from 'gsap/Flip'
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin'
import { DrawSVGPlugin } from 'gsap/DrawSVGPlugin'
import Lenis from 'lenis'
import { ArrowRight, ArrowUp, Plus } from 'lucide-vue-next'
import { t } from '@/lib/i18n'
import CircularText from '@/components/CircularText.vue'
import LangSwitch from '@/components/LangSwitch.vue'
import ImageTrail from '@/components/ImageTrail.vue'
import Crosshair from '@/components/Crosshair.vue'

const Dither = defineAsyncComponent(() => import('@/components/Dither.vue'))

gsap.registerPlugin(ScrollTrigger, SplitText, Flip, ScrambleTextPlugin, DrawSVGPlugin)

const trailImages = [
  '/images/notebook/stickers/heart-red.webp',
  '/images/notebook/stickers/star-yellow.webp',
  '/images/notebook/stickers/plane-blue.webp',
  '/images/notebook/stickers/pencil-yellow.webp',
  '/images/notebook/stickers/aplus-red.webp',
  '/images/notebook/stickers/heart-pink.webp'
]

const openFaq = ref(-1)
const picked1 = ref('')
const q1opts = [
  { k: 'A', t: 'Equal to its velocity' },
  { k: 'B', t: 'Nine point eight m/s²' },
  { k: 'C', t: 'Depends on the mass' },
  { k: 'D', t: 'Zero' }
]

const marqueeItems = ['ANY EXAM', 'ANY LANGUAGE', 'ANY SUBJECT', 'MCQ', 'MSQ', 'NUMERIC', 'TRUE / FALSE', 'MATCH', 'PASSAGE', 'ASSERTION–REASON']

const ic = {
  upload: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m17 8-5-5-5 5"/><path d="M12 3v12"/></svg>',
  wand: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.64 3.64-1.28-1.28a1.21 1.21 0 0 0-1.72 0L2.36 18.64a1.21 1.21 0 0 0 0 1.72l1.28 1.28a1.2 1.2 0 0 0 1.72 0L21.64 5.36a1.2 1.2 0 0 0 0-1.72"/><path d="m14 7 3 3"/><path d="M5 6v4"/><path d="M19 14v4"/><path d="M10 2v2"/><path d="M7 8H3"/><path d="M21 16h-4"/><path d="M11 3H9"/></svg>',
  timer: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="13" r="8"/><path d="M12 9v4l2 2"/><path d="M9 2h6"/><path d="m19 8 1.5-1.5"/></svg>',
  lock: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="11" x="3" y="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>',
  crop: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2v14a2 2 0 0 0 2 2h14"/><path d="M18 22V8a2 2 0 0 0-2-2H2"/></svg>',
  lang: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m5 8 6 6"/><path d="m4 14 6-6 2-3"/><path d="M2 5h12"/><path d="M7 2h1"/><path d="m22 22-5-10-5 10"/><path d="M14 18h6"/></svg>',
  chart: '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v16a2 2 0 0 0 2 2h16"/><path d="M18 17V9"/><path d="M13 17V5"/><path d="M8 17v-3"/></svg>'
}

const steps = [
  { roman: 'I', tilt: -1.2, icon: ic.upload, title: t('how.step1.title'), desc: t('how.step1.desc'), note: t('how.step1.note') },
  { roman: 'II', tilt: 0.8, icon: ic.wand, title: t('how.step2.title'), desc: t('how.step2.desc'), note: t('how.step2.note') },
  { roman: 'III', tilt: -0.6, icon: ic.timer, title: t('how.step3.title'), desc: t('how.step3.desc'), note: t('how.step3.note') }
]

const features = [
  { icon: ic.lock, title: t('feat.files'), desc: t('feat.files.desc'), cls: 'bg-hlyellow', tilt: -1.6, sticker: '/images/notebook/stickers/heart-red.webp' },
  { icon: ic.crop, title: t('feat.crop'), desc: t('feat.crop.desc'), cls: 'bg-hlpink', tilt: 1.2, sticker: '/images/notebook/stickers/star-yellow.webp' },
  { icon: ic.timer, title: t('feat.real'), desc: t('feat.real.desc'), cls: 'bg-hlgreen', tilt: -0.8, sticker: '/images/notebook/stickers/plane-blue.webp' },
  { icon: ic.chart, title: t('feat.marks'), desc: t('feat.marks.desc'), cls: 'bg-hlblue', tilt: 1.4, sticker: '/images/notebook/stickers/pencil-yellow.webp' },
  { icon: ic.lang, title: t('feat.lang'), desc: t('feat.lang.desc'), cls: 'bg-hlyellow', tilt: 0.9, sticker: '/images/notebook/stickers/aplus-red.webp' },
  { icon: ic.upload, title: t('feat.install'), desc: t('feat.install.desc'), cls: 'bg-hlpink', tilt: -1.1, sticker: '/images/notebook/stickers/heart-pink.webp' }
]

const noList = ['Ads', 'Signups', 'Uploads', 'Fees', 'Tracking', 'Data selling']

const qtypes = ['MCQ — single correct', 'MSQ — multiple correct', 'Numeric answer', 'True / False', 'Fill in the blank', 'Match the following', 'Assertion – Reason', 'Passage based', 'Long answer']

const report = [
  { subject: t('report.privacy'), detail: t('report.privacy.detail'), grade: 'A+' },
  { subject: t('report.simplicity'), detail: t('report.simplicity.detail'), grade: 'A+' },
  { subject: t('report.coverage'), detail: t('report.coverage.detail'), grade: 'A' },
  { subject: t('report.price'), detail: t('report.price.detail'), grade: 'A+' }
]

const faqs = [
  { q: t('faq.q1'), a: t('faq.a1') },
  { q: t('faq.q2'), a: t('faq.a2') },
  { q: t('faq.q3'), a: t('faq.a3') },
  { q: t('faq.q4'), a: t('faq.a4') },
  { q: t('faq.q5'), a: t('faq.a5') },
  { q: t('faq.q6'), a: t('faq.a6') }
]

/* refs */
const root = ref(null)
const reportCardRef = ref(null)
const navEl = ref(null)
const progressBar = ref(null)
const inkCanvas = ref(null)
const heroBadge = ref(null)
const hLine1 = ref(null)
const hLine2 = ref(null)
const hl1 = ref(null)
const heroSub = ref(null)
const heroCtas = ref(null)
const note1 = ref(null)
const note2 = ref(null)
const examSheet = ref(null)
const heroFloat = ref(null)
const stk1 = ref(null)
const stk2 = ref(null)
const stk3 = ref(null)
const marqueeTrack = ref(null)

let lenis = null
let homeCtx = null
let tick = null
let mqTick = null
let mqX = 0
let inkRaf = 0
let inkCtx = null
let inkPts = []
const reduced = typeof window !== 'undefined' && window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches

function toTop () {
  if (lenis) lenis.scrollTo(0, { duration: 1.4 })
  else window.scrollTo({ top: 0, behavior: 'smooth' })
}

function scrambleEl(el, original) {
  if (!el || reduced) return
  gsap.killTweensOf(el)
  gsap.to(el, { duration: 0.72, scrambleText: { text: original, chars: 'upperCase', speed: 0.85, revealDelay: 0.18 }, ease: 'none', overwrite: true })
}

/* ── pencil trail — smooth, single stroke, no dots ── */
let inkNeedsClear = false
function inkLoop (now) {
  inkRaf = requestAnimationFrame(inkLoop)
  const c = inkCanvas.value
  if (!c || !inkCtx) return
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  if (c.width !== c.offsetWidth * dpr) {
    c.width = c.offsetWidth * dpr
    c.height = c.offsetHeight * dpr
    inkCtx.setTransform(dpr, 0, 0, dpr, 0, 0)
  }
  const w = c.offsetWidth, h = c.offsetHeight
  const life = 620
  inkPts = inkPts.filter(p => now - p.t < life)
  if (!inkPts.length) {
    //     // idle: one last clear once the trail expires, then the rAF loop goes quiet (GSAP skill: pause dead work)
    if (inkNeedsClear) {
      inkCtx.clearRect(0, 0, w, h)
      inkNeedsClear = false
    }
    return
  }
  inkNeedsClear = true
  // pencil texture: slightly grainy, uniform, no per-segment dots
  inkCtx.lineCap = 'round'
  inkCtx.lineJoin = 'round'
  inkCtx.strokeStyle = 'rgba(35,32,58,0.42)'
  inkCtx.lineWidth = 1.55
  inkCtx.shadowBlur = 0.6
  inkCtx.shadowColor = 'rgba(35,32,58,0.12)'
  inkCtx.beginPath()
  inkCtx.moveTo(inkPts[0].x, inkPts[0].y)
  for (let i = 1; i < inkPts.length - 1; i++) {
    const p = inkPts[i]
    const n = inkPts[i + 1]
    const mx = (p.x + n.x) / 2
    const my = (p.y + n.y) / 2
    inkCtx.quadraticCurveTo(p.x, p.y, mx, my)
  }
  const last = inkPts[inkPts.length - 1]
  inkCtx.lineTo(last.x, last.y)
  inkCtx.stroke()
  inkCtx.shadowBlur = 0
  // fade tail softly via overlay — older points naturally expire, no dotted alpha steps
}

onMounted(() => {
  homeCtx = gsap.context(() => {
  /* GSAP best practice: skip ScrollTrigger refresh on mobile browser-chrome resizes */
  ScrollTrigger.config({ ignoreMobileResize: true })
  /* Lenis */
  lenis = new Lenis({ duration: reduced ? 0 : 1.1, smoothWheel: !reduced })
  lenis.on('scroll', ScrollTrigger.update)
  tick = t => lenis.raf(t * 1000)
  gsap.ticker.add(tick)
  gsap.ticker.lagSmoothing(0)

  /* Footer grows from narrow to full width on scroll-in */
  const footerEl = root.value?.querySelector('footer')
  if (footerEl && !reduced) {
    gsap.fromTo(footerEl,
      { width: '72%' },
      {
        width: '100%',
        ease: 'none',
        scrollTrigger: { trigger: footerEl, start: 'top 98%', end: 'top 25%', scrub: 0.5 }
      }
    )
  }

  document.querySelectorAll('.nb-anchor').forEach(a => {
    a.addEventListener('click', e => {
      const id = a.getAttribute('href')
      if (id && id.startsWith('#')) {
        e.preventDefault()
        lenis.scrollTo(id, { offset: -90, duration: 1.3 })
      }
    })
  })

  /* ink trail */
  if (!reduced && window.matchMedia('(pointer: fine)').matches) {
    inkCtx = inkCanvas.value.getContext('2d')
    const howEl = document.getElementById('how')
    let last = 0
    let crossOn = false
    const inRect = (el, x, y) => {
      if (!el) return false
      const b = el.getBoundingClientRect()
      return x >= b.left && x <= b.right && y >= b.top && y <= b.bottom
    }
    window.addEventListener('pointermove', e => {
      crossOn = inRect(reportCardRef.value, e.clientX, e.clientY)
      // suppress the pencil line while the image trail (#how) or crosshair (report card) is active
      if (crossOn || inRect(howEl, e.clientX, e.clientY)) {
        if (inkPts.length) inkPts.length = 0
        return
      }
      const now = performance.now()
      if (now - last < 8) return
      last = now
      inkPts.push({ x: e.clientX, y: e.clientY, t: now })
      if (inkPts.length > 120) inkPts.shift()
    }, { passive: true })
    inkRaf = requestAnimationFrame(inkLoop)
  }

  /* marquee: base drift + scroll-velocity skew — docs: velocity via ScrollTrigger.getVelocity */
  // perf: skip the marquee ticker entirely while the section is off-screen (GSAP skill: pause off-screen work)
  let mqVisible = true
  const mqEl = marqueeTrack.value?.closest('section')
  if (mqEl && 'IntersectionObserver' in window) {
    new IntersectionObserver(es => { mqVisible = es[0].isIntersecting }, { rootMargin: '120px' }).observe(mqEl)
  }
  mqTick = () => {
    if (!mqVisible || !marqueeTrack.value) return
    const v = Math.min(Math.abs(lenis.velocity || 0), 60) / 60
    mqX -= 0.04 + v * 0.45
    if (mqX <= -50) mqX += 50
    marqueeTrack.value.style.transform = `translateX(${mqX}%) skewX(${v * 3}deg)`
  }
  gsap.ticker.add(mqTick)

  /* hero intro */
  const tl = gsap.timeline({ defaults: { ease: 'expo.out' } })
  tl.to(navEl.value, { y: 0, opacity: 1, duration: 0.9 }, 0.15)
  if (!reduced && window.innerWidth >= 768) {
    const s1 = new SplitText(hLine1.value, { type: 'chars' })
    const s2 = new SplitText(hLine2.value, { type: 'words' })
    tl.from(s1.chars, { yPercent: 115, duration: 0.9, stagger: 0.02 }, 0.1)
    tl.from(s2.words, { yPercent: 115, duration: 0.8, stagger: 0.08 }, 0.25)
  }
  tl.to(heroBadge.value, { opacity: 1, y: 0, duration: 0.6 }, 0.35)
  tl.to(heroSub.value, { opacity: 1, duration: 0.7 }, 0.5)
  tl.to(heroCtas.value, { opacity: 1, duration: 0.7 }, 0.62)
  tl.to(note1.value, { opacity: 1, x: 0, rotate: -3, duration: 0.5, ease: 'back.out(2)' }, 0.85)

  /* highlighter sweep */
  tl.to(hl1.value, { scaleX: 1, duration: 0.55, ease: 'power3.inOut' }, 0.75)
  /* exam sheet + stickers + notebook art */
  tl.from(examSheet.value, { y: 60, opacity: 0, rotate: 4, duration: 1 }, 0.4)
  if (heroFloat.value) tl.from(heroFloat.value, { y: 40, opacity: 0, rotate: -4, duration: 0.9, ease: 'power3.out' }, 0.5)
  tl.to([stk1.value, stk2.value, stk3.value], { opacity: 1, scale: 1, duration: 0.55, ease: 'back.out(2.2)', stagger: 0.12 }, 0.9)
  tl.to(note2.value, { opacity: 1, duration: 0.5 }, 1.2)
  gsap.set([stk1.value, stk2.value, stk3.value], { scale: 0.4, transformOrigin: 'center' })
  if (reduced) {
    gsap.set(hl1.value, { scaleX: 1 })
    gsap.set([heroBadge.value, heroSub.value, heroCtas.value, note1.value, note2.value, stk1.value, stk2.value, stk3.value], { opacity: 1, scale: 1 })
    gsap.set(examSheet.value, { opacity: 1 })
  }

  /* sheet + notebook art idle float */
  if (!reduced) {
    gsap.to(examSheet.value, { y: -10, rotate: 0.4, duration: 3.4, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 2 })
    if (heroFloat.value) gsap.to(heroFloat.value, { y: -8, rotate: 2, duration: 3.8, ease: 'sine.inOut', yoyo: true, repeat: -1, delay: 1.2 })
  }

  /* generic reveals */
  if (!reduced) {
    document.querySelectorAll('[data-reveal]').forEach(el => {
      const sp = new SplitText(el, { type: 'words', wordsClass: 'rv-word' })
      sp.words.forEach(w => { w.style.display = 'inline-block' })
      gsap.from(sp.words, {
        yPercent: 110, duration: 0.8, ease: 'expo.out', stagger: 0.05,
        scrollTrigger: { trigger: el, start: 'top 86%', once: true }
      })
    })
    document.querySelectorAll('.hl').forEach(el => {
      gsap.to(el, {
        scaleX: 1, duration: 0.6, ease: 'power3.inOut',
        scrollTrigger: { trigger: el.parentElement, start: 'top 80%', once: true }
      })
    })
    document.querySelectorAll('.strike').forEach((el, i) => {
      gsap.to(el, {
        scaleX: 1, duration: 0.45, ease: 'power2.inOut', delay: (i % 2) * 0.12,
        scrollTrigger: { trigger: el.closest('.grid'), start: 'top 78%', once: true }
      })
    })
    document.querySelectorAll('.check-tick').forEach((el, i) => {
      gsap.from(el, {
        scale: 0, rotation: -30, duration: 0.45, ease: 'back.out(3)', delay: (i % 4) * 0.07,
        scrollTrigger: { trigger: el.closest('ul'), start: 'top 80%', once: true }
      })
    })
  }

  /* ── micro-orchestra ── */
  // progress bar
  if (progressBar.value) {
    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: 'bottom bottom',
      scrub: 0.3,
      onUpdate: self => gsap.set(progressBar.value, { scaleX: self.progress })
    })
  }
  // nav hide on scroll down
  let lastY = window.scrollY
  ScrollTrigger.create({
    start: 'top top',
    end: 99999,
    onUpdate: self => {
      const y = self.scroll()
      const dir = y > lastY ? 1 : -1
      if (y > 120) gsap.to(navEl.value, { y: dir === 1 ? -90 : 0, duration: 0.4, ease: 'power3.out', overwrite: true })
      else gsap.to(navEl.value, { y: 0, duration: 0.4 })
      lastY = y
    }
  })
  // scramble hover
  document.querySelectorAll('[data-scramble]').forEach(el => {
    const orig = el.textContent || ''
    el.addEventListener('pointerenter', () => scrambleEl(el, orig))
  })
  // highlighter scrub (replaces once trigger with scrub)
  document.querySelectorAll('.hl').forEach(el => {
    gsap.fromTo(el, { scaleX: 0 }, {
      scaleX: 1, ease: 'none',
      scrollTrigger: { trigger: el.parentElement, start: 'top 85%', end: 'top 45%', scrub: 0.8 }
    })
  })
  // subtle batch reveal — no click bounce
  ScrollTrigger.batch('.tape-card, .sticky-note', {
    onEnter: batch => gsap.from(batch, { y: 28, opacity: 0, duration: 0.6, stagger: 0.08, ease: 'power3.out', overwrite: true }),
    start: 'top 95%',
    once: true
  })
  // bulletproof fallback: force ALL batch-animated cards visible after a short delay
  setTimeout(() => {
    document.querySelectorAll('.tape-card, .sticky-note').forEach(el => {
      gsap.killTweensOf(el)
      gsap.set(el, { opacity: 1, y: 0 })
    })
  }, 1800)


  }, root.value)
})

onBeforeUnmount(() => {
  homeCtx?.revert()
  if (tick) gsap.ticker.remove(tick)
  if (mqTick) gsap.ticker.remove(mqTick)
  cancelAnimationFrame(inkRaf)
  if (lenis) lenis.destroy()
})

useHead({
  title: 'Rankify — Any question paper. Now it\'s a real exam.',
  meta: [
    { name: 'description', content: 'Drop a PDF of any test and get a full computer-based mock exam — timer, palette, marks. Free, private, nothing uploaded.' },
    { property: 'og:title', content: 'Rankify — Dead paper, live exam' },
    { property: 'og:image', content: '/og-image.png' }
  ]
})
</script>

<style scoped>
.nb-root {
  background: #FBF8F1;
  color: #23203A;
  min-height: 100vh;
  overflow-x: clip;
}

/* ruled paper with red margin */
.paper {
  background-color: #FBF8F1;
  background-image:
    linear-gradient(90deg, transparent 0, transparent 52px, rgba(242,109,109,0.22) 52px, rgba(242,109,109,0.22) 53.5px, transparent 53.5px),
    repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(35,32,58,0.055) 35px, rgba(35,32,58,0.055) 36px);
}

@media (max-width: 640px) {
  .paper {
    background-image:
      repeating-linear-gradient(to bottom, transparent 0, transparent 35px, rgba(35,32,58,0.055) 35px, rgba(35,32,58,0.055) 36px);
  }
}

.ink-canvas {
  position: fixed;
  inset: 0;
  z-index: 80;
  pointer-events: none;
  width: 100%;
  height: 100%;
}

@media (pointer: coarse) {
  .ink-canvas { display: none; }
}

/* tape strip — washi only, no rectangle */
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

.sticky-note .tape {
  width: 190px;
  height: 50px;
  top: -22px;
}
@media (max-width: 390px) {
  .sticky-note .tape { width: 150px; height: 40px; top: -18px; }
}

/* highlighter */
.hl, .hl-block {
  z-index: 0;
}

@keyframes tickpop {
  0% { transform: scale(0) rotate(-20deg); }
  70% { transform: scale(1.25) rotate(4deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.tick-pop {
  animation: tickpop 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) both;
}

@media (prefers-reduced-motion: reduce) {
  .tick-pop { animation: none; }
}
</style>
