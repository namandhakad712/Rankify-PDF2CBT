// @ts-nocheck
<!--
  TODO: FUTURE ENHANCEMENTS
  - Integrate Rankify AI WebGL (Unicorn).
  - Implement Infinite Scroll Round Gallery.
  - Apply Card Decryption effect from CodePen for the "Steps" section using ScrollTrigger.
-->


<template>
  <div data-page="beta" class="min-h-screen bg-background text-foreground font-sans overflow-x-hidden md:cursor-none" style="font-family: 'Inter', sans-serif;">
    <div ref="cursorBlob" class="cursor-blob hidden md:block"></div>

    <div ref="preloader" class="fixed inset-0 z-50 bg-black flex items-center justify-center overflow-hidden">
      <!-- Animated background gradient -->
      <div class="absolute inset-0 preloader-bg"></div>
      
      <!-- Main text with Netflix-style effect -->
      <div class="relative z-10">
        <div class="text-6xl md:text-9xl font-pearl font-bold tracking-tighter">
          <div ref="preloaderText" class="preloader-text opacity-0">
            <span class="preloader-char">R</span>
            <span class="preloader-char">A</span>
            <span class="preloader-char">N</span>
            <span class="preloader-char">K</span>
            <span class="preloader-char">I</span>
            <span class="preloader-char">F</span>
            <span class="preloader-char">Y</span>
          </div>
        </div>
      </div>
      
      <!-- Glow effect -->
      <div ref="preloaderGlow" class="absolute inset-0 pointer-events-none preloader-glow"></div>
    </div>

    <nav class="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl">
      <div class="glass-nav rounded-full px-6 py-3 flex items-center justify-between shadow-lg dark:shadow-purple-900/10 transition-shadow duration-500 relative overflow-hidden">
        <div class="flex items-center gap-2 font-display font-bold text-xl tracking-tight cursor-pointer group">
          <Zap class="w-5 h-5 text-purple-500 fill-purple-500 group-hover:rotate-12 transition-transform" />
          <span class="group-hover:text-purple-500 transition-colors font-pearl text-2xl">Rankify</span>
        </div>

        <div class="hidden md:flex items-center gap-1 relative" ref="navContainer">
          <div ref="navIndicator" class="absolute bottom-0 h-1 bg-purple-500 rounded-full transition-all duration-300 ease-out opacity-0 pointer-events-none"></div>
          <RouterLink 
            v-for="(link, i) in navLinks" 
            :key="i"
            :to="link.href"
            class="nav-link relative px-4 py-2 text-sm font-medium text-gray-500 dark:text-gray-400 hover:text-foreground transition-colors cursor-pointer z-10"
            @mouseenter="moveNavIndicator"
            @mouseleave="hideNavIndicator"
          >
            {{ link.label }}
          </RouterLink>
        </div>
        <div class="flex items-center gap-3">
          <button @click="toggleTheme" class="p-2 rounded-full hover:bg-secondary transition-colors cursor-pointer relative overflow-hidden group" aria-label="Toggle Theme">
            <div class="relative z-10">
              <Sun v-if="!isDark" class="w-5 h-5 group-hover:rotate-90 transition-transform duration-500" />
              <Moon v-else class="w-5 h-5 group-hover:-rotate-12 transition-transform duration-500" />
            </div>
          </button>
          <RouterLink 
            to="/ai-extractor"
            ref="loginBtn"
            @mousemove="handleMagnetic($event, loginBtn)"
            @mouseleave="resetMagnetic(loginBtn)"
            class="magnetic-btn bg-foreground text-background px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-bold hover:scale-105 transition-transform cursor-pointer relative overflow-hidden inline-block whitespace-nowrap"
          >
            <span class="relative z-10">Get Started</span>
            <div class="absolute inset-0 bg-purple-500 opacity-0 hover:opacity-20 transition-opacity"></div>
          </RouterLink>
        </div>
      </div>
    </nav>

        <main>
          <!-- Hero Section -->
          <section class="relative min-h-screen flex flex-col justify-center items-center pt-20 overflow-hidden">
            <div class="absolute inset-0 mesh-gradient z-0" data-speed="0.5"></div>
            <div class="relative z-10 text-center px-4 max-w-5xl mx-auto">
              <div class="overflow-hidden mb-6">
                <div class="hero-badge inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-border bg-background/50 backdrop-blur-sm text-sm font-medium translate-y-[100%] opacity-0">
                  <span class="relative flex h-2 w-2">
                    <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-purple-400 opacity-75"></span>
                    <span class="relative inline-flex rounded-full h-2 w-2 bg-purple-500"></span>
                  </span>
                  AI-Powered PDF to CBT
                </div>
              </div>
              
              <h1 class="font-display text-6xl md:text-9xl font-bold tracking-tighter leading-[0.9] mb-8" data-lag="0.2">
                <div class="overflow-hidden"><span class="hero-line block translate-y-full">TRANSFORM</span></div>
                <div class="overflow-hidden"><span class="hero-line block translate-y-full bg-clip-text text-transparent bg-gradient-to-r from-purple-500 via-blue-500 to-purple-500">STATIC PDF</span></div>
                <div class="overflow-hidden relative inline-block">
                  <span class="hero-line block translate-y-full relative z-10">TO ACTIVE EXAM</span>
                </div>
              </h1>
              <p class="hero-desc text-lg md:text-xl text-gray-500 dark:text-gray-400 max-w-2xl mx-auto mb-12 opacity-0 translate-y-10" data-lag="0.1">
                Stop manually typing questions. Upload any question paper PDF and let our AI extract, format, and generate a CBT-ready mock test in seconds.
              </p>
              <div class="hero-cta opacity-0 translate-y-10 flex flex-col md:flex-row gap-4 justify-center items-center">
                <RouterLink
                  to="/ai-extractor"
                  ref="heroBtn"
                  @mousemove="handleMagnetic"
                  @mouseleave="resetMagnetic"
                  class="magnetic-btn group relative px-8 py-4 bg-foreground text-background rounded-full font-bold text-lg overflow-hidden cursor-pointer inline-block"
                >
                  <span class="relative z-10 flex items-center gap-2">
                    Start Extraction
                    <ArrowRight class="w-4 h-4 group-hover:translate-x-1 transition-transform" />
                  </span>
                  <div class="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </RouterLink>
                
                <RouterLink
                  to="/getting-started"
                  class="group relative px-8 py-4 bg-transparent border-2 border-foreground hover:border-purple-500 text-foreground hover:text-purple-500 rounded-full font-bold text-lg overflow-hidden cursor-pointer inline-block transition-all duration-300"
                >
                  <span class="relative z-10 flex items-center gap-2">
                    <BookOpen class="w-5 h-5" />
                    Guide to Use
                  </span>
                  <div class="absolute inset-0 bg-gradient-to-r from-purple-600/10 to-blue-600/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                </RouterLink>
              </div>
            </div>

            <!-- Scroll Indicator -->
            <div class="absolute bottom-10 left-1/2 -translate-x-1/2 animate-bounce opacity-50">
              <ChevronsDown class="w-6 h-6" />
            </div>
          </section>

          <!-- Pinned Scanner Section -->
          <section ref="scannerSection" class="relative h-screen bg-background z-20">
            <div class="sticky top-0 h-screen w-full flex flex-col justify-center items-center overflow-hidden">
              <div class="absolute top-24 text-center z-20">
                <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  Demo
                </div>
                <h2 class="text-4xl font-display font-bold">Visualizing the Magic</h2>
              </div>
              <div class="relative w-[90%] max-w-5xl aspect-video bg-card border border-border rounded-2xl shadow-2xl overflow-hidden scanner-container cursor-none">
                <div class="pdf-layer absolute inset-0 bg-zinc-100 dark:bg-zinc-900 p-4 md:p-8 flex flex-col items-center justify-center">
                  <div class="w-40 h-52 md:w-64 md:h-80 bg-white dark:bg-zinc-800 shadow-lg border border-border p-3 md:p-6 relative rotate-3 transition-transform duration-700 pdf-doc">
                    <div class="w-full h-3 md:h-4 bg-zinc-200 dark:bg-zinc-700 mb-2 md:mb-4 rounded"></div>
                    <div class="space-y-1 md:space-y-2">
                      <div class="w-full h-1.5 md:h-2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                      <div class="w-3/4 h-1.5 md:h-2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                      <div class="w-5/6 h-1.5 md:h-2 bg-zinc-200 dark:bg-zinc-700 rounded"></div>
                    </div>
                    <div class="mt-4 md:mt-8 w-full h-20 md:h-32 bg-zinc-100 dark:bg-zinc-900 border-2 border-dashed border-zinc-300 dark:border-zinc-700 rounded flex items-center justify-center">
                      <span class="text-[10px] md:text-xs text-zinc-400">Diagram</span>
                    </div>
                    <div class="absolute -top-2 -right-2 md:-top-3 md:-right-3 bg-red-500 text-white text-[8px] md:text-[10px] font-bold px-1.5 py-0.5 md:px-2 md:py-1 rounded shadow">PDF</div>
                  </div>
                  <p class="mt-4 md:mt-8 text-sm md:text-xl font-medium text-zinc-400 font-mono scanner-text">Scanning Document...</p>
                </div>
                <!-- Particle Canvas for Scanner Line -->
                <canvas ref="pdfScannerCanvas" class="pdf-scanner-canvas absolute top-0 left-0 w-full h-full pointer-events-none z-25"></canvas>
                <div class="scanner-line absolute top-0 left-0 w-full h-1 bg-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.8)] z-30"></div>
                <div class="quiz-layer absolute inset-0 bg-background z-20 clip-path-layer">
                  <div class="h-full w-full p-3 md:p-8 flex flex-col">
                    <div class="flex justify-between items-center mb-3 md:mb-6 border-b border-border pb-2 md:pb-4">
                      <div class="text-sm md:text-lg font-bold flex items-center gap-1.5 md:gap-2">
                        <span class="w-2 h-2 md:w-3 md:h-3 rounded-full bg-green-500"></span>
                        <span class="hidden sm:inline">JEE Mock Test 1</span>
                        <span class="sm:hidden">Mock Test 1</span>
                      </div>
                      <div class="flex gap-2 text-xs md:text-sm text-gray-500">
                        <span>29:50</span>
                      </div>
                    </div>
                    <div class="flex gap-2 md:gap-6 h-full overflow-hidden">
                      <div class="flex-1 space-y-2 md:space-y-6 overflow-y-auto">
                        <div class="p-2.5 md:p-4 bg-card border border-border rounded-lg shadow-sm">
                          <span class="text-[10px] md:text-sm text-purple-500 font-bold mb-1 md:mb-2 block">Question 1</span>
                          <p class="text-xs md:text-lg mb-2 md:mb-4 line-clamp-1 md:line-clamp-none">Calculate the velocity of a particle moving in a straight line...</p>
                          <div class="grid grid-cols-2 gap-1.5 md:gap-3">
                            <button class="p-1.5 md:p-3 text-[10px] md:text-base text-left rounded border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-none">A. 5 m/s</button>
                            <button class="p-1.5 md:p-3 text-[10px] md:text-base text-left rounded border border-purple-500 bg-purple-500/10 transition cursor-none">B. 10 m/s</button>
                            <button class="p-1.5 md:p-3 text-[10px] md:text-base text-left rounded border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-none">C. 15 m/s</button>
                            <button class="p-1.5 md:p-3 text-[10px] md:text-base text-left rounded border border-border hover:bg-zinc-100 dark:hover:bg-zinc-800 transition cursor-none">D. 20 m/s</button>
                          </div>
                        </div>
                      </div>
                      <div class="w-12 md:w-64 bg-card border border-border rounded-lg p-1.5 md:p-4">
                        <div class="text-[10px] md:text-sm font-bold mb-2 md:mb-4 hidden md:block">Question Palette</div>
                        <div class="grid grid-cols-1 md:grid-cols-5 gap-1.5 md:gap-2">
                          <div class="w-8 h-8 md:w-8 md:h-8 rounded bg-green-500 text-white flex items-center justify-center text-[10px] md:text-xs">1</div>
                          <div class="w-8 h-8 md:w-8 md:h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] md:text-xs">2</div>
                          <div class="w-8 h-8 md:w-8 md:h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] md:text-xs">3</div>
                          <div class="w-8 h-8 md:w-8 md:h-8 rounded bg-zinc-200 dark:bg-zinc-800 flex items-center justify-center text-[10px] md:text-xs">4</div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- YouTube Video Section with TiltedCard Effect -->
          <section class="py-16 md:py-24 px-4 bg-background border-t border-border z-10">
            <div class="max-w-4xl mx-auto">
              <div class="text-center mb-8">
                <h2 class="text-3xl md:text-4xl font-display font-bold mb-4">
                  See <span class="text-purple-500">Rankify</span> in Action
                </h2>
                <p class="text-gray-500">Watch how our AI transforms PDFs into interactive mock tests</p>
              </div>
              
              <!-- Video Container with Subtle Tilt Effect -->
              <div 
                class="relative w-full aspect-video rounded-2xl overflow-hidden cursor-pointer group"
                @mousemove="handleVideoTilt($event)"
                @mouseleave="resetVideoTilt"
                ref="videoContainerRef"
              >
                <!-- YouTube Iframe with native controls -->
                <iframe
                  class="w-full h-full"
                  src="https://www.youtube.com/embed/1jtTfavzF1c?rel=0"
                  title="Rankify Demo Video"
                  frameborder="0"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
                  allowfullscreen
                ></iframe>
                
                <!-- Crystal Glass Play Button on Hover -->
                <div class="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
                  <div class="w-20 h-20 rounded-full glass-button flex items-center justify-center pointer-events-auto">
                    <Play class="w-10 h-10 text-white ml-1" fill="currentColor" />
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- EVERVAULT SCANNER SECTION -->
          <section ref="evervaultSection" id="evervault-section" class="h-screen bg-background relative overflow-hidden z-10">
            <div class="absolute top-24 md:top-32 left-8 md:left-20 z-30 max-w-sm transition-all duration-300 ease-out">
              <h2 class="text-4xl md:text-6xl font-display font-bold leading-tight transition-opacity duration-500 ease-out">
                The Rankify <br><span class="text-purple-500">Pipeline</span>
              </h2>
              <p class="text-gray-500 mt-4 transition-opacity duration-500 ease-out">Scroll to process the cards.</p>
            </div>
              
              <EvervaultScanner :cards="pipelineCards">
              <template #card-0="{ index }">
                <div class="glass-card-lg p-8 md:p-8 p-5 rounded-3xl w-full h-full relative z-10 flex flex-col justify-center">
                  <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                    <UploadCloud class="w-6 h-6 md:w-8 md:h-8 text-current opacity-70" />
                  </div>
                  <div class="text-3xl md:text-5xl font-display font-bold opacity-10 absolute top-3 right-4 md:top-4 md:right-6">01</div>
                  <h3 class="text-lg md:text-2xl font-bold mb-2 md:mb-4">Upload & Scan</h3>
                  <p class="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed font-mono">
                    > Drag & drop PDF question paper.<br>
                    > Engine digitizes layout.<br>
                    > Send to AI: Raw Data Stream.
                  </p>
                </div>
              </template>
              
              <template #card-1="{ index }">
                <div class="glass-card-lg p-5 md:p-8 rounded-3xl w-full h-full relative z-10 flex flex-col justify-center">
                  <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                    <Cpu class="w-6 h-6 md:w-8 md:h-8 text-current opacity-70" />
                  </div>
                  <div class="text-3xl md:text-5xl font-display font-bold opacity-10 absolute top-3 right-4 md:top-4 md:right-6">02</div>
                  <h3 class="text-lg md:text-2xl font-bold mb-2 md:mb-4">AI Extraction</h3>
                  <p class="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed font-mono">
                    > Identifying: Questions, Options.<br>
                    > Identifying: Equations, Diagrams.<br>
                    > Precision: 99.5%
                  </p>
                </div>
              </template>
              
              <template #card-2="{ index }">
                <div class="glass-card-lg p-5 md:p-8 rounded-3xl w-full h-full relative z-10 flex flex-col justify-center">
                  <div class="w-12 h-12 md:w-16 md:h-16 rounded-2xl flex items-center justify-center mb-4 md:mb-6">
                    <FileEdit class="w-6 h-6 md:w-8 md:h-8 text-current opacity-70" />
                  </div>
                  <div class="text-3xl md:text-5xl font-display font-bold opacity-10 absolute top-3 right-4 md:top-4 md:right-6">03</div>
                  <h3 class="text-lg md:text-2xl font-bold mb-2 md:mb-4">Review Interface</h3>
                  <p class="text-gray-600 dark:text-gray-400 text-xs md:text-sm leading-relaxed font-mono">
                    > Reviewing: Questions, Options.<br>
                    > Adjusting: Diagram Croppings.<br>
                    > Status: Ready for Publish.
                  </p>
                </div>
              </template>
              
              <template #card-3="{ index }">
                <div class="glass-card-lg p-6 md:p-10 rounded-3xl w-full h-full relative z-10 flex flex-col justify-center items-center">
                  <div class="w-14 h-14 md:w-20 md:h-20 rounded-full flex items-center justify-center mb-4 md:mb-6">
                    <Trophy class="w-7 h-7 md:w-10 md:h-10 text-current opacity-70 fill-current" />
                  </div>
                  <div class="text-center">
                    <h3 class="text-xl md:text-3xl font-bold mb-3 md:mb-4">Ready to Rank</h3>
                    <p class="text-gray-600 dark:text-gray-400 text-xs md:text-base font-mono mb-4 md:mb-6">
                      > Test Generated Successfully.<br>
                      > Launching CBT Interface...
                    </p>
                    <RouterLink 
                      to="/ai-extractor"
                      class="inline-block px-6 py-2 md:px-8 md:py-3 bg-black/80 text-white text-sm md:text-base font-bold rounded-full hover:scale-105 transition-transform font-sans backdrop-blur-sm"
                    >
                      Launch Test
                    </RouterLink>
                  </div>
                </div>
              </template>
            </EvervaultScanner>
          </section>

          <!-- Bento Grid Features (Updated to Frost Glass) -->
          <section id="features-section" class="py-32 px-4 bg-background border-t border-border z-10">
            <div class="max-w-6xl mx-auto">
              <div class="text-center mb-20">
                <h2 class="text-4xl md:text-6xl font-display font-bold mb-6">Engineered for <span class="text-purple-500">Toppers</span>.</h2>
                <p class="text-xl text-gray-500 max-w-2xl mx-auto">Features that match your ambition.</p>
              </div>
              <div class="grid grid-cols-1 md:grid-cols-4 gap-6">
                <!-- Cards use .spotlight-card now without solid bg colors -->
                <div class="col-span-1 md:col-span-2 row-span-2 spotlight-card rounded-3xl p-10 flex flex-col justify-between group" @mousemove="handleSpotlight">
                  <div>
                    <div class="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center mb-6">
                      <Zap class="text-purple-500" />
                    </div>
                    <h3 class="text-3xl font-bold mb-3">Lightning Extraction</h3>
                    <p class="text-gray-500 text-lg">Extracts hundreds of questions in seconds. 10x faster than manual typing.</p>
                  </div>
                  <div class="mt-10 w-full bg-zinc-100/10 dark:bg-zinc-900/30 h-48 rounded-xl overflow-hidden relative border border-white/10">
                    <div class="absolute bottom-0 left-0 w-full flex items-end justify-between px-8 pb-8 gap-4 h-full">
                      <div class="w-full bg-purple-500/20 h-[20%] rounded-t transition-all duration-1000 group-hover:h-[40%]"></div>
                      <div class="w-full bg-purple-500/40 h-[40%] rounded-t transition-all duration-1000 delay-100 group-hover:h-[70%]"></div>
                      <div class="w-full bg-purple-500 h-[60%] rounded-t transition-all duration-1000 delay-200 group-hover:h-[90%] shadow-[0_0_20px_rgba(168,85,247,0.5)]"></div>
                    </div>
                  </div>
                </div>
                
                <div class="col-span-1 md:col-span-2 spotlight-card rounded-3xl p-8 group flex flex-col md:flex-row gap-6 items-center" @mousemove="handleSpotlight">
                  <div class="flex-1">
                    <div class="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center mb-4">
                      <ShieldCheck class="text-green-500" />
                    </div>
                    <h3 class="text-xl font-bold mb-2">Confidence Scoring</h3>
                    <p class="text-gray-500">Every extracted question gets a score (1-5). Review only what needs attention.</p>
                  </div>
                  <div class="w-full md:w-1/3 h-2 bg-zinc-200 dark:bg-zinc-800 rounded-full overflow-hidden">
                    <div class="h-full bg-green-500 w-[95%]"></div>
                  </div>
                </div>
                
                <div class="col-span-1 spotlight-card rounded-3xl p-8 group" @mousemove="handleSpotlight">
                  <div class="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center mb-6">
                    <Image class="text-blue-500" />
                  </div>
                  <h3 class="text-xl font-bold mb-2">Diagram Detection</h3>
                  <p class="text-gray-500">Automatically identifies figures and maps them to questions.</p>
                </div>
                
                <div class="col-span-1 spotlight-card rounded-3xl p-8 group" @mousemove="handleSpotlight">
                  <div class="w-12 h-12 rounded-xl bg-orange-500/10 flex items-center justify-center mb-6">
                    <Save class="text-orange-500" />
                  </div>
                  <h3 class="text-xl font-bold mb-2">Auto-Save</h3>
                  <p class="text-gray-500">Progress saved automatically. Resume anytime without data loss.</p>
                </div>

                <div class="col-span-1 md:col-span-4 spotlight-card rounded-3xl p-10 flex flex-col md:flex-row items-center justify-between gap-8 group" @mousemove="handleSpotlight">
                  <div class="max-w-lg">
                    <h3 class="text-3xl font-bold mb-3">Multi-Type Support</h3>
                    <p class="text-gray-500 text-lg">Rankify isn't just for MCQs. We support the full spectrum of competitive exam formats.</p>
                  </div>
                  <div class="flex flex-wrap gap-4">
                    <span class="px-6 py-3 rounded-full border border-white/10 bg-white/5 font-medium hover:border-purple-500 transition-colors">MCQ</span>
                    <span class="px-6 py-3 rounded-full border border-white/10 bg-white/5 font-medium hover:border-purple-500 transition-colors">MSQ</span>
                    <span class="px-6 py-3 rounded-full border border-white/10 bg-white/5 font-medium hover:border-purple-500 transition-colors">NAT</span>
                    <span class="px-6 py-3 rounded-full border border-white/10 bg-white/5 font-medium hover:border-purple-500 transition-colors">Match Columns</span>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Use Cases with InfiniteMenu - Full Width -->
          <section ref="infiniteMenuSection" id="infinite-menu-section" class="py-16 md:py-24 px-4 bg-background border-t border-border z-10 overflow-hidden">
            <div class="max-w-7xl mx-auto">
              <div class="text-center mb-12 md:mb-16" ref="infiniteMenuHeader">
                <div class="inline-block px-3 py-1 mb-4 text-xs font-semibold tracking-wider uppercase rounded-full bg-purple-500/10 text-purple-500 border border-purple-500/20">
                  Use Cases
                </div>
                <h2 class="text-3xl md:text-5xl font-display font-bold mb-4">
                  Perfect For <span class="text-purple-500">Every Student</span>
                </h2>
                <p class="text-xl text-gray-500 max-w-2xl mx-auto">
                  Drag to explore how Rankify helps students succeed
                </p>
              </div>
              
              <div ref="infiniteMenuContainer" class="relative w-full h-[600px] sm:h-[700px] lg:h-[800px] rounded-3xl overflow-hidden">
                <!-- Progressive Blur Overlay -->
                <div class="absolute inset-0 pointer-events-none z-10" style="
                  mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, black 100%);
                  -webkit-mask-image: radial-gradient(ellipse 70% 60% at 50% 50%, transparent 40%, black 100%);
                  backdrop-filter: blur(0px);
                ">
                  <div class="absolute inset-0 backdrop-blur-[2px]" style="
                    mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, transparent 50%, black 100%);
                    -webkit-mask-image: radial-gradient(ellipse 75% 65% at 50% 50%, transparent 50%, black 100%);
                  "></div>
                  <div class="absolute inset-0 backdrop-blur-[4px]" style="
                    mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, transparent 60%, black 100%);
                    -webkit-mask-image: radial-gradient(ellipse 80% 70% at 50% 50%, transparent 60%, black 100%);
                  "></div>
                  <div class="absolute inset-0 backdrop-blur-[8px]" style="
                    mask-image: radial-gradient(ellipse 85% 75% at 50% 50%, transparent 70%, black 100%);
                    -webkit-mask-image: radial-gradient(ellipse 85% 75% at 50% 50%, transparent 70%, black 100%);
                  "></div>
                  <div class="absolute inset-0 backdrop-blur-[12px]" style="
                    mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, transparent 80%, black 100%);
                    -webkit-mask-image: radial-gradient(ellipse 90% 80% at 50% 50%, transparent 80%, black 100%);
                  "></div>
                  <div class="absolute inset-0 backdrop-blur-[16px]" style="
                    mask-image: radial-gradient(ellipse 95% 85% at 50% 50%, transparent 85%, black 100%);
                    -webkit-mask-image: radial-gradient(ellipse 95% 85% at 50% 50%, transparent 85%, black 100%);
                  "></div>
                </div>
                
                <!-- InfiniteMenu Component -->
                <ClientOnly>
                  <InfiniteMenu :items="useCaseItems" />
                </ClientOnly>
              </div>
            </div>
          </section>

          <!-- FAQ Section -->
          <section id="faq-section" class="py-32 px-4 bg-background border-t border-border z-10">
            <div class="max-w-3xl mx-auto">
              <h2 class="text-3xl md:text-5xl font-display font-bold mb-12 text-center">Frequently Asked Questions</h2>

              <div class="space-y-4">
                <div v-for="(faq, index) in faqs" :key="index" class="border border-border rounded-2xl overflow-hidden bg-card transition-all duration-300 hover:border-purple-500/50">
                  <button @click="toggleFaq(index)" class="w-full px-8 py-6 text-left flex justify-between items-center focus:outline-none cursor-pointer">
                    <span class="text-lg font-medium pr-8">{{ faq.question }}</span>
                    <div class="flex-shrink-0 transition-transform duration-300" :class="{ 'rotate-45': activeFaq === index }">
                      <Plus class="w-6 h-6 text-purple-500" />
                    </div>
                  </button>
                  <div
                    class="overflow-hidden transition-all duration-300 ease-in-out"
                    :style="{ maxHeight: activeFaq === index ? '200px' : '0px', opacity: activeFaq === index ? 1 : 0 }"
                  >
                    <p class="px-8 pb-8 text-gray-500 leading-relaxed">{{ faq.answer }}</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          <!-- Big Footer -->
          <section ref="footerSection" class="relative min-h-[80vh] flex flex-col justify-center items-center border-t border-border bg-background z-10 rounded-t-[3rem] md:rounded-t-[4rem]" style="transform-origin: center top; overflow: hidden;">
            <!-- Vanta.js Fog Background -->
            <div ref="footerBg" class="absolute inset-0 z-0"></div>
            
            <!-- Circular Text - Top Right Corner (Arc Only) -->
            <ClientOnly>
              <div class="absolute -top-16 -right-16 z-40 hidden md:block" style="transform: rotate(180deg);">
                <CircularText
                  text="LET'S✦VISUALIZE✦TESTS✦"
                  :spin-duration="20"
                  on-hover="speedUp"
                  class-name="text-white"
                />
              </div>
            </ClientOnly>
            
            <!-- Animated Text Layer -->
            <div ref="footerTextLayer" class="absolute inset-0 flex flex-col justify-center items-center z-20">
              <div class="text-center">
                <p class="mb-6 text-xl text-gray-500">Ready to upgrade your prep?</p>
                <h2 ref="footerText" class="text-[15vw] font-pearl font-bold tracking-tighter leading-none transition-transform duration-300 hover:scale-105 cursor-pointer">
                  RANKIFY
                </h2>
                <RouterLink
                  to="/ai-extractor"
                  class="inline-block mt-12 px-10 py-5 bg-foreground text-background text-xl font-bold rounded-full hover:scale-110 transition-transform duration-300 shadow-2xl cursor-pointer"
                >
                  Get Started Free
                </RouterLink>
              </div>
            </div>

            <!-- Unicorn Studio WebGL Layer (Hidden Initially) -->
            <div ref="unicornLayer" class="absolute inset-0 z-10 opacity-0">
              <div
                data-us-project="si22gkrEOucORX2Vxrz4?update=2.0.1"
                data-us-scale="1.2"
                data-us-dpi="2"
                data-us-lazyload="false"
                data-us-production="true"
                data-us-alttext="Rankify AI-Powered PDF to CBT Animation"
                data-us-arialabel="Interactive footer animation showcasing Rankify's AI capabilities"
                class="unicorn-embed"
                style="width: 100%; height: 100%;"
              ></div>
            </div>

            <!-- Footer Links -->
            <div class="absolute bottom-6 sm:bottom-10 w-full px-4 sm:px-10 z-30">
              <div class="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0 text-xs sm:text-sm text-white">
                <div class="text-center sm:text-left">© 2026 Rankify AI.</div>
                <div class="flex flex-col sm:flex-row gap-3 sm:gap-6 text-center">
                  <a href="https://www.producthunt.com/products/rankify-2?launch=rankify-2" target="_blank" rel="noopener noreferrer" class="hover:text-purple-400 cursor-pointer transition-colors">Product Hunt</a>
                  <a href="https://github.com/namandhakad712/rankify" target="_blank" rel="noopener noreferrer" class="hover:text-purple-400 cursor-pointer transition-colors">Github</a>
                  <RouterLink to="/about" class="hover:text-purple-400 cursor-pointer transition-colors">About</RouterLink>
                  <RouterLink to="/getting-started" class="hover:text-purple-400 cursor-pointer transition-colors">Guide</RouterLink>
                  <RouterLink to="/privacy" class="hover:text-purple-400 cursor-pointer transition-colors">Privacy</RouterLink>
                </div>
              </div>
            </div>
          </section>
        </main>
  </div>
