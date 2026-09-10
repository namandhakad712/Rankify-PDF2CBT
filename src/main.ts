import { createApp } from 'vue'
import { createHead } from '@vueuse/head'
import { inject } from '@vercel/analytics'
import App from './App.vue'
import { router } from './router'
import './style.css'
import 'katex/dist/katex.min.css'

// Analytics — no-ops outside Vercel deployments
inject()

// GTM (optional, open-source safe) — loads ONLY if VITE_GTM_ID is set in env.
// No ID in repo → dev/forks send nothing. See src/lib/gtm.ts + .env.example.
import { initGtm, trackPage } from './lib/gtm'
initGtm()
router.afterEach((to) => trackPage(to.fullPath))

// Storage persistence — ask browser to never evict saved papers/results
if (navigator.storage?.persist) navigator.storage.persist().catch(() => {})

const app = createApp(App)
app.use(router)
app.use(createHead())
app.mount('#app')
