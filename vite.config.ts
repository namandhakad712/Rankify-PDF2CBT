import { defineConfig, type Connect, type ViteDevServer } from 'vite'
import vue from '@vitejs/plugin-vue'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'
import path from 'node:path'

// Dev shim — runs the Vercel serverless functions locally so /api/agent/*
// works on `pnpm dev` (Vercel only runs them in deployments).
function vercelApiDev() {
  return {
    name: 'vercel-api-dev',
    configureServer(server: ViteDevServer) {
      server.middlewares.use(async (req: Connect.IncomingMessage, res: import('node:http').ServerResponse, next: () => void) => {
        if (!req.url || !req.url.startsWith('/api/agent/') || (req.method !== 'POST' && req.method !== 'GET')) return next()
        const chunks: Buffer[] = []
        for await (const c of req) chunks.push(c as Buffer)
        const body = Buffer.concat(chunks)
        const core = await import('./server/core.js')
        const send = (o: { status: number; json: unknown }) => {
          res.statusCode = o.status
          res.setHeader('Content-Type', 'application/json')
          res.end(JSON.stringify(o.json))
        }
        try {
          if (req.url.startsWith('/api/agent/chat')) {
            const parsed = JSON.parse(body.toString('utf8') || '{}')
            send(await core.handleChat({ ...parsed, authHeader: (req.headers.authorization as string) || '' }))
          } else if (req.url.startsWith('/api/agent/ocr')) {
            send(await core.handleOcr(body, (req.headers.authorization as string) || ''))
          } else if (req.url.startsWith('/api/agent/health')) {
            send(await core.handleHealth())
          } else if (req.url.startsWith('/api/agent/status')) {
            send(await core.handleStatus())
          } else next()
        } catch (e) {
          send({ status: 500, json: { error: e instanceof Error ? e.message : String(e) } })
        }
      })
    },
  }
}

// https://vite.dev/config/
export default defineConfig({
  plugins: [vue(), tailwindcss(), VitePWA({
    registerType: 'autoUpdate',
    includeAssets: ['images/notebook/*', 'pdf.worker.min.*'],
    manifest: {
      name: 'Rankify PDF2CBT',
      short_name: 'Rankify',
      description: 'Any PDF → real CBT exam. Offline capable.',
      theme_color: '#2F5FE0',
      background_color: '#FBF8F1',
      display: 'standalone',
      start_url: '/',
      icons: [
        { src: '/images/notebook/tape-washi.webp', sizes: '192x192', type: 'image/webp' },
        { src: '/images/notebook/tape-washi.webp', sizes: '512x512', type: 'image/webp', purpose: 'any maskable' }
      ]
    },
    workbox: {
      globPatterns: ['**/*.{js,css,html,woff,woff2,webp,svg}'],
      runtimeCaching: [
        { urlPattern: /^https:\/\/cdn\.jsdelivr\.net\/.*/i, handler: 'CacheFirst', options: { cacheName: 'cdn-cache', expiration: { maxEntries: 30, maxAgeSeconds: 60*60*24*30 } } }
      ]
    }
  }), vercelApiDev()],
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