</template>

<script setup lang="ts">
// @ts-nocheck
import { ref, onMounted, onBeforeMount, onUnmounted, nextTick, defineComponent } from 'vue';
import { RouterLink } from 'vue-router';
import { useHead } from '@vueuse/head';
import { Zap, ArrowRight, ChevronsDown, UploadCloud, Cpu, FileEdit, Trophy, ShieldCheck, Image, Save, Plus, Sun, Moon, BookOpen, Play, Pause, X, Volume2, VolumeX } from 'lucide-vue-next';
import gsap from 'gsap';
import CircularText from '@/components/CircularText.vue';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { TextPlugin } from 'gsap/TextPlugin';
import { SplitText } from 'gsap/SplitText';
import { ScrambleTextPlugin } from 'gsap/ScrambleTextPlugin';
// MorphSVGPlugin is Club GreenSock paid — not in free gsap, mock
let MorphSVGPlugin = null;
import { Flip } from 'gsap/Flip';
import Lenis from 'lenis';
import EvervaultScanner from '@/components/EvervaultScanner.vue';
import InfiniteMenu from '@/components/InfiniteMenu.vue';

// Nuxt ClientOnly mock — renders slot directly in Vite
const ClientOnly = defineComponent({ setup(_, { slots }) { return () => slots.default?.() } });

