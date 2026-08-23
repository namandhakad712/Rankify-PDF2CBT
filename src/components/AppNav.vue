<script setup lang="ts">
import { RouterLink } from 'vue-router'
import { Zap, BookOpen, Info, ShieldCheck, Sparkles } from 'lucide-vue-next'
</script>

<template>
  <nav class="fixed top-6 left-1/2 -translate-x-1/2 z-40 w-[90%] max-w-2xl">
    <div class="glass-nav rounded-full px-6 py-3 flex items-center justify-between shadow-lg dark:shadow-purple-900/10 transition-shadow duration-500 relative overflow-hidden">
      <RouterLink to="/" class="flex items-center gap-2 font-display font-bold text-xl tracking-tight cursor-pointer group">
        <Zap class="w-5 h-5 text-purple-500 fill-purple-500 group-hover:rotate-12 transition-transform" />
        <span class="group-hover:text-purple-500 transition-colors font-pearl text-2xl">Rankify</span>
      </RouterLink>

      <div class="hidden md:flex items-center gap-1">
        <RouterLink to="/getting-started" class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <BookOpen class="w-3.5 h-3.5" /> Guide
        </RouterLink>
        <RouterLink to="/about" class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <Info class="w-3.5 h-3.5" /> About
        </RouterLink>
        <RouterLink to="/privacy" class="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors inline-flex items-center gap-1.5">
          <ShieldCheck class="w-3.5 h-3.5" /> Privacy
        </RouterLink>
      </div>

      <div class="flex items-center gap-3">
        <RouterLink
          to="/extract"
          class="magnetic-btn bg-foreground text-background px-3 py-1.5 md:px-5 md:py-2 rounded-full text-xs md:text-sm font-bold hover:scale-105 transition-transform cursor-pointer relative overflow-hidden inline-flex items-center gap-1.5 whitespace-nowrap"
        >
          <Sparkles class="w-3.5 h-3.5" />
          <span class="relative z-10">Get Started</span>
          <div class="absolute inset-0 bg-purple-500 opacity-0 hover:opacity-20 transition-opacity"></div>
        </RouterLink>
      </div>
    </div>
  </nav>
</template>
