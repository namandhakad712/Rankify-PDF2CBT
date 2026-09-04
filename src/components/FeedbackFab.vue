<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'

const route = useRoute()
const open = ref(false)
const sent = ref(false)
const mood = ref('')
const hardest = ref('')
const exam = ref('')
const nps = ref('')
const text = ref('')
const loading = ref(false)
const err = ref('')

async function submit() {
  if (!text.value.trim() && !mood.value && !hardest.value) { err.value = 'Write something or pick a mood — 1 tap is enough 🙂'; return }
  err.value = ''
  loading.value = true
  try {
    const body = { mood: mood.value, hardest: hardest.value, exam: exam.value, nps: nps.value, text: text.value.trim(), path: route.fullPath }
    const r = await fetch('/api/feedback', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) })
    // if open-source deploy has no webhook, it still returns 200; we store locally too for owner to copy
    if (!r.ok) throw new Error(await r.text())
    try { const arr = JSON.parse(localStorage.getItem('rpdf2cbt-feedback') || '[]'); arr.push({ ...body, at: new Date().toISOString() }); localStorage.setItem('rpdf2cbt-feedback', JSON.stringify(arr.slice(-50))) } catch {}
    sent.value = true
    setTimeout(() => { open.value = false; setTimeout(() => { sent.value = false; mood.value=''; hardest.value=''; exam.value=''; nps.value=''; text.value='' }, 300) }, 1800)
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e)
    // fallback: open GitHub issue prefilled — no token needed, 100% free & open-source
    const title = encodeURIComponent(`Feedback: ${mood.value || hardest.value || 'student'} — ${exam.value || ''}`.slice(0, 80))
    const bodyTxt = encodeURIComponent(`**Mood:** ${mood.value}\n**Hardest:** ${hardest.value}\n**Exam:** ${exam.value}\n**NPS:** ${nps.value}\n**Page:** ${route.fullPath}\n\n**Message:**\n${text.value}\n\n_Sent from Rankify FAB fallback — no webhook configured._`)
    window.open(`https://github.com/namandhakad712/Rankify-PDF2CBT/issues/new?title=${title}&body=${bodyTxt}`, '_blank')
    err.value = ''
    // still mark sent locally
    sent.value = true
    setTimeout(() => { open.value = false; sent.value = false }, 1600)
  } finally { loading.value = false }
}
</script>

<template>
  <div class="fixed bottom-4 right-4 z-40 flex flex-col items-end gap-2 pointer-events-none">
    <Transition enter-active-class="transition duration-200 ease-out" enter-from-class="opacity-0 translate-y-2 scale-95" leave-active-class="transition duration-150 ease-in" leave-to-class="opacity-0 translate-y-2 scale-95">
      <div v-if="open" class="pointer-events-auto w-[92vw] max-w-[360px] rounded-2xl bg-white shadow-[0_24px_60px_-18px_rgba(35,32,58,0.35)] ring-1 ring-ink/[0.08] p-4 max-h-[82vh] overflow-y-auto">
        <div class="flex items-center justify-between gap-2">
          <div class="font-display font-extrabold tracking-tight">Quick feedback <span class="font-hand font-normal text-ink/50">— 10s</span></div>
          <button @click="open=false" class="w-8 h-8 grid place-items-center rounded-full hover:bg-ink/5 text-ink/40">✕</button>
        </div>
        <p class="text-xs text-ink/55 mt-1">What should we fix next? Your answer goes straight to the maker — free & open-source, no data sold.</p>

        <div v-if="sent" class="mt-4 rounded-xl bg-correct/[0.08] border border-correct/20 p-4 text-center">
          <div class="text-2xl">🙏</div>
          <div class="font-bold text-sm mt-1">Thank you — got it!</div>
          <div class="text-xs text-ink/55">If webhook not set, it’s saved locally; we also opened GitHub as backup.</div>
        </div>
        <template v-else>
          <div class="mt-4 flex gap-1.5">
            <button v-for="m in [{k:'😡',l:'bad'},{k:'😐',l:'ok'},{k:'🤩',l:'love'}]" :key="m.l" @click="mood=m.l" :class="['flex-1 py-2.5 rounded-xl border-2 text-lg transition-colors', mood===m.l ? 'bg-pen text-white border-pen' : 'bg-paper border-ink/10 hover:border-ink/20']">{{ m.k }}</button>
          </div>
          <div class="mt-3 grid gap-2">
            <select v-model="hardest" class="w-full rounded-xl border border-ink/12 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/30">
              <option value="">What was hardest?</option>
              <option>PDF upload</option>
              <option>Extraction / AI</option>
              <option>Diagram crop</option>
              <option>Timer / CBT feel</option>
              <option>Results / mistakes PDF</option>
              <option>Language</option>
              <option>Other</option>
            </select>
            <div class="grid grid-cols-2 gap-2">
              <input v-model="exam" placeholder="Exam? JEE/NEET/Boards" class="rounded-xl border border-ink/12 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/30" />
              <select v-model="nps" class="rounded-xl border border-ink/12 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/30">
                <option value="">Share? 0-10</option>
                <option v-for="n in 11" :key="n-1" :value="String(n-1)">{{ n-1 }}</option>
              </select>
            </div>
            <textarea v-model="text" rows="3" placeholder="What do you wish it did? One line is enough..." class="w-full rounded-xl border border-ink/12 bg-paper px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-pen/30 resize-none"></textarea>
          </div>
          <p v-if="err" class="text-xs text-redmargin mt-2">{{ err }}</p>
          <button @click="submit" :disabled="loading" class="mt-3 w-full py-3 rounded-xl bg-pen text-white text-sm font-bold hover:bg-pen/90 disabled:opacity-50 transition-colors">{{ loading ? 'Sending…' : 'Send — 1 tap' }}</button>
          <p class="text-[10px] text-ink/35 text-center mt-2">No signup · Free-tier: if you don’t set <code class="bg-paper px-1 rounded border border-ink/10">FEEDBACK_WEBHOOK_URL</code>, we save locally + open GitHub issue fallback.</p>
        </template>
      </div>
    </Transition>
    <button @click="open=!open" class="pointer-events-auto w-14 h-14 rounded-full bg-ink text-white shadow-[0_12px_30px_-10px_rgba(35,32,58,0.45)] grid place-items-center hover:scale-105 transition-transform" aria-label="Feedback">
      <span v-if="!open" class="text-xl">💬</span><span v-else>✕</span>
    </button>
  </div>
</template>