// Nuxt definePageMeta mock — no-op in Vite
const definePageMeta = (_: unknown) => {};
definePageMeta({
  layout: false
});



useHead({
  title: 'Rankify - Free JEE NEET Mock Test Generator',
  titleTemplate: '%s',
  htmlAttrs: {
    lang: 'en'
  },
  meta: [
    // Primary Meta Tags
    {
      name: 'title',
      content: 'Free JEE NEET Mock Test Generator | AI-Powered Online CBT'
    },
    {
      name: 'description',
      content: 'Create free JEE Main, NEET mock tests from PDF instantly. AI-powered online CBT interface with auto-grading. No registration required. 100% free. '
    },
    {
      name: 'keywords',
      content: 'free jee mock test, free neet mock test, free online cbt, jee main mock test free, neet practice test free, free mock test generator, online cbt free, jee mock test online free, neet online test free, free competitive exam mock test, jee advanced mock test free, free test series jee, free neet test series, ai mock test free, pdf to mock test free, free cbt interface, jee main 2026 free mock test, neet 2026 free mock test, free exam simulator, online mock test free, free jee preparation, free neet preparation'
    },
    {
      name: 'author',
      content: 'Rankify'
    },
    {
      name: 'robots',
      content: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1'
    },
    {
      name: 'language',
      content: 'English'
    },
    {
      name: 'geo.region',
      content: 'IN'
    },
    {
      name: 'geo.country',
      content: 'India'
    },
    {
      name: 'geo.placename',
      content: 'India'
    },
    {
      name: 'revisit-after',
      content: '3 days'
    },
    {
      name: 'category',
      content: 'Educational Technology, Exam Preparation, Competitive Exams'
    },
    {
      name: 'classification',
      content: 'Education, JEE Preparation, NEET Preparation, Mock Tests'
    },
    {
      name: 'rating',
      content: 'General'
    },
    {
      name: 'distribution',
      content: 'Global'
    },
    {
      name: 'coverage',
      content: 'Worldwide'
    },
    {
      name: 'target',
      content: 'JEE aspirants, NEET students, competitive exam candidates'
    },

    // Open Graph Meta Tags (for Facebook, LinkedIn, WhatsApp)
    {
      property: 'og:type',
      content: 'website'
    },
    {
      property: 'og:url',
      content: 'https://rankify.qzz.io/'
    },
    {
      property: 'og:title',
      content: 'Free JEE NEET Mock Test Generator | AI-Powered Online CBT'
    },
    {
      property: 'og:description',
      content: 'Create unlimited free mock tests for JEE Main, NEET from PDF. AI-powered online CBT interface. No registration. 100% free. '
    },
    {
      property: 'og:image',
      content: 'https://rankify.qzz.io/og-image.png'
    },
    {
      property: 'og:image:width',
      content: '1200'
    },
    {
      property: 'og:image:height',
      content: '630'
    },
    {
      property: 'og:site_name',
      content: 'Rankify'
    },
    {
      property: 'og:locale',
      content: 'en_IN'
    },

    // Twitter Card Meta Tags
    {
      name: 'twitter:card',
      content: 'summary_large_image'
    },
    {
      name: 'twitter:url',
      content: 'https://rankify.qzz.io/'
    },
    {
      name: 'twitter:title',
      content: 'Rankify - AI Mock Test Generator for JEE NEET'
    },
    {
      name: 'twitter:description',
      content: 'Create AI-powered mock tests from PDF for JEE Main, NEET, and competitive exams. Convert question papers to online tests instantly.'
    },
    {
      name: 'twitter:image',
      content: 'https://rankify.qzz.io/og-image.webp'
    },

    // Additional SEO Meta Tags
    {
      name: 'viewport',
      content: 'width=device-width, initial-scale=1.0'
    },
    {
      name: 'format-detection',
      content: 'telephone=no'
    },
    {
      name: 'theme-color',
      content: '#2563eb'
    },
    {
      name: 'msapplication-TileColor',
      content: '#2563eb'
    },
    {
      name: 'msapplication-config',
      content: '/browserconfig.xml'
    },

    // Educational Meta Tags
    {
      name: 'education:subject',
      content: 'JEE Main, NEET, Physics, Chemistry, Mathematics, Biology'
    },
    {
      name: 'education:level',
      content: 'Higher Education, Entrance Exam Preparation'
    },
    {
      name: 'education:type',
      content: 'Mock Tests, Practice Questions, Online Learning'
    },
    {
      name: 'education:course',
      content: 'JEE Main Preparation, NEET Preparation, Engineering Entrance, Medical Entrance, UPSC Preparation, SSC Preparation'
    },

    // Article Meta Tags
    {
      name: 'article:author',
      content: 'Rankify Team'
    },
    {
      name: 'article:publisher',
      content: 'https://rankify.qzz.io'
    },
    {
      name: 'article:section',
      content: 'JEE NEET Preparation'
    },
    {
      name: 'article:tag',
      content: 'JEE Mock Test'
    },
    {
      name: 'article:tag',
      content: 'NEET Mock Test'
    },
    {
      name: 'article:tag',
      content: 'NTA Mock Test'
    },
    {
      name: 'article:tag',
      content: 'AI Learning'
    },
    {
      name: 'article:tag',
      content: 'Mock Question Generator'
    },

    // Product Meta Tags
    {
      name: 'product:price:amount',
      content: '0'
    },
    {
      name: 'product:price:currency',
      content: 'INR'
    },
    {
      name: 'product:availability',
      content: 'in stock'
    },
    {
      name: 'product:condition',
      content: 'new'
    },
    {
      name: 'product:retailer',
      content: 'Rankify'
    },
    {
      name: 'product:brand',
      content: 'Rankify'
    },
    {
      name: 'product:model',
      content: 'AI Mock Test Generator'
    },
    {
      name: 'product:category',
      content: 'Educational Software'
    }
  ],
  link: [
    // Preconnect to external domains for faster loading
    { rel: 'preconnect', href: 'https://www.googletagmanager.com' },
    { rel: 'preconnect', href: 'https://cdn.jsdelivr.net' },
    { rel: 'preconnect', href: 'https://assets.unicorn.studio' },
    { rel: 'preconnect', href: 'https://scripts.clarity.ms' },
    { rel: 'dns-prefetch', href: 'https://www.google-analytics.com' },
    
    // Canonical URL
    {
      rel: 'canonical',
      href: 'https://rankify.qzz.io/'
    },

    // Favicon and Icons
    {
      rel: 'icon',
      type: 'image/x-icon',
      href: '/favicon.ico'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '32x32',
      href: '/favicon-32x32.png'
    },
    {
      rel: 'icon',
      type: 'image/png',
      sizes: '16x16',
      href: '/favicon-16x16.png'
    },
    {
      rel: 'apple-touch-icon',
      sizes: '180x180',
      href: '/apple-touch-icon.png'
    },
    {
      rel: 'manifest',
      href: '/site.webmanifest'
    },

    // Preconnect to external domains
    {
      rel: 'preconnect',
      href: 'https://fonts.googleapis.com'
    },
    {
      rel: 'preconnect',
      href: 'https://fonts.gstatic.com',
      crossorigin: ''
    },

    // Alternate language versions (if applicable)
    {
      rel: 'alternate',
      hreflang: 'en',
      href: 'https://rankify.qzz.io/'
    }
  ],
  style: [
    {
      children: `
        #app-root { overflow: visible !important; max-height: none !important; min-height: 100vh !important; height: 100% !important; }
        html, body { overflow-y: auto !important; overflow-x: hidden !important; height: auto !important; max-height: none !important; }
        html.lenis { height: auto; }
        .lenis.lenis-smooth { scroll-behavior: auto; }
        .lenis.lenis-smooth [data-lenis-prevent] { overscroll-behavior: contain; }
        .lenis.lenis-stopped { overflow: hidden; }
        .lenis.lenis-scrolling iframe { pointer-events: none; }
      `,
      type: 'text/css'
    }
  ],
  script: [
    // Three.js, Vanta.fog, and UnicornStudio are now loaded on-demand
    // when the footer section enters the viewport (see loadFooterScripts below)

    // Structured Data (JSON-LD) - SoftwareApplication with FREE emphasis
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'SoftwareApplication',
        'name': 'Rankify - Free JEE NEET Mock Test Generator',
        'description': 'Free AI-powered mock test generator for JEE Main, NEET, and competitive exams. Convert PDF question papers to online CBT tests instantly. No registration required. 100% free. ',
        'url': 'https://rankify.qzz.io',
        'applicationCategory': 'EducationalApplication',
        'operatingSystem': 'Web Browser, Windows, macOS, Linux, Android, iOS',
        'offers': {
          '@type': 'Offer',
          'price': '0',
          'priceCurrency': 'INR',
          'availability': 'https://schema.org/InStock',
          'priceValidUntil': '2099-12-31',
          'description': 'Free. No registration required. Unlimited mock tests.'
        },
        'creator': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.qzz.io'
        },
        'aggregateRating': {
          '@type': 'AggregateRating',
          'ratingValue': '4.8',
          'ratingCount': '1250',
          'bestRating': '5',
          'worstRating': '1'
        },
        'featureList': [
          'Free JEE Main mock tests',
          'Free NEET mock tests',
          'Free online CBT interface',
          'AI-powered question extraction from PDF',
          'No registration required',
          'Unlimited mock tests',
          'Auto-grading and instant results',
          'Diagram detection and cropping',
          'Performance analytics',
          'Section-wise analysis',
          'Time management tools',
          'Offline mode support',
          'Export results to PDF'
        ],
        'screenshot': 'https://rankify.qzz.io/screenshot.png',
        'softwareVersion': '1.0.0',
        'downloadUrl': 'https://rankify.qzz.io/ai-extractor',
        'installUrl': 'https://rankify.qzz.io',
        'audience': {
          '@type': 'EducationalAudience',
          'educationalRole': 'student',
          'audienceType': 'JEE aspirants, NEET students, competitive exam candidates, engineering entrance students, medical entrance students'
        },
        'educationalUse': 'Mock test practice, exam preparation, self-assessment, competitive exam training',
        'teaches': [
          'JEE Main Physics',
          'JEE Main Chemistry',
          'JEE Main Mathematics',
          'NEET Physics',
          'NEET Chemistry',
          'NEET Biology',
          'Competitive exam strategies'
        ],
        'about': [
          {
            '@type': 'Thing',
            'name': 'JEE Main',
            'description': 'Joint Entrance Examination Main for engineering admissions'
          },
          {
            '@type': 'Thing',
            'name': 'NEET',
            'description': 'National Eligibility cum Entrance Test for medical admissions'
          },
          {
            '@type': 'Thing',
            'name': 'Free Mock Tests',
            'description': 'Unlimited free practice tests for competitive exams'
          },
          {
            '@type': 'Thing',
            'name': 'Online CBT',
            'description': 'Computer-based test interface for exam simulation'
          }
        ],
        'sameAs': [
          'https://github.com/namandhakad712/rankify'
        ]
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'WebSite',
        'name': 'Rankify - Free JEE NEET Mock Test Generator',
        'alternateName': 'Rankify Free Mock Tests',
        'url': 'https://rankify.qzz.io',
        'description': 'Create unlimited free mock tests for JEE Main, NEET, and competitive exams. AI-powered online CBT interface. No registration required.',
        'inLanguage': 'en-IN',
        'copyrightHolder': {
          '@type': 'Organization',
          'name': 'Rankify'
        },
        'potentialAction': {
          '@type': 'SearchAction',
          'target': {
            '@type': 'EntryPoint',
            'urlTemplate': 'https://rankify.qzz.io/ai-extractor?q={search_term_string}'
          },
          'query-input': 'required name=search_term_string'
        }
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Organization',
        'name': 'Rankify',
        'url': 'https://rankify.qzz.io',
        'logo': 'https://rankify.qzz.io/logo.png',
        'description': 'Free AI-powered mock test generator for JEE, NEET, and competitive exams',
        'sameAs': [
          'https://github.com/namandhakad712/rankify'
        ],
        'contactPoint': {
          '@type': 'ContactPoint',
          'contactType': 'Customer Support',
          'availableLanguage': ['English', 'Hindi']
        }
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        'mainEntity': [
          {
            '@type': 'Question',
            'name': 'Is Rankify really free?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes! Rankify is 100% free.  You can create unlimited mock tests for JEE Main, NEET, and other competitive exams without any registration or payment. All features including AI extraction, online CBT interface, and result analysis are completely free.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Do I need to register to use Rankify?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'No registration required! You can start creating and taking mock tests immediately without creating an account. Your data is stored locally in your browser for privacy.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How do I create a free JEE mock test?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Simply upload your JEE question paper PDF to our AI Extractor. The AI will automatically extract questions, options, and diagrams. Review the extracted content in the Review Interface, then generate your free online CBT mock test instantly.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Can I create free NEET mock tests?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Absolutely! Rankify supports NEET, JEE Main, JEE Advanced, and all competitive exam formats including MCQ, MSQ, NAT, and match-the-column questions. Upload any NEET question paper PDF and create unlimited free mock tests.'
            }
          },
          {
            '@type': 'Question',
            'name': 'What is the online CBT interface?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Our free online CBT (Computer-Based Test) interface simulates the actual exam environment with timer, question palette, section navigation, and instant result calculation. It works exactly like NTA JEE/NEET exam interface.'
            }
          },
          {
            '@type': 'Question',
            'name': 'How accurate is the AI extraction?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Our AI achieves 95%+ accuracy in extracting questions from PDFs. Each extracted question gets a confidence score (1-5). You can review and edit any question in the Review Interface before generating your mock test.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Can I use Rankify offline?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Yes! After creating your mock test online, you can take it offline. All test data is stored locally in your browser, so you can practice even without internet connection.'
            }
          },
          {
            '@type': 'Question',
            'name': 'Which exams does Rankify support?',
            'acceptedAnswer': {
              '@type': 'Answer',
              'text': 'Rankify supports JEE Main, JEE Advanced, NEET, BITSAT, VITEEE, SRMJEEE, COMEDK, MHT CET, WBJEE, KCET, and all other competitive exams with MCQ/MSQ/NAT format questions.'
            }
          }
        ]
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Course',
        'name': 'JEE Main Mock Test Series',
        'description': 'Comprehensive JEE Main mock test series with AI-powered question extraction and performance analysis',
        'provider': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.qzz.io'
        },
        'courseCode': 'JEE-MAIN-MOCK-2026',
        'coursePrerequisites': 'Basic knowledge of Physics, Chemistry, Mathematics',
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': 'online',
          'instructor': {
            '@type': 'Organization',
            'name': 'Rankify AI'
          }
        }
      })
    },
    {
      type: 'application/ld+json',
      children: JSON.stringify({
        '@context': 'https://schema.org',
        '@type': 'Course',
        'name': 'NEET Mock Test Series',
        'description': 'Complete NEET mock test series with AI-powered learning and performance tracking',
        'provider': {
          '@type': 'Organization',
          'name': 'Rankify',
          'url': 'https://rankify.qzz.io'
        },
        'courseCode': 'NEET-MOCK-2026',
        'coursePrerequisites': 'Basic knowledge of Physics, Chemistry, Biology',
        'hasCourseInstance': {
          '@type': 'CourseInstance',
          'courseMode': 'online',
          'instructor': {
            '@type': 'Organization',
            'name': 'Rankify AI'
          }
        }
      })
    }
  ]
});

