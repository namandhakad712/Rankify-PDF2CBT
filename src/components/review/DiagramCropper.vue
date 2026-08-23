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
  <div class="fixed inset-0 z-50 bg-black/50 flex items-center justify-center p-4" @click.self="emit('close')">
    <div class="bg-white rounded-xl max-w-5xl w-full max-h-[90vh] overflow-auto">
      <div class="sticky top-0 bg-white border-b px-4 py-2 flex items-center justify-between">
        <div class="text-sm font-medium">Crop Diagram — Page {{ pageNum }}/{{ totalPages }} — drag on canvas</div>
        <div class="flex gap-2">
          <button class="px-3 py-1 border rounded text-xs" :disabled="pageNum<=1" @click="pageNum--">Prev</button>
          <button class="px-3 py-1 border rounded text-xs" :disabled="pageNum>=totalPages" @click="pageNum++">Next</button>
          <button class="px-3 py-1 rounded bg-zinc-900 text-white text-xs" @click="doCrop" :disabled="!sel">Crop →</button>
          <button class="px-3 py-1 border rounded text-xs" @click="emit('close')">Close</button>
        </div>
      </div>

      <div class="p-4 flex gap-4">
        <div class="relative border bg-zinc-100 overflow-hidden flex-1" @mousedown="onDown" @mousemove="onMove" @mouseup="onUp" @mouseleave="onUp">
          <canvas ref="canvasRef" class="max-w-full block"></canvas>
          <div v-if="sel" class="absolute border-2 border-violet-600 bg-violet-200/30 pointer-events-none" :style="{ left: sel.x*100+'%', top: sel.y*100+'%', width: sel.w*100+'%', height: sel.h*100+'%' }"></div>
          <div v-if="!pdfDocRef" class="absolute inset-0 grid place-items-center text-sm text-zinc-500">No PDF loaded — upload in Extract first</div>
        </div>
        <div class="w-64 shrink-0">
          <div class="text-xs font-medium">Preview</div>
          <div class="mt-2 border rounded bg-zinc-50 min-h-32 grid place-items-center p-2">
            <img v-if="previewUrl" :src="previewUrl" class="max-w-full" />
            <span v-else class="text-xs text-zinc-400">Cropped image appears here</span>
          </div>
          <div class="text-[11px] text-zinc-400 mt-2">Drag rectangle → Crop → it auto-adds to question diagrams[]. Worker via pdfjs-dist + ?url.</div>
        </div>
      </div>
    </div>
  </div>
</template>
