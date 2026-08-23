<script setup lang="ts">
import { ref } from "vue"
import { useRouter } from "vue-router"
import { useHead } from "@vueuse/head"
import { Zap, ArrowRight, ChevronsDown, UploadCloud, Cpu, FileEdit, Trophy, ShieldCheck, Image as ImageIcon, Save, Plus, BookOpen, Sparkles, FileText, ScanLine } from "lucide-vue-next"

const router = useRouter()
const activeFaq = ref<number | null>(null)
const mobileMenu = ref(false)
const toggleFaq = (i: number) => (activeFaq.value = activeFaq.value === i ? null : i)

// SEO — light port of V1 useHead C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:554 (keeps OG + JSON-LD, drops GTM/Clarity)
useHead({
  title: "Rankify PDF2CBT — Turn any PDF into a mock test",
  htmlAttrs: { lang: "en" },
  meta: [
    { name: "description", content: "Create free mock tests from any PDF instantly. Paste JSON from Gemini GEM, review & crop diagrams, take CBT, get results. No API key wall." },
    { name: "robots", content: "index, follow, max-image-preview:large" },
    { name: "theme-color", content: "#7c3aed" },
    { property: "og:type", content: "website" },
    { property: "og:title", content: "Rankify PDF2CBT — Turn any PDF into a mock test" },
    { property: "og:description", content: "Universal PDF → CBT: paste JSON from Gemini GEM → review & crop → CBT. For JEE, NEET, SSC, UPSC, GATE, any exam." },
    { property: "og:image", content: "/og-image.png" },
    { property: "og:url", content: "https://rankify.qzz.io/" },
    { name: "twitter:card", content: "summary_large_image" },
  ],
  link: [{ rel: "canonical", href: "https://rankify.qzz.io/" }, { rel: "icon", type: "image/svg+xml", href: "/favicon.svg" }],
  script: [
    { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "SoftwareApplication", name: "Rankify PDF2CBT", description: "Universal AI mock test generator — PDF → GEM JSON → Review & Crop → CBT → Results. Light Vite build.", url: "https://rankify.qzz.io", applicationCategory: "EducationalApplication", operatingSystem: "Web Browser", offers: { "@type": "Offer", price: "0", priceCurrency: "INR", availability: "https://schema.org/InStock" }, creator: { "@type": "Organization", name: "Rankify" } }) },
    { type: "application/ld+json", children: JSON.stringify({ "@context": "https://schema.org", "@type": "FAQPage", mainEntity: [{ "@type": "Question", name: "Is Rankify PDF2CBT free?", acceptedAnswer: { "@type": "Answer", text: "Yes — 100% free. Paste JSON from ishortn.ink/gemini-gem, no BYOK for primary flow." } }, { "@type": "Question", name: "Do I need an API key?", acceptedAnswer: { "@type": "Answer", text: "No for primary flow. BYOK only for fallback providers (Mistral/Groq/NVIDIA) on small PDFs." } }, { "@type": "Question", name: "Which exams are supported?", acceptedAnswer: { "@type": "Answer", text: "Universal — any exam. Subjects/topics are free strings, not JEE-locked." } }] }) },
  ],
})

const pipeline = [
  { n: "01", title: "Upload & Scan", desc: "Drop PDF <20MB. Cached locally for per-question crop.", icon: UploadCloud, mono: ["> Drag & drop PDF", "> Cached in IndexedDB", "> Paste GEM JSON"] },
  { n: "02", title: "Paste JSON", desc: "Copy JSON from GEM chat preset. Validated instantly.", icon: Cpu, mono: ["> GEM → copy JSON", "> Validate + normalize", "> Warnings ok, errors block"] },
  { n: "03", title: "Review & Crop", desc: "Edit inline. Crop diagrams per Q on pdf.js canvas.", icon: FileEdit, mono: ["> Edit que/options", "> Drag crop per Q", "> hasDiagram audit"] },
  { n: "04", title: "CBT → Results", desc: "Single shell: palette 5 states, timer, autosave.", icon: Trophy, mono: ["> Palette + Timer", "> Autosave Dexie", "> Subject bars"] },
] as const