if (typeof window !== 'undefined') {
  onMounted(() => {
    const appRoot = document.getElementById('app-root');
    if (appRoot) {
      appRoot.style.setProperty('overflow', 'visible', 'important');
      appRoot.style.setProperty('max-height', 'none', 'important');
      appRoot.style.setProperty('height', 'auto', 'important');
      document.body.style.setProperty('overflow-y', 'auto', 'important');
      document.body.style.setProperty('overflow-x', 'hidden', 'important');
      document.documentElement.style.setProperty('overflow-y', 'auto', 'important');
      document.documentElement.style.setProperty('overflow-x', 'hidden', 'important');
    }
  });
}

const isDark = ref(true);
const preloader = ref(null);
const preloaderText = ref(null);
const preloaderGlow = ref(null);
const heroBtn = ref(null);
const loginBtn = ref(null);
const scannerSection = ref(null);
const pdfScannerCanvas = ref(null);
const evervaultSection = ref(null);
const footerText = ref(null);
const footerSection = ref(null);
const footerBg = ref(null);
const footerTextLayer = ref(null);
const unicornLayer = ref(null);
const activeFaq = ref(null);
const cursorBlob = ref(null);
const navIndicator = ref(null);
const navContainer = ref(null);
const infiniteMenuSection = ref(null);
const infiniteMenuHeader = ref(null);
const infiniteMenuContainer = ref(null);
const videoContainerRef = ref(null);

