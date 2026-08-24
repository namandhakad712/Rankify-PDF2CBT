import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import path from 'node:path'

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(import.meta.dirname, './src'),
    },
  },
  build: {
    target: 'es2020',
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          if (!id.includes('node_modules')) return
          if (id.includes('gsap')) return 'gsap'
          if (id.includes('ogl')) return 'ogl'
          if (id.includes('pdfjs-dist')) return 'pdfjs'
          if (id.includes('motion-v')) return 'motion'
          if (id.includes('vue') || id.includes('@vueuse') || id.includes('reka-ui')) return 'vue'
          return 'vendor'
        },
      },
    },
  },
})