const faqs = [
  { q: "How accurate is extraction?", a: "GEM preset via Gemini is 95%+ for text/equations. Diagrams are manual-cropped per question in Review, so 100%. Validation panel flags issues before CBT." },
  { q: "Does it support diagrams?", a: "Yes — per-question manual crop is the killer feature. PDF rendered with pdfjs-dist; drag → Crop → dataURL per question." },
  { q: "What about large / many-question PDFs?", a: "Primary GEM flow handles large PDFs (GEM does chunking). Fallback AI only for <10 Q PDFs — add a provider by copying one file in src/lib/providers/." },
  { q: "Is it free? No registration?", a: "Yes. No registration, no paywall. Light Vite SPA + single Dexie DB. Open-source." },
]
const videoId = "1jtTfavzF1c"
</script>

<template>
  <div class="min-h-screen bg-white text-zinc-900 antialiased selection:bg-violet-200">
    <!-- NAV — V1 glass nav C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:36 → no Lenis/magnetic/cursor-blob -->
    <nav class="fixed top-4 left-1/2 z-40 w-[94%] max-w-3xl -translate-x-1/2">
      <div class="flex items-center justify-between gap-2 rounded-full border border-zinc-200 bg-white/80 px-3 py-2 shadow-lg backdrop-blur-xl md:px-5 md:py-2.5">
        <a href="/" class="flex items-center gap-2 font-bold tracking-tight">
          <span class="grid size-8 place-items-center rounded-full bg-violet-600 text-white"><Zap class="size-4 fill-white" /></span>
          <span class="text-[15px] md:text-lg">Rankify <span class="text-violet-600">PDF2CBT</span></span>
          <span class="hidden rounded-full bg-zinc-900 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-white md:inline">Light</span>
        </a>
        <div class="hidden items-center gap-1 md:flex">
          <a href="#pipeline" class="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Pipeline</a>
          <a href="#features" class="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">Features</a>
          <a href="#faq" class="rounded-full px-3 py-1.5 text-sm font-medium text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900">FAQ</a>
        </div>
        <div class="flex items-center gap-2">
          <a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="hidden items-center gap-1.5 rounded-full border border-zinc-200 bg-white px-3 py-1.5 text-xs font-semibold hover:bg-zinc-50 md:inline-flex"><Sparkles class="size-3.5 text-violet-600" /> GEM</a>
          <button class="grid size-9 place-items-center rounded-full border border-zinc-200 bg-white md:hidden" aria-label="Menu" @click="mobileMenu = !mobileMenu"><Plus class="size-4 transition" :class="mobileMenu ? 'rotate-45' : ''" /></button>
          <button class="rounded-full bg-zinc-900 px-4 py-2 text-sm font-bold text-white hover:bg-black md:px-5" @click="router.push('/extract')">Get Started</button>
        </div>
      </div>
      <div v-if="mobileMenu" class="mt-2 rounded-2xl border border-zinc-200 bg-white p-2 shadow-xl md:hidden">
        <a href="#pipeline" class="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-zinc-50" @click="mobileMenu = false">Pipeline</a>
        <a href="#features" class="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-zinc-50" @click="mobileMenu = false">Features</a>
        <a href="#faq" class="block rounded-xl px-4 py-3 text-sm font-medium hover:bg-zinc-50" @click="mobileMenu = false">FAQ</a>
        <a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="block rounded-xl px-4 py-3 text-sm font-medium text-violet-600 hover:bg-violet-50">Open GEM Chat →</a>
      </div>
    </nav>

    <!-- HERO — V1 hero C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:78 : mesh-gradient + badge + CTA kept, no GSAP SplitText/Scramble -->
    <section class="relative flex min-h-[92vh] flex-col items-center justify-center overflow-hidden px-4 pb-10 pt-28">
      <div aria-hidden="true" class="pointer-events-none absolute inset-0 -z-10">
        <div class="absolute inset-0 bg-white" />
        <div class="mesh-gradient absolute inset-0 opacity-60" />
        <div class="absolute inset-0 bg-[linear-gradient(to_right,#8080800a_1px,transparent_1px),linear-gradient(to_bottom,#8080800a_1px,transparent_1px)] bg-[size:32px_32px]" />
      </div>
      <div class="mx-auto max-w-5xl text-center">
        <div class="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 text-xs font-medium text-violet-700">
          <span class="relative flex size-2"><span class="absolute inline-flex size-full animate-ping rounded-full bg-violet-400 opacity-75" /><span class="relative inline-flex size-2 rounded-full bg-violet-600" /></span>
          Universal PDF → CBT — for any exam
        </div>
        <h1 class="mx-auto mt-6 max-w-4xl text-balance text-5xl font-black tracking-tighter sm:text-6xl md:text-7xl lg:text-[84px] lg:leading-[0.9]">
          <span class="block">TRANSFORM</span>
          <span class="block bg-gradient-to-r from-violet-600 via-blue-600 to-violet-600 bg-clip-text text-transparent">STATIC PDF</span>
          <span class="block">TO ACTIVE EXAM</span>
        </h1>
        <p class="mx-auto mt-6 max-w-2xl text-pretty text-base leading-relaxed text-zinc-500 md:text-lg">
          Stop manually typing questions. Upload any question-paper PDF, paste JSON from
          <a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="font-medium text-violet-600 underline decoration-violet-300 underline-offset-4 hover:text-violet-700">Gemini GEM</a>
          preset chat, review & crop diagrams per question — launch CBT in seconds.
        </p>
        <div class="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
          <button class="group inline-flex w-full items-center justify-center gap-2 rounded-full bg-zinc-900 px-7 py-3.5 text-[15px] font-bold text-white shadow-lg transition hover:bg-black sm:w-auto" @click="router.push('/extract')">Start — Paste JSON <ArrowRight class="size-4 transition group-hover:translate-x-0.5" /></button>
          <a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="inline-flex w-full items-center justify-center gap-2 rounded-full border-2 border-zinc-900 bg-white px-7 py-3.5 text-[15px] font-bold text-zinc-900 transition hover:border-violet-600 hover:text-violet-600 sm:w-auto"><BookOpen class="size-4" /> Guide to Use</a>
        </div>
        <p class="mt-3 text-xs text-zinc-400">Primary flow: no API key needed. Fallback AI only for &lt;10 Q PDFs.</p>
      </div>
      <a href="#scanner" aria-label="Scroll to demo" class="absolute bottom-6 left-1/2 hidden -translate-x-1/2 flex-col items-center gap-1 text-zinc-400 hover:text-zinc-600 md:flex">
        <span class="text-[10px] font-semibold uppercase tracking-widest">Demo</span><ChevronsDown class="size-5 animate-bounce" />
      </a>
    </section>

    <!-- SCANNER — simplified port of V1 scanner C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:137 -->
    <!-- V1: ScrollTrigger pin + clipPath scrub + PDFScannerParticles canvas C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:1458 + scrambleText. LIGHT: CSS scanner-line keyframes, no Lenis/pin/canvas -->
    <section id="scanner" class="border-y border-zinc-200 bg-zinc-50 px-4 py-12 md:py-16">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-2xl text-center">
          <div class="inline-flex rounded-full border border-violet-200 bg-white px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-600">Demo</div>
          <h2 class="mt-3 text-3xl font-black tracking-tight md:text-4xl">Visualizing the Magic</h2>
          <p class="mt-2 text-sm text-zinc-500">Light CSS scanner — same idea as V1 without ScrollTrigger pin.</p>
        </div>
        <div class="relative mx-auto mt-8 max-w-5xl overflow-hidden rounded-[20px] border border-zinc-200 bg-white shadow-2xl shadow-zinc-200/60 md:rounded-[24px]">
          <div class="grid md:grid-cols-2">
            <div class="relative overflow-hidden bg-zinc-50 p-6 md:p-8">
              <div class="scanner-line absolute inset-x-0 top-0 z-10 h-[2px] bg-violet-600 shadow-[0_0_18px_rgba(124,58,237,0.9)]" aria-hidden="true" />
              <div class="relative mx-auto w-[220px] rotate-1 rounded-xl border border-zinc-200 bg-white p-4 shadow-lg md:w-[260px]">
                <div class="flex items-center justify-between"><div class="h-3 w-20 rounded bg-zinc-900" /><span class="rounded bg-red-500 px-1.5 py-0.5 text-[10px] font-bold text-white">PDF</span></div>
                <div class="mt-4 space-y-2"><div class="h-2 w-full rounded bg-zinc-200" /><div class="h-2 w-3/4 rounded bg-zinc-200" /><div class="h-2 w-5/6 rounded bg-zinc-200" /></div>
                <div class="mt-6 grid h-24 place-items-center rounded-lg border-2 border-dashed border-zinc-300 bg-zinc-50 text-xs text-zinc-400">Diagram — cropped in Review</div>
                <div class="mt-4 flex items-center gap-2 text-xs font-medium text-zinc-600"><ScanLine class="size-4 text-violet-600" /> Scanning…<span class="ml-auto font-mono text-[11px] text-zinc-400">page 1/12</span></div>
              </div>
              <div class="relative mt-6 flex items-center justify-center gap-2 font-mono text-xs font-medium text-zinc-500"><span class="size-2 animate-pulse rounded-full bg-emerald-500" /> Paste JSON from GEM → validates instantly</div>
            </div>
            <div class="border-t border-zinc-200 bg-white p-4 md:border-l md:border-t-0 md:p-6">
              <div class="flex items-center justify-between border-b border-zinc-100 pb-3"><div class="flex items-center gap-2 text-sm font-bold"><span class="size-2 rounded-full bg-emerald-500" /> Universal Mock Test</div><div class="rounded-full bg-zinc-900 px-2.5 py-1 font-mono text-xs font-bold text-white">29:50</div></div>
              <div class="mt-4 flex gap-3">
                <div class="flex-1 space-y-3">
                  <div class="rounded-xl border border-zinc-200 p-3 shadow-sm">
                    <div class="text-xs font-bold text-violet-600">Question 1 · MCQ</div>
                    <p class="mt-1 line-clamp-2 text-sm leading-snug">Calculate the velocity of a particle moving in a straight line… ($LaTeX$ preserved)</p>
                    <div class="mt-3 grid grid-cols-2 gap-2"><span class="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs">A. 5 m/s</span><span class="rounded-lg border border-violet-600 bg-violet-50 px-2.5 py-2 text-xs font-semibold text-violet-700">B. 10 m/s</span><span class="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs">C. 15 m/s</span><span class="rounded-lg border border-zinc-200 px-2.5 py-2 text-xs">D. 20 m/s</span></div>
                  </div>
                </div>
                <div class="hidden w-[132px] shrink-0 rounded-xl border border-zinc-200 bg-zinc-50 p-3 md:block">
                  <div class="text-xs font-bold">Palette</div>
                  <div class="mt-3 grid grid-cols-4 gap-1.5"><span class="grid size-7 place-items-center rounded bg-emerald-500 text-xs font-bold text-white">1</span><span class="grid size-7 place-items-center rounded bg-zinc-200 text-xs">2</span><span class="grid size-7 place-items-center rounded bg-zinc-200 text-xs">3</span><span class="grid size-7 place-items-center rounded bg-amber-400 text-xs font-bold text-white">4</span><span class="grid size-7 place-items-center rounded bg-zinc-300 text-xs">5</span><span class="grid size-7 place-items-center rounded bg-zinc-300 text-xs">6</span><span class="grid size-7 place-items-center rounded bg-violet-600 text-xs font-bold text-white">7</span><span class="grid size-7 place-items-center rounded bg-zinc-200 text-xs">8</span></div>
                </div>
              </div>
              <div class="mt-4 flex gap-2"><button class="flex-1 rounded-full bg-zinc-900 py-2.5 text-sm font-bold text-white hover:bg-black" @click="router.push('/extract')">Try with your PDF →</button><a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="rounded-full border border-zinc-200 bg-white px-4 py-2.5 text-sm font-bold hover:bg-zinc-50">GEM</a></div>
            </div>
          </div>
          <div class="flex flex-wrap items-center justify-between gap-2 border-t border-zinc-200 bg-zinc-900 px-4 py-3 text-xs text-zinc-300 md:px-6">
            <span class="inline-flex items-center gap-2"><FileText class="size-4 text-violet-400" /> Primary: GEM JSON paste (no key)</span><span class="font-mono text-[11px] text-zinc-400">Light — no Lenis · no canvas particles</span>
          </div>
        </div>
      </div>
    </section>

    <!-- VIDEO — V1 C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:206 kept as plain iframe, no Tilt JS -->
    <section class="border-b border-zinc-200 bg-white px-4 py-12 md:py-16">
      <div class="mx-auto max-w-4xl">
        <div class="text-center"><h2 class="text-2xl font-black tracking-tight md:text-3xl">See <span class="text-violet-600">Rankify</span> in Action</h2><p class="mt-2 text-sm text-zinc-500">Watch how GEM → paste → crop replaces manual typing</p></div>
        <div class="relative mt-6 overflow-hidden rounded-2xl border border-zinc-200 bg-zinc-900 shadow-xl">
          <div class="aspect-video w-full"><iframe class="size-full" :src="`https://www.youtube.com/embed/${videoId}?rel=0`" title="Rankify Demo" frameborder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen loading="lazy" /></div>
        </div>
      </div>
    </section>

    <!-- PIPELINE — Evervault C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:243 → grid, no horizontal scrub pin -->
    <section id="pipeline" class="bg-white px-4 py-14 md:py-16">
      <div class="mx-auto max-w-6xl">
        <div class="flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
          <div><div class="inline-flex rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-violet-700">Pipeline</div><h2 class="mt-3 text-3xl font-black tracking-tight md:text-5xl">The Rankify <span class="text-violet-600">Pipeline</span></h2><p class="mt-2 max-w-xl text-sm leading-relaxed text-zinc-500">Four steps, one light flow — without heavy horizontal scrub.</p></div>
          <button class="inline-flex items-center justify-center gap-2 self-start rounded-full bg-zinc-900 px-6 py-3 text-sm font-bold text-white hover:bg-black md:self-auto" @click="router.push('/extract')">Start Extraction <ArrowRight class="size-4" /></button>
        </div>
        <div class="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <div v-for="c in pipeline" :key="c.n" class="group relative flex flex-col overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-xl">
            <div class="absolute right-4 top-4 font-mono text-4xl font-black text-zinc-100 group-hover:text-violet-100">{{ c.n }}</div>
            <div class="relative grid size-12 place-items-center rounded-2xl bg-zinc-900 text-white group-hover:bg-violet-600"><component :is="c.icon" class="size-6" /></div>
            <h3 class="relative mt-4 text-lg font-bold tracking-tight">{{ c.title }}</h3>
            <p class="relative mt-1 text-sm leading-relaxed text-zinc-500">{{ c.desc }}</p>
            <div class="relative mt-4 space-y-1 border-t border-dashed border-zinc-200 pt-3 font-mono text-xs leading-relaxed text-zinc-500"><div v-for="line in c.mono" :key="line">{{ line }}</div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- BENTO — V1 C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:321 — no spotlight --mouse-x JS, pure CSS hover -->
    <section id="features" class="border-y border-zinc-200 bg-zinc-50 px-4 py-14 md:py-16">
      <div class="mx-auto max-w-6xl">
        <div class="mx-auto max-w-2xl text-center"><h2 class="text-3xl font-black tracking-tight md:text-5xl">Engineered for <span class="text-violet-600">Toppers</span>.</h2><p class="mt-3 text-sm text-zinc-500 md:text-base">Same ambition as V1 bento — light, no spotlight JS.</p></div>
        <div class="mt-10 grid gap-4 md:grid-cols-4">
          <div class="group flex flex-col justify-between overflow-hidden rounded-[20px] border border-zinc-200 bg-white p-7 shadow-sm transition hover:shadow-lg md:col-span-2 md:row-span-2">
            <div><div class="grid size-11 place-items-center rounded-xl bg-violet-600 text-white"><Zap class="size-5 fill-white" /></div><h3 class="mt-4 text-2xl font-black tracking-tight">Lightning Extraction</h3><p class="mt-2 text-sm leading-relaxed text-zinc-500">GEM preset extracts hundreds of Q in seconds. Paste → validate → Review. 10× faster than manual.</p></div>
            <div class="mt-8 overflow-hidden rounded-xl border border-zinc-200 bg-zinc-50 p-3"><div class="flex h-28 items-end gap-2"><div class="flex-1 rounded-t bg-violet-200 transition-all duration-700 group-hover:h-[40%]" style="height: 20%" /><div class="flex-1 rounded-t bg-violet-300 transition-all duration-700 delay-75 group-hover:h-[70%]" style="height: 40%" /><div class="flex-1 rounded-t bg-violet-600 shadow-[0_0_20px_rgba(124,58,237,0.35)] transition-all duration-700 delay-100 group-hover:h-[90%]" style="height: 60%" /><div class="flex-1 rounded-t bg-violet-400 transition-all duration-700 delay-150 group-hover:h-[55%]" style="height: 30%" /></div></div>
          </div>
          <div class="flex items-center gap-4 rounded-[20px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-lg md:col-span-2"><div class="grid size-11 shrink-0 place-items-center rounded-xl bg-emerald-50 text-emerald-600"><ShieldCheck class="size-5" /></div><div class="min-w-0 flex-1"><h3 class="font-bold">Confidence Scoring</h3><p class="mt-1 text-sm leading-relaxed text-zinc-500">Validation flags errors/warnings per field. Review only what needs attention.</p></div><div class="hidden h-2 w-24 shrink-0 overflow-hidden rounded-full bg-zinc-100 sm:block"><div class="h-full w-[95%] rounded-full bg-emerald-500" /></div></div>
          <div class="rounded-[20px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-lg"><div class="grid size-11 place-items-center rounded-xl bg-blue-50 text-blue-600"><ImageIcon class="size-5" /></div><h3 class="mt-4 font-bold">Diagram Crop</h3><p class="mt-1 text-sm leading-relaxed text-zinc-500">Per-question manual crop on pdf.js canvas. Drag → Crop → dataURL.</p></div>
          <div class="rounded-[20px] border border-zinc-200 bg-white p-6 shadow-sm transition hover:shadow-lg"><div class="grid size-11 place-items-center rounded-xl bg-amber-50 text-amber-600"><Save class="size-5" /></div><h3 class="mt-4 font-bold">Auto-Save</h3><p class="mt-1 text-sm leading-relaxed text-zinc-500">Dexie single DB + localStorage handoff. Resume anytime.</p></div>
          <div class="flex flex-col gap-6 rounded-[20px] border border-zinc-200 bg-white p-7 shadow-sm transition hover:shadow-lg md:col-span-4 md:flex-row md:items-center md:justify-between"><div class="max-w-lg"><h3 class="text-xl font-black tracking-tight md:text-2xl">Universal — not just MCQ</h3><p class="mt-2 text-sm leading-relaxed text-zinc-500">Free-form subject/topic. MCQ, MSQ, NAT, true-false, match, assertion-reason, passage, essay.</p></div><div class="flex flex-wrap gap-2"><span class="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold hover:border-violet-300 hover:bg-violet-50">MCQ</span><span class="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold hover:border-violet-300 hover:bg-violet-50">MSQ</span><span class="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold hover:border-violet-300 hover:bg-violet-50">NAT</span><span class="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold hover:border-violet-300 hover:bg-violet-50">Match</span><span class="rounded-full border border-zinc-200 bg-zinc-50 px-4 py-2 text-sm font-semibold hover:border-violet-300 hover:bg-violet-50">Passage</span></div></div>
        </div>
      </div>
    </section>

    <!-- CTA — replaces V1 heavy footer Vanta/Unicorn/CircularText C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:468 -->
    <section class="px-4 py-10">
      <div class="mx-auto max-w-6xl overflow-hidden rounded-[28px] bg-zinc-900 p-6 text-white shadow-2xl md:p-10">
        <div class="flex flex-col gap-8 md:flex-row md:items-center md:justify-between">
          <div><div class="inline-flex rounded-full bg-white/10 px-3 py-1 text-xs font-semibold">Light build · Vite + Tailwind 4 · &lt;30KB Home</div><h3 class="mt-3 text-3xl font-black tracking-tight md:text-4xl">Ready to make your<br class="hidden md:block" /> first CBT?</h3><p class="mt-2 max-w-xl text-sm leading-relaxed text-zinc-400">Open GEM, upload PDF, copy JSON, paste here. Full flow ~2 minutes.</p></div>
          <div class="flex flex-col gap-3 sm:flex-row md:flex-col lg:flex-row"><button class="inline-flex items-center justify-center gap-2 rounded-full bg-white px-7 py-3.5 text-sm font-black text-zinc-900 hover:bg-zinc-100" @click="router.push('/extract')">Paste JSON & Start <ArrowRight class="size-4" /></button><a href="https://ishortn.ink/gemini-gem" target="_blank" rel="noopener" class="inline-flex items-center justify-center gap-2 rounded-full border border-white/20 bg-white/10 px-7 py-3.5 text-sm font-bold text-white hover:bg-white/15">Open GEM Chat →</a></div>
        </div>
      </div>
    </section>

    <!-- FAQ — V1 C:\Projects\Rankify-V1\apps\shared\app\pages\index.vue:443 -->
    <section id="faq" class="border-t border-zinc-200 bg-white px-4 py-14 md:py-16">
      <div class="mx-auto max-w-3xl">
        <h2 class="text-center text-3xl font-black tracking-tight md:text-4xl">Frequently Asked Questions</h2>
        <p class="mt-2 text-center text-sm text-zinc-500">Same answers as V1, reworded for universal GEM flow.</p>
        <div class="mt-8 space-y-3">
          <div v-for="(f, i) in faqs" :key="i" class="overflow-hidden rounded-2xl border bg-white transition" :class="activeFaq === i ? 'border-violet-300 shadow-lg shadow-violet-100' : 'border-zinc-200 hover:border-zinc-300'">
            <button class="flex w-full items-center justify-between gap-6 px-6 py-5 text-left" @click="toggleFaq(i)"><span class="text-[15px] font-semibold leading-snug">{{ f.q }}</span><span class="grid size-8 shrink-0 place-items-center rounded-full border transition" :class="activeFaq === i ? 'rotate-45 border-violet-600 bg-violet-600 text-white' : 'border-zinc-200 bg-zinc-50 text-zinc-500'"><Plus class="size-4" /></span></button>
            <div class="grid transition-all duration-300" :style="{ gridTemplateRows: activeFaq === i ? '1fr' : '0fr', opacity: activeFaq === i ? '1' : '0' }"><div class="overflow-hidden"><p class="px-6 pb-6 text-sm leading-relaxed text-zinc-600">{{ f.a }}</p></div></div>
          </div>
        </div>
      </div>
    </section>

    <!-- FOOTER — light, no Vanta/Unicorn/InfiniteMenu ogl -->
    <footer class="border-t border-zinc-200 bg-zinc-50 px-4 py-10">
      <div class="mx-auto max-w-6xl flex flex-col items-center justify-between gap-6 md:flex-row">
        <div class="text-center md:text-left"><div class="inline-flex items-center gap-2 font-black tracking-tight"><span class="grid size-7 place-items-center rounded-full bg-zinc-900 text-white"><Zap class="size-3.5 fill-white" /></span>Rankify <span class="text-violet-600">PDF2CBT</span> <span class="rounded-full bg-white px-2 py-0.5 text-[10px] font-bold tracking-widest text-zinc-500 shadow">LIGHT</span></div><p class="mt-2 max-w-md text-xs leading-relaxed text-zinc-500">Universal PDF → CBT — paste JSON from GEM, crop diagrams, take CBT. Light rebuild of V1 homepage — without Lenis, GSAP suite, Unicorn, ogl.</p></div>
        <div class="flex flex-col items-center gap-3 md:items-end"><div class="flex flex-wrap justify-center gap-2 text-xs font-medium"><a href="https://github.com/namandhakad712/rankify" target="_blank" rel="noopener" class="rounded-full bg-zinc-900 px-4 py-2 text-white hover:bg-black">GitHub — V1</a><a href="https://www.producthunt.com/products/rankify-2?launch=rankify-2" target="_blank" rel="noopener" class="rounded-full border border-zinc-200 bg-white px-4 py-2 hover:bg-zinc-50">Product Hunt</a><button class="rounded-full bg-violet-600 px-4 py-2 font-bold text-white hover:bg-violet-700" @click="router.push('/extract')">/extract →</button></div><div class="text-xs text-zinc-400">© 2026 Rankify · Light Vite build · No heavy deps</div></div>
      </div>
    </footer>
  </div>
</template>

<style scoped>
.mesh-gradient {
  background:
    radial-gradient(at 15% 0%, rgba(124, 58, 237, 0.14) 0, transparent 55%),
    radial-gradient(at 55% 0%, rgba(59, 130, 246, 0.14) 0, transparent 55%),
    radial-gradient(at 85% 10%, rgba(236, 72, 153, 0.10) 0, transparent 55%),
    radial-gradient(at 50% 100%, rgba(124, 58, 237, 0.06) 0, transparent 60%);
  filter: blur(18px);
}
.scanner-line { animation: scanner-sweep 2.8s ease-in-out infinite; will-change: top; }
@keyframes scanner-sweep { 0% { top: 0 } 45% { top: calc(100% - 2px) } 55% { top: calc(100% - 2px) } 100% { top: 0 } }
@media (prefers-reduced-motion: reduce) { .scanner-line { animation: none; top: 50% } .animate-bounce { animation: none } }
</style>