// PDF Scanner particle system
let pdfScannerParticles = null;

// Vanta effect instance
let vantaEffect = null;

// Track if Unicorn Studio is already initialized
let isUnicornInitialized = false;

const navLinks = [
  { label: 'Workflow', href: '#evervault-section' },
  { label: 'Features', href: '#features-section' },
  { label: 'Use Cases', href: '#infinite-menu-section' },
  { label: 'FAQ', href: '#faq-section' }
];

const pipelineCards = [
  { title: 'Upload & Scan' },
  { title: 'AI Extraction' },
  { title: 'Review Interface' },
  { title: 'Ready to Rank' }
];

const useCaseItems = [
  {
    image: '/images/infinite-scroll/first-time-test-takers.webp',
    title: 'First-Time Test Takers',
    description: 'Relieve anxiety and exam stress with authentic interface practice',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/competitive-prep.webp',
    title: 'Competitive Exam Prep',
    description: 'Create unlimited practice tests instantly without waiting',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/self-reliant-timings.webp',
    title: 'Self-Reliance Champions',
    description: 'Transform any PDF into interactive tests with real exam like interface',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/make-exam-interface-common.webp',
    title: 'Standardize Experiences',
    description: 'Make yourself common to test interface, leaving behind exam hall anxiety',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/smart-work.webp',
    title: 'Consistency',
    description: 'Do combined Smart Work with dedicated Consistency to speed up your preparation',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/best-of-luck.webp',
    title: 'Best of Luck',
    description: 'My best wishes for you, give feedback if my project helps you in your journey',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/smart-hard-work.webp',
    title: 'Dual Strategy',
    description: 'The combination of smart work (enabled by our advanced AI system) and hard work (Your dedication) leading to success',
    link: '/ai-extractor'
  },
  {
    image: '/images/infinite-scroll/freedom-of-time.webp',
    title: 'Freedom of Time',
    description: 'Anytime self-made exam experience at your convenience',
    link: '/ai-extractor'
  }
];


const faqs = [
  {
    question: "How accurate is the AI extraction?",
    answer: "Rankify uses Gemini 2.5 Series & Groq Models, which provides high accuracy for text, equations, and diagrams. However, we recommend a quick review, which is why we provide confidence scores for every question."
  },
  {
    question: "Does it support diagrams and images?",
    answer: "Yes! Our AI automatically detects diagrams, crops them, and associates them with the correct questions. You don't need to manually snip images."
  },
  {
    question: "Can I edit the questions after extraction?",
    answer: "Absolutely. The review interface allows you to edit question text, options, correct answers, and marks before you generate the final test."
  },
  {
    question: "Is it free to use?",
    answer: "We offer as free now as a open-source for students to try out the features."
  }
];

const toggleFaq = (index) => {
  activeFaq.value = activeFaq.value === index ? null : index;
};

const toggleTheme = () => {
  isDark.value = !isDark.value;
  if (isDark.value) {
    document.documentElement.classList.add('dark');
  } else {
    document.documentElement.classList.remove('dark');
  }
};

// --- NAV LIQUID INDICATOR ---
const moveNavIndicator = (e) => {
  const target = e.target;
  const indicator = navIndicator.value;
  const container = navContainer.value;
  if (!indicator || !container) return;

  const targetRect = target.getBoundingClientRect();
  const containerRect = container.getBoundingClientRect();

  const left = targetRect.left - containerRect.left;
  const width = targetRect.width;

  gsap.to(indicator, {
    left: left + 16, // Adjust for padding
    width: width - 32, // Adjust for padding
    opacity: 1,
    duration: 0.4,
    ease: "elastic.out(1, 0.7)"
  });
};

const hideNavIndicator = () => {
  gsap.to(navIndicator.value, {
    opacity: 0,
    duration: 0.3,
    ease: "power2.out"
  });
};

// --- MAGNETIC BUTTONS ---
const handleMagnetic = (e, element) => {
  const btn = element || heroBtn.value;
  if (!btn) return;
  const rect = btn.getBoundingClientRect();
  const x = e.clientX - rect.left - rect.width / 2;
  const y = e.clientY - rect.top - rect.height / 2;

  gsap.to(btn, {
    x: x * 0.3,
    y: y * 0.3,
    duration: 0.5,
    ease: "power2.out"
  });
  
  // Inner text parallax
  const span = btn.querySelector('span');
  if (span) {
    gsap.to(span, {
      x: x * 0.1,
      y: y * 0.1,
      duration: 0.5,
      ease: "power2.out"
    });
  }
};

