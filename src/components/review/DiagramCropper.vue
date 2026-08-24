<script setup lang="ts">
import { ref, onMounted, watch } from "vue"
import { loadPdfFromBuffer, renderPageToCanvas } from "@/lib/pdf"

const props = defineProps<{ pdfBuffer?: ArrayBuffer | null; initialPage?: number }>()
const emit = defineEmits<{ (e: "cropped", dataUrl: string): void; (e: "close"): void }>()

const pageNum = ref(props.initialPage || 1)
const totalPages = ref(1)
const canvasRef = ref<HTMLCanvasElement | null>(null)
const previewUrl = ref<string | null>(null)
const pdfDocRef = ref<any>(null)

// crop rect in % (0-1)
const sel = ref<{x: number, y: number, w: number, h: number} | null>(null)
let start: {x:number,y:number} | null = null
let dragging = false

onMounted(async () => {
  if (!props.pdfBuffer) return
  const doc = await loadPdfFromBuffer(props.pdfBuffer)
  pdfDocRef.value = doc
  totalPages.value = doc.numPages
  await render()
})

async function render() {
  if (!pdfDocRef.value || !canvasRef.value) return
  const c = await renderPageToCanvas(pdfDocRef.value, pageNum.value, 1.5)
  const target = canvasRef.value
  target.width = c.width
  target.height = c.height
  const ctx = target.getContext("2d")!
  ctx.clearRect(0,0,target.width,target.height)
  ctx.drawImage(c,0,0)
}

watch(pageNum, render)

function toPercent(e: MouseEvent) {
  if (!canvasRef.value) return {x:0,y:0}
  const r = canvasRef.value.getBoundingClientRect()
  return { x: (e.clientX - r.left)/r.width, y: (e.clientY - r.top)/r.height }
}

function onDown(e: MouseEvent) {
  dragging = true
  start = toPercent(e)
  sel.value = { x: start.x, y: start.y, w: 0, h: 0 }
}
function onMove(e: MouseEvent) {
  if (!dragging || !start || !sel.value) return
  const p = toPercent(e)
  sel.value = { x: Math.min(start.x, p.x), y: Math.min(start.y, p.y), w: Math.abs(p.x-start.x), h: Math.abs(p.y-start.y) }
}
function onUp() { dragging = false }

async function doCrop() {
  if (!canvasRef.value || !sel.value) return
  const s = sel.value
  if (s.w < 0.02 || s.h < 0.02) return // too small
  const src = canvasRef.value
  const sx = Math.floor(s.x * src.width)
  const sy = Math.floor(s.y * src.height)
  const sw = Math.floor(s.w * src.width)
  const sh = Math.floor(s.h * src.height)
  const out = document.createElement("canvas")
  out.width = sw; out.height = sh
  const ctx = out.getContext("2d")!
  ctx.drawImage(src, sx, sy, sw, sh, 0,0, sw, sh)
  const url = out.toDataURL("image/png")
  previewUrl.value = url
  emit("cropped", url)
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-ink/45 backdrop-blur-sm flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-2xl max-w-5xl w-full max-h-[90vh] overflow-auto shadow-[0_30px_80px_-30px_rgba(35,32,58,0.5)]">
      <div class="sticky top-0 bg-white/95 backdrop-blur border-b border-ink/10 px-5 py-3.5 flex flex-wrap items-center justify-between gap-2 rounded-t-2xl">
        <div class="text-sm font-bold font-display tracking-tight">Crop diagram <span class="font-mono text-xs font-normal text-ink/50 ml-2">page {{ pageNum }}/{{ totalPages }} — drag on the sheet</span></div>
        <div class="flex gap-2">
          <button class="px-3.5 py-1.5 border-2 border-ink/12 rounded-lg text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors" :disabled="pageNum<=1" @click="pageNum--">← Prev</button>
          <button class="px-3.5 py-1.5 border-2 border-ink/12 rounded-lg text-xs font-bold text-ink/70 hover:border-ink/30 transition-colors" :disabled="pageNum>=totalPages" @click="pageNum++">Next →</button>
          <button class="px-4 py-1.5 rounded-lg bg-pen text-white text-xs font-bold disabled:opacity-40" @click="doCrop" :disabled="!sel">Crop →</button>
          <button class="px-3.5 py-1.5 border-2 border-ink/12 rounded-lg text-xs font-bold text-ink/70 hover:border-redmargin hover:text-redmargin transition-colors" @click="emit('close')">Close</button>
        </div>
      </div>

      <div class="p-5 flex flex-col md:flex-row gap-5">
        <div class="relative rounded-xl border border-ink/12 bg-paper overflow-hidden flex-1" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp">
          <canvas ref="canvasRef" class="max-w-full block"></canvas>
          <div v-if="sel" class="absolute border-2 border-pen bg-pen/15 pointer-events-none" :style="{ left: sel.x*100+'%', top: sel.y*100+'%', width: sel.w*100+'%', height: sel.h*100+'%' }"></div>
          <div v-if="!pdfDocRef" class="absolute inset-0 grid place-items-center text-sm text-ink/50">No PDF loaded — upload in Extract first</div>
        </div>
        <div class="w-full md:w-64 shrink-0">
          <div class="text-xs font-bold text-ink/70 uppercase tracking-wider">Preview</div>
          <div class="mt-2 rounded-xl border border-dashed border-ink/15 bg-paper min-h-32 grid place-items-center p-2.5">
            <img v-if="previewUrl" :src="previewUrl" class="max-w-full rounded" />
            <span v-else class="text-xs text-ink/40 text-center px-4">your cropped figure lands here</span>
          </div>
          <p class="font-hand text-lg text-ink/45 mt-3 -rotate-1">drag a rectangle → crop → done</p>
          <div class="text-[11px] text-ink/40 mt-1">pdfjs-dist worker · saves as dataURL</div>
        </div>
      </div>
    </div>
  </div>
</template>