const resetMagnetic = (element) => {
  const btn = element || heroBtn.value;
  if (!btn) return;
  gsap.to(btn, {
    x: 0,
    y: 0,
    duration: 1,
    ease: "elastic.out(1, 0.3)"
  });
  const span = btn.querySelector('span');
  if (span) {
    gsap.to(span, {
      x: 0,
      y: 0,
      duration: 1,
      ease: "elastic.out(1, 0.3)"
    });
  }
};

const handleSpotlight = (e) => {
  const card = e.currentTarget;
  const rect = card.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  card.style.setProperty('--mouse-x', `${x}px`);
  card.style.setProperty('--mouse-y', `${y}px`);
};

// Video Tilt Effect (Subtle - 2 degree)
const handleVideoTilt = (e) => {
  const container = videoContainerRef.value;
  if (!container) return;
  
  const rect = container.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  const centerX = rect.width / 2;
  const centerY = rect.height / 2;
  
  // Reduced tilt amplitude to 2 degrees for easier controls
  const rotateX = ((y - centerY) / centerY) * -2;
  const rotateY = ((x - centerX) / centerX) * 2;
  
  container.style.transform = `perspective(1000px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1.005)`;
};

const resetVideoTilt = () => {
  const container = videoContainerRef.value;
  if (!container) return;
  container.style.transform = 'perspective(1000px) rotateX(0deg) rotateY(0deg) scale(1)';
};

// --- LIQUID CURSOR ---
const initLiquidCursor = () => {
  if (!window.matchMedia("(pointer: fine)").matches) return;
  
  const cursor = cursorBlob.value;
  if (!cursor) return;

  const pos = { x: window.innerWidth / 2, y: window.innerHeight / 2 };
  const mouse = { x: pos.x, y: pos.y };
  const speed = 0.15;
  let isHoveringClickable = false;
  let currentHoverScale = 1; // Track current scale for smooth transition
  
  const xSet = gsap.quickSetter(cursor, "x", "px");
  const ySet = gsap.quickSetter(cursor, "y", "px");
  const rotSet = gsap.quickSetter(cursor, "rotation", "deg");
  const scaleXSet = gsap.quickSetter(cursor, "scaleX");
  const scaleYSet = gsap.quickSetter(cursor, "scaleY");

  // Check if element is clickable
  const isClickable = (element) => {
    if (!element) return false;
    const tagName = element.tagName.toLowerCase();
    const clickableTags = ['a', 'button', 'input', 'textarea', 'select'];
    const hasClickHandler = element.onclick || element.getAttribute('onclick');
    const hasCursorPointer = window.getComputedStyle(element).cursor === 'pointer';
    const hasClickableClass = element.classList.contains('cursor-pointer') || 
                              element.classList.contains('magnetic-btn') ||
                              element.classList.contains('nav-link');
    
    return clickableTags.includes(tagName) || hasClickHandler || hasCursorPointer || hasClickableClass;
  };

  window.addEventListener("mousemove", e => {
    mouse.x = e.clientX;
    mouse.y = e.clientY;
    
    // Check if hovering over clickable element
    const elementUnderCursor = document.elementFromPoint(e.clientX, e.clientY);
    isHoveringClickable = isClickable(elementUnderCursor);
  });

  gsap.ticker.add(() => {
    const dt = 1.0 - Math.pow(1.0 - speed, gsap.ticker.deltaRatio()); 
    
    pos.x += (mouse.x - pos.x) * dt;
    pos.y += (mouse.y - pos.y) * dt;
    
    const deltaX = mouse.x - pos.x;
    const deltaY = mouse.y - pos.y;
    const vel = Math.sqrt(deltaX*deltaX + deltaY*deltaY);
    const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI;
    
    const stretch = Math.min(vel * 0.005, 0.8);
    
    // Smooth transition for hover scale using lerp
    const targetHoverScale = isHoveringClickable ? 1.5 : 1;
    currentHoverScale += (targetHoverScale - currentHoverScale) * 0.15; // Smooth easing
    
    const scaleX = (1 + stretch) * currentHoverScale;
    const scaleY = (1 - stretch * 0.6) * currentHoverScale;

    xSet(pos.x);
    ySet(pos.y);
    rotSet(angle);
    scaleXSet(scaleX);
    scaleYSet(scaleY);
  });
};

// PDF Scanner Particle System
class PDFScannerParticles {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.particles = [];
    this.count = 0;
    this.maxParticles = 1200;
    this.intensity = 1.2;
    this.animationId = null;
    
    this.setupCanvas();
    this.createGradientCache();
    this.initParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.onResize());
  }
  
  setupCanvas() {
    const rect = this.canvas.getBoundingClientRect();
    this.w = rect.width;
    this.h = rect.height;
    this.canvas.width = this.w;
    this.canvas.height = this.h;
  }
  
  onResize() {
    this.setupCanvas();
  }
  
  createGradientCache() {
    this.gradientCanvas = document.createElement('canvas');
    this.gradientCtx = this.gradientCanvas.getContext('2d');
    this.gradientCanvas.width = 16;
    this.gradientCanvas.height = 16;
    
    const half = this.gradientCanvas.width / 2;
    const gradient = this.gradientCtx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(59, 130, 246, 1)');
    gradient.addColorStop(0.3, 'rgba(96, 165, 250, 0.8)');
    gradient.addColorStop(0.7, 'rgba(147, 197, 253, 0.4)');
    gradient.addColorStop(1, 'transparent');
    
    this.gradientCtx.fillStyle = gradient;
    this.gradientCtx.beginPath();
    this.gradientCtx.arc(half, half, half, 0, Math.PI * 2);
    this.gradientCtx.fill();
  }
  
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  createParticle(scannerY) {
    return {
      x: this.randomFloat(0, this.w),
      y: scannerY + this.randomFloat(-3, 3),
      vx: this.randomFloat(-0.5, 0.5),
      vy: this.randomFloat(0.3, 1.2),
      radius: this.randomFloat(0.5, 1.5),
      alpha: this.randomFloat(0.6, 1),
      decay: this.randomFloat(0.008, 0.02),
      life: 1.0,
      time: 0,
      twinkleSpeed: this.randomFloat(0.03, 0.1),
      twinkleAmount: this.randomFloat(0.1, 0.3),
    };
  }
  
  initParticles() {
    for (let i = 0; i < this.maxParticles * 0.3; i++) {
      const particle = this.createParticle(0);
      this.count++;
      this.particles[this.count] = particle;
    }
  }
  
  updateParticle(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.time++;
    
    particle.alpha = particle.alpha * particle.life + Math.sin(particle.time * particle.twinkleSpeed) * particle.twinkleAmount;
    particle.life -= particle.decay;
    
    if (particle.y > this.h + 10 || particle.life <= 0 || particle.x < -10 || particle.x > this.w + 10) {
      return false;
    }
    return true;
  }
  
  drawParticle(particle) {
    if (particle.life <= 0) return;
    
    this.ctx.globalAlpha = Math.max(0, Math.min(1, particle.alpha * particle.life));
    this.ctx.drawImage(
      this.gradientCanvas,
      particle.x - particle.radius,
      particle.y - particle.radius,
      particle.radius * 2,
      particle.radius * 2
    );
  }
  
  updateScannerPosition(progress) {
    const scannerY = this.h * progress;
    
    // Spawn new particles at scanner line
    if (Math.random() < this.intensity && this.count < this.maxParticles) {
      const burstCount = Math.floor(this.randomFloat(2, 5));
      for (let i = 0; i < burstCount; i++) {
        const particle = this.createParticle(scannerY);
        this.count++;
        this.particles[this.count] = particle;
      }
    }
  }
  
  render() {
    this.ctx.clearRect(0, 0, this.w, this.h);
    this.ctx.globalCompositeOperation = 'lighter';
    
    // Update and draw particles
    for (let i = 1; i <= this.count; i++) {
      if (this.particles[i]) {
        if (!this.updateParticle(this.particles[i])) {
          delete this.particles[i];
        } else {
          this.drawParticle(this.particles[i]);
        }
      }
    }
    
    // Clean up dead particles periodically
    if (Math.random() < 0.01) {
      const aliveParticles = {};
      let newCount = 0;
      for (let i = 1; i <= this.count; i++) {
        if (this.particles[i]) {
          newCount++;
          aliveParticles[newCount] = this.particles[i];
        }
      }
      this.particles = aliveParticles;
      this.count = newCount;
    }
  }
  
  animate() {
    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particles = [];
    this.count = 0;
  }
}

// Reset scroll position before mount
onBeforeMount(() => {
  if (typeof window !== 'undefined') {
    window.history.scrollRestoration = 'manual';
    window.scrollTo(0, 0);
  }
});

onMounted(async () => {
  await nextTick();
  
  if (typeof window !== 'undefined') {
    // REGISTER ALL PLUGINS — filter null (MorphSVGPlugin is Club paid)
    const plugins = [ScrollTrigger, TextPlugin, SplitText, ScrambleTextPlugin, Flip].filter(Boolean);
    if (MorphSVGPlugin) plugins.push(MorphSVGPlugin as never);
    gsap.registerPlugin(...plugins as never[]);
    
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)),
      direction: 'vertical',
      smooth: true,
    });

    function raf(time) {
      lenis.raf(time);
      requestAnimationFrame(raf);
    }
    requestAnimationFrame(raf);
    lenis.on('scroll', ScrollTrigger.update);
    gsap.ticker.add((time) => lenis.raf(time * 1000));
    gsap.ticker.lagSmoothing(0);

    // Scroll to top on page load/refresh
    window.scrollTo(0, 0);
    lenis.scrollTo(0, { immediate: true });
    
    // Use GSAP to ensure we're at the top
    gsap.to(window, {
      scrollTo: { y: 0, autoKill: false },
      duration: 0,
      onComplete: () => {
        ScrollTrigger.refresh();
      }
    });

    initLiquidCursor();



    // Netflix-style Preloader Animation - Zoom into "R"
    const preloaderTl = gsap.timeline();
    
    // Animate background gradient
    preloaderTl.to(".preloader-bg", {
      opacity: 1,
      duration: 0.5,
      ease: "power2.inOut"
    });
    
    // Animate each character appearing
    const chars = document.querySelectorAll('.preloader-char');
    preloaderTl.to(preloaderText.value, {
      opacity: 1,
      duration: 0.3
    });
    
    chars.forEach((char, index) => {
      preloaderTl.fromTo(char, 
        {
          opacity: 0,
          scale: 0.5,
          y: 50,
          rotationX: -90
        },
        {
          opacity: 1,
          scale: 1,
          y: 0,
          rotationX: 0,
          duration: 0.6,
          ease: "back.out(1.7)"
        },
        index * 0.08
      );
    });
    
    // Pulse and glow effect
    preloaderTl.to(preloaderText.value, {
      scale: 1.05,
      duration: 0.4,
      ease: "power2.inOut",
      yoyo: true,
      repeat: 1
    });
    
    preloaderTl.to(preloaderGlow.value, {
      opacity: 0.8,
      duration: 0.5,
      ease: "power2.inOut"
    }, "-=0.8");
    
    // Hold for a moment
    preloaderTl.to({}, { duration: 0.3 });
    
    // Zoom into the "R" - Netflix style
    preloaderTl.to(preloaderText.value, {
      scale: 35,
      duration: 1.2,
      ease: "power4.in",
      transformOrigin: "left center" // Zoom into the R
    });
    
    // Fade out everything
    preloaderTl.to(preloader.value, {
      opacity: 0,
      duration: 0.5,
      ease: "power2.inOut"
    }, "-=0.4");
    
    // Remove preloader from DOM
    preloaderTl.set(preloader.value, {
      display: "none"
    });
    
    // Hero Animations
    const tl = gsap.timeline();
    tl.to(".hero-badge", { y: 0, opacity: 1, duration: 0.8, ease: "power3.out" }, "-=0.5")
      .to(".hero-line", { y: 0, duration: 1.2, stagger: 0.15, ease: "power4.out" }, "-=0.5")
      .to(".hero-desc", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.8")
      .to(".hero-cta", { y: 0, opacity: 1, duration: 1, ease: "power3.out" }, "-=0.8");

    // --- SCANNER GLITCH & SCRAMBLE ---
    const scannerText = document.querySelector('.scanner-container p');
    if (scannerText) {
      gsap.to(scannerText, {
        scrollTrigger: {
          trigger: scannerSection.value,
          start: "top center",
          toggleActions: "play none none reverse"
        },
        scrambleText: {
          text: "ANALYSIS COMPLETE: 99.8% ACCURACY",
          chars: "010101",
          speed: 0.5,
          revealDelay: 0.5,
          tweenLength: false
        },
        duration: 2
      });
    }

    // Initialize PDF Scanner Particles
    if (pdfScannerCanvas.value) {
      pdfScannerParticles = new PDFScannerParticles(pdfScannerCanvas.value);
    }

    let scannerTl = gsap.timeline({
      scrollTrigger: {
        trigger: scannerSection.value,
        start: "top top",
        end: "+=200%",
        pin: true,
        scrub: 1,
        anticipatePin: 1,
        onUpdate: (self) => {
          // Update particle system with scanner progress
          if (pdfScannerParticles) {
            pdfScannerParticles.updateScannerPosition(self.progress);
          }
        }
      }
    });
    scannerTl.to(".scanner-line", { top: "100%", duration: 3, ease: "none" })
              .fromTo(".quiz-layer", { clipPath: "inset(0 100% 0 0)" }, { clipPath: "inset(0 0% 0 0)", duration: 3, ease: "none" }, "<")
              .to(".pdf-layer", { opacity: 0.2, scale: 0.9, duration: 3 }, "<");

    // Evervault Section
    const evervaultSectionEl = document.getElementById('evervault-section');
    if (evervaultSectionEl) {
      const cardLine = evervaultSectionEl.querySelector('.card-line');
      if (cardLine) {
        const cardWidth = 400;
        const cardGap = 60;
        const totalCards = 4;
        const totalWidth = (cardWidth + cardGap) * totalCards;
        const viewportWidth = window.innerWidth;
        const startPosition = viewportWidth;
        const endPosition = -totalWidth;
        const totalDistance = startPosition - endPosition;
        
        gsap.timeline({
          scrollTrigger: {
            trigger: evervaultSectionEl,
            start: "top top",
            end: "+=300%",
            pin: true,
            scrub: 0.5, // Reduced from 1 to 0.5 for smoother, more responsive scrolling
            anticipatePin: 0, // Disabled to prevent layout shift jitter
            fastScrollEnd: true, // Snap to final position faster
            onUpdate: (self) => {
              const progress = self.progress;
              const currentPosition = startPosition - (totalDistance * progress);
              cardLine.style.transform = `translateX(${currentPosition}px)`;
              
              // Trigger clipping update only when cards move
              if (window.evervaultCardController) {
                window.evervaultCardController.triggerClippingUpdate();
              }
            }
          }
        });
      }
    }

    // --- INFINITE MENU SECTION ANIMATIONS ---
    if (infiniteMenuSection.value) {
      // Animate header (title and description)
      if (infiniteMenuHeader.value) {
        gsap.fromTo(infiniteMenuHeader.value,
          {
            opacity: 0,
            y: 50
          },
          {
            opacity: 1,
            y: 0,
            duration: 1,
            ease: "power3.out",
            scrollTrigger: {
              trigger: infiniteMenuSection.value,
              start: "top 80%",
              end: "top 50%",
              scrub: 1,
              toggleActions: "play none none reverse"
            }
          }
        );
      }

      // Animate container (3D sphere)
      if (infiniteMenuContainer.value) {
        gsap.fromTo(infiniteMenuContainer.value,
          {
            opacity: 0,
            scale: 0.8,
            y: 100
          },
          {
            opacity: 1,
            scale: 1,
            y: 0,
            duration: 1.2,
            ease: "power3.out",
            scrollTrigger: {
              trigger: infiniteMenuContainer.value,
              start: "top 85%",
              end: "top 40%",
              scrub: 1,
              toggleActions: "play none none reverse"
            }
          }
        );
      }
    }

    // --- FOOTER SCALE ANIMATION ---
    // Footer grows from small to full size as you scroll
    if (footerSection.value) {
      gsap.fromTo(footerSection.value,
        {
          scale: 0.65,
          borderRadius: "4rem 4rem 0 0"
        },
        {
          scale: 1,
          borderRadius: "3rem 3rem 0 0",
          scrollTrigger: {
            trigger: footerSection.value,
            start: "top bottom",
            end: "top 40%",
            scrub: 0.5,
            ease: "power1.inOut",
            onUpdate: (self) => {
              // Trigger window resize event to make Unicorn Studio recalculate
              if (window.UnicornStudio && isUnicornInitialized) {
                window.dispatchEvent(new Event('resize'));
              }
            }
          }
        }
      );
    }

    // --- FOOTER 3D TEXT WITH UNICORN TRANSITION ---
    const footerTitle = footerText.value;
    if (footerTitle && footerTextLayer.value && unicornLayer.value) {
      const fSplit = new SplitText(footerTitle, { type: "chars" });
      
      // Track if transition has been triggered
      let transitionTriggered = false;
      
      // Check if desktop (768px and above)
      const isDesktop = () => window.innerWidth >= 768;
      
      // Initial 3D reveal animation on scroll
      gsap.from(fSplit.chars, {
        scrollTrigger: {
          trigger: footerSection.value,
          start: "top 80%",
          end: "top 30%",
          scrub: 1,
          onEnter: () => {
            // Only initialize and transition on desktop
            if (!transitionTriggered && isDesktop()) {
              transitionTriggered = true;
              initUnicornStudio();
              // After text animation completes, wait 2 seconds then transition
              setTimeout(() => {
                transitionToUnicorn();
              }, 2000);
            }
          }
        },
        rotateX: 90,
        opacity: 0,
        stagger: 0.1,
        transformOrigin: "50% 50% -50px"
      });
      
      // Function to transition from text to Unicorn (desktop only)
      function transitionToUnicorn() {
        if (!isDesktop()) return; // Skip on mobile
        
        const transitionTimeline = gsap.timeline();
        
        transitionTimeline
          .to(footerTextLayer.value, {
            opacity: 0,
            y: -100,
            scale: 0.8,
            duration: 1.5,
            ease: "power2.inOut"
          })
          .to(unicornLayer.value, {
            opacity: 1,
            duration: 1.5,
            ease: "power2.inOut"
          }, "-=1");
      }
      
      // Scatter on hover (only when text is visible)
      fSplit.chars.forEach(char => {
        char.addEventListener("mouseenter", () => {
          if (footerTextLayer.value && parseFloat(getComputedStyle(footerTextLayer.value).opacity) > 0.5) {
            gsap.to(char, {
              y: gsap.utils.random(-50, 50),
              x: gsap.utils.random(-50, 50),
              rotation: gsap.utils.random(-45, 45),
              duration: 0.3,
              ease: "power2.out"
            });
          }
        });
        char.addEventListener("mouseleave", () => {
          gsap.to(char, {
            y: 0,
            x: 0,
            rotation: 0,
            duration: 0.8,
            ease: "elastic.out(1, 0.3)"
          });
        });
      });
    }

    // --- UNICORN STUDIO INITIALIZATION ---
    function initUnicornStudio() {
      // Prevent multiple initializations
      if (isUnicornInitialized) {
        console.log('⚠️ Unicorn Studio already initialized, skipping...');
        return;
      }
      
      console.log('Attempting to initialize Unicorn Studio...');
      console.log('Window.UnicornStudio exists?', typeof window !== 'undefined' && !!window.UnicornStudio);
      
      if (typeof window !== 'undefined' && window.UnicornStudio) {
        // Mark as initialized immediately to prevent duplicate calls
        isUnicornInitialized = true;
        
        setTimeout(() => {
          // Only initialize if not already done by the global script
          if (!window.UnicornStudio.isInitialized) {
            window.UnicornStudio.init().then((scenes) => {
              console.log('✅ Unicorn Studio footer scenes initialized:', scenes);
            }).catch((err) => {
              console.error('❌ Failed to initialize Unicorn Studio in footer:', err);
              isUnicornInitialized = false; // Reset on error
            });
          } else {
            console.log('✅ Unicorn Studio already initialized globally');
          }
        }, 500);
      } else if (typeof window !== 'undefined' && !window.UnicornStudio) {
        console.warn('⚠️ UnicornStudio not found on window object. Make sure the script is loaded.');
      }
    }

    // --- BENTO GRID ANIMATIONS ---
    // Levitate Icons - DISABLED (icons were dancing too much)
    // gsap.utils.toArray('.spotlight-card .w-12').forEach((icon, i) => {
    //   gsap.to(icon, {
    //     y: -10,
    //     duration: 1.5,
    //     repeat: -1,
    //     yoyo: true,
    //     ease: "sine.inOut",
    //     delay: i * 0.2
    //   });
    // });

    // Staggered Reveal of Grid Items
    gsap.from(".spotlight-card", {
      scrollTrigger: {
        trigger: ".spotlight-card",
        start: "top 80%",
      },
      y: 50,
      opacity: 0,
      duration: 0.8,
      stagger: 0.1,
      ease: "power2.out"
    });

    // --- VANTA.JS FOG EFFECT ---
    // Initialize Vanta.js fog effect on footer background
    const initVanta = () => {
      if (typeof window !== 'undefined' && window.VANTA && footerBg.value) {
        const currentIsDark = isDark.value;
        
        vantaEffect = window.VANTA.FOG({
          el: footerBg.value,
          mouseControls: true,
          touchControls: true,
          gyroControls: false,
          minHeight: 200.00,
          minWidth: 200.00,
          highlightColor: currentIsDark ? 0x8b5cf6 : 0x3b82f6,
          midtoneColor: currentIsDark ? 0x6366f1 : 0x8b5cf6,
          lowlightColor: currentIsDark ? 0x1e1b4b : 0xdbeafe,
          baseColor: currentIsDark ? 0x000000 : 0xffffff,
          blurFactor: 0.66,
          speed: 0.60,
          zoom: 0.40
        });
        
        console.log('✅ Vanta.js fog effect initialized');
      }
    };

    // --- LAZY-LOAD FOOTER SCRIPTS (Three.js + Vanta + UnicornStudio) ---
    let footerScriptsLoaded = false;

    function loadScript(src) {
      return new Promise((resolve, reject) => {
        const s = document.createElement('script');
        s.src = src;
        s.onload = resolve;
        s.onerror = reject;
        document.head.appendChild(s);
      });
    }

    async function loadFooterScripts() {
      if (footerScriptsLoaded) return;
      footerScriptsLoaded = true;

      try {
        // Load Three.js first (Vanta depends on it)
        await loadScript('https://cdnjs.cloudflare.com/ajax/libs/three.js/r134/three.min.js');
        // Then Vanta fog
        await loadScript('https://cdn.jsdelivr.net/npm/vanta@latest/dist/vanta.fog.min.js');
        initVanta();
      } catch (err) {
        console.error('Failed to load Vanta scripts:', err);
      }

      try {
        // Load UnicornStudio in parallel (independent of Vanta)
        if (!window.UnicornStudio) {
          window.UnicornStudio = {
            isInitialized: false,
            init: () => Promise.resolve(),
            destroy: () => Promise.resolve()
          };
          await loadScript('https://cdn.jsdelivr.net/gh/hiunicornstudio/unicornstudio.js@v1.4.34/dist/unicornStudio.umd.js');
        }
      } catch (err) {
        console.error('Failed to load UnicornStudio:', err);
      }
    }

    // Trigger loading when footer is about to enter viewport
    if (footerSection.value) {
      const footerObserver = new IntersectionObserver(
        (entries) => {
          if (entries[0].isIntersecting) {
            loadFooterScripts();
            footerObserver.disconnect();
          }
        },
        { rootMargin: '200px' } // Start loading 200px before footer is visible
      );
      footerObserver.observe(footerSection.value);
    }
  }
});

// Cleanup on unmount
onUnmounted(() => {
  // Cleanup PDF Scanner Particles
  if (pdfScannerParticles) {
    pdfScannerParticles.destroy();
    pdfScannerParticles = null;
  }
  
  // Cleanup Unicorn Studio
  if (typeof window !== 'undefined' && window.UnicornStudio && isUnicornInitialized) {
    try {
      window.UnicornStudio.destroy();
      isUnicornInitialized = false;
    } catch (err) {
      console.error('Error destroying Unicorn Studio:', err);
    }
  }
  
  // Cleanup Vanta.js
  if (vantaEffect) {
    try {
      vantaEffect.destroy();
      vantaEffect = null;
      console.log('✅ Vanta.js effect destroyed');
    } catch (err) {
      console.error('Error destroying Vanta.js:', err);
    }
  }
});
</script>

<style scoped>
/* Fonts (.font-pearl/.font-sans/.font-display/.font-mono) now global in src/style.css */

/* Custom Utilities */
.glass-nav {
  background-color: rgba(255, 255, 255, 0.7);
  backdrop-filter: blur(12px);
  border: 1px solid var(--border);
}
.dark .glass-nav {
  background-color: rgba(5, 5, 5, 0.7);
}

/* FROST NOISE GLASS CARD */
.spotlight-card {
  position: relative;
  overflow: hidden;
  /* Glass Base Style */
  background-color: rgba(255, 255, 255, 0.4);
  backdrop-filter: blur(24px);
  -webkit-backdrop-filter: blur(24px);
  border: 1px solid rgba(255, 255, 255, 0.2);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.1);
  transition: border-color 0.3s ease, transform 0.3s ease;
}
.dark .spotlight-card {
  background-color: rgba(20, 20, 20, 0.4); /* Semi-transparent dark */
  border: 1px solid rgba(255, 255, 255, 0.08);
  box-shadow: 0 4px 30px rgba(0, 0, 0, 0.5);
}

/* Spotlight Gradient (Top Layer) */
.spotlight-card::before {
  content: '';
  position: absolute;
  background: radial-gradient(800px circle at var(--mouse-x) var(--mouse-y), rgba(139, 92, 246, 0.15), transparent 40%);
  top: 0; left: 0; right: 0; bottom: 0;
  opacity: 0;
  transition: opacity 0.5s;
  pointer-events: none;
  z-index: 3;
}
.spotlight-card:hover::before {
  opacity: 1;
}

/* NOISE TEXTURE OVERLAY (Middle Layer) */
.spotlight-card::after {
  content: "";
  position: absolute;
  inset: 0;
  z-index: 1; /* Behind content, above bg */
  opacity: 0.06; /* Subtle noise visibility */
  pointer-events: none;
  /* SVG Noise Pattern */
  background-image: url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.65' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E");
}

/* Ensure content is above noise */
.spotlight-card > * {
  position: relative;
  z-index: 2;
}

.magnetic-btn {
  transition: transform 0.2s cubic-bezier(0.25, 0.46, 0.45, 0.94);
}

.mesh-gradient {
  background: radial-gradient(at 0% 0%, hsla(253,16%,7%,1) 0, transparent 50%),
              radial-gradient(at 50% 0%, hsla(225,39%,30%,1) 0, transparent 50%),
              radial-gradient(at 100% 0%, hsla(339,49%,30%,1) 0, transparent 50%);
  filter: blur(60px);
  opacity: 0.4;
}
.dark .mesh-gradient {
  opacity: 0.6;
}

/* Unicorn Studio Embed - Full Coverage */
.unicorn-embed {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  overflow: visible;
}

.unicorn-embed canvas {
  width: 100% !important;
  height: 100% !important;
  min-width: 100% !important;
  min-height: 100% !important;
  max-width: 100% !important;
  max-height: 100% !important;
  display: block !important;
  position: absolute !important;
  top: 0 !important;
  left: 0 !important;
  transform: none !important;
}

/* Netflix-style Preloader */
.preloader-bg {
  background: radial-gradient(circle at center, 
    rgba(255, 255, 255, 0.1) 0%, 
    rgba(255, 255, 255, 0.05) 50%, 
    rgba(0, 0, 0, 1) 100%);
  animation: preloaderPulse 2s ease-in-out infinite;
  opacity: 0;
}

@keyframes preloaderPulse {
  0%, 100% { transform: scale(1); opacity: 0.5; }
  50% { transform: scale(1.05); opacity: 0.8; }
}

.preloader-char {
  display: inline-block;
  color: #ffffff;
  text-shadow: 
    0 0 20px rgba(255, 255, 255, 0.8),
    0 0 40px rgba(255, 255, 255, 0.6),
    0 0 60px rgba(255, 255, 255, 0.4),
    0 0 80px rgba(255, 255, 255, 0.2);
  transform-origin: center;
  will-change: transform, opacity;
}

.preloader-glow {
  background: radial-gradient(circle at center, 
    rgba(255, 255, 255, 0.3) 0%, 
    rgba(255, 255, 255, 0.15) 30%, 
    transparent 70%);
  opacity: 0;
  animation: glowPulse 1.5s ease-in-out infinite;
}

@keyframes glowPulse {
  0%, 100% { transform: scale(0.8); opacity: 0; }
  50% { transform: scale(1.2); opacity: 0.6; }
}

.cursor-blob {
  position: fixed;
  top: 0;
  left: 0;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background-color: white;
  pointer-events: none;
  z-index: 9999;
  mix-blend-mode: difference;
  transform: translate(-50%, -50%);
  will-change: transform, width, height, border-radius;
}

#smooth-content {
  will-change: transform;
}

.glass-card-lg {
  position: relative;
  background: rgba(255, 255, 255, 0.05);
  backdrop-filter: blur(20px) saturate(150%);
  -webkit-backdrop-filter: blur(20px) saturate(150%);
  border: none;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  transition: all 0.3s ease;
}

/* Holographic border effect - no shadows, just subtle border */
.glass-card-lg::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: inherit;
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: -1;
  pointer-events: none;
}

/* Animated holographic gradient overlay */
.glass-card-lg::after {
  content: "";
  width: 100%;
  height: 100%;
  border-radius: inherit;
  background: linear-gradient(
      120deg,
      rgb(255 255 255 / 2%) 30%,
      rgb(255 255 255 / 25%) 40%,
      rgb(255 255 255 / 8%) 40%
    ),
    linear-gradient(0deg, rgb(255 255 255 / 20%), rgb(255 255 255 / 30%));
  background-size: 150% 150%;
  animation: cardGradient 45s ease-in-out infinite;
  transform: translateZ(0);
  position: absolute;
  inset: 0;
  z-index: -1;
  pointer-events: none;
}

/* Ensure content is above overlays */
.glass-card-lg > * {
  position: relative;
  z-index: 1;
}

@keyframes cardGradient {
  0% { background-position: 0% 10%; }
  50% { background-position: 100% 91%; }
  100% { background-position: 0% 10%; }
}

/* Ensure Unicorn canvas takes full space */
.unicorn-embed canvas {
  width: 100% !important;
  height: 100% !important;
  display: block;
  object-fit: cover;
}

/* PDF Scanner Canvas */
.pdf-scanner-canvas {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 25;
}

/* Glass Button Styles */
.glass-button {
  background: rgba(255, 255, 255, 0.15);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border: 1px solid rgba(255, 255, 255, 0.25);
  box-shadow: 
    0 4px 30px rgba(0, 0, 0, 0.1),
    inset 0 0 20px rgba(255, 255, 255, 0.1);
  transition: all 0.3s ease;
}

.glass-button:hover {
  background: rgba(255, 255, 255, 0.25);
  border-color: rgba(255, 255, 255, 0.4);
  box-shadow: 
    0 6px 40px rgba(0, 0, 0, 0.15),
    inset 0 0 30px rgba(255, 255, 255, 0.15);
}
</style>
