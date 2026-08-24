<script setup lang="ts">
import { ref, onMounted, watch, nextTick } from "vue"
import { Cropper, RectangleStencil } from "vue-advanced-cropper"
import "vue-advanced-cropper/dist/style.css"
import { loadPdfFromBuffer, renderPageToCanvas } from "@/lib/pdf"

const props = defineProps<{ pdfBuffer?: ArrayBuffer | null; initialPage?: number }>()
const emit = defineEmits<{ (e: "cropped", dataUrl: string): void; (e: "close"): void }>()

const pageNum = ref(props.initialPage || 1)
const totalPages = ref(1)
const pageSrc = ref<string | null>(null)
const loadingPage = ref(false)
const pdfDocRef = ref<any>(null)
const cropperRef = ref<any>(null)

// live preview + quality chip
const previewUrl = ref<string | null>(null)
const quality = ref<"good" | "ok" | "bad">("good")
const cropSize = ref<{ w: number; h: number } | null>(null)

onMounted(async () => {
  if (!props.pdfBuffer) return
  try {
    const doc = await loadPdfFromBuffer(props.pdfBuffer)
    pdfDocRef.value = doc
    totalPages.value = doc.numPages
    await render()
  } catch (e) {
    console.warn("[cropper] mount load failed:", e)
  }
})

// pdfBuffer can arrive async (Dexie read) after mount — render when it lands
watch(() => props.pdfBuffer, async (b) => {
  if (!b || pdfDocRef.value) return
  try {
    const doc = await loadPdfFromBuffer(b)
    pdfDocRef.value = doc
    totalPages.value = doc.numPages
    await render()
  } catch (e) {
    console.warn("[cropper] failed to load PDF:", e)
  }
})

async function render() {
  if (!pdfDocRef.value) return
  loadingPage.value = true
  try {
    const c = await renderPageToCanvas(pdfDocRef.value, pageNum.value, 2)
    pageSrc.value = c.toDataURL("image/png")
    // reset crop on page change
    await nextTick()
    cropperRef.value?.reset?.()
    previewUrl.value = null
  } finally {
    loadingPage.value = false
  }
}

watch(pageNum, render)

function goto(p: number) {
  if (p >= 1 && p <= totalPages.value && p !== pageNum.value) pageNum.value = p
}

function onCropChange() {
  const res = cropperRef.value?.getResult?.()
  if (!res?.canvas) return
  const canvas: HTMLCanvasElement = res.canvas
  previewUrl.value = canvas.toDataURL("image/png")
  const w = canvas.width
  const h = Math.max(canvas.height, 1)
  cropSize.value = { w, h }
  const ratio = w / h
  const stencilRatio = (res.stencilSize ? res.stencilSize.width / res.stencilSize.height : ratio) || ratio
  const delta = Math.abs(ratio - stencilRatio) / Math.max(stencilRatio, ratio)
  const px = Math.min(w, h, 1e9)
  quality.value = delta < 0.08 && px > 220 ? "good" : delta < 0.22 && px > 90 ? "ok" : "bad"
}

function saveCrop() {
  const res = cropperRef.value?.getResult?.()
  if (!res?.canvas || !cropSize.value) return
  emit("cropped", res.canvas.toDataURL("image/png"))
}
</script>

<template>
  <div class="fixed inset-0 z-50 bg-ink/50 backdrop-blur-sm flex items-center justify-center p-3 md:p-6" @click.self="emit('close')">
    <div class="bg-white rounded-2xl w-full max-w-[1100px] max-h-[94vh] flex flex-col overflow-hidden shadow-[0_30px_80px_-30px_rgba(35,32,58,0.5)] ring-1 ring-ink/10">

      <!-- Header -->
      <div class="shrink-0 border-b border-ink/10 px-5 py-3 flex flex-wrap items-center gap-x-4 gap-y-2">
        <div class="text-sm font-bold font-display tracking-tight mr-auto">
          Crop diagram
          <span v-if="pdfDocRef" class="font-mono text-xs font-normal text-ink/45 ml-2">source PDF · {{ totalPages }} pages</span>
        </div>

        <!-- Page navigation -->
        <div v-if="pdfDocRef" class="flex items-center gap-1.5">
          <button class="px-2.5 py-1.5 rounded-lg border border-ink/15 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" :disabled="pageNum<=1" @click="goto(pageNum-1)">‹</button>
          <div class="flex items-center gap-1 font-mono text-xs text-ink/60">
            Page
            <select :value="pageNum" @change="goto(Number(($event.target as HTMLSelectElement).value))" class="border border-ink/15 rounded-md px-1.5 py-1 bg-paper text-ink focus:outline-none focus:ring-2 focus:ring-pen/40">
              <option v-for="n in totalPages" :key="n" :value="n">{{ n }}</option>
            </select>
            / {{ totalPages }}
          </div>
          <button class="px-2.5 py-1.5 rounded-lg border border-ink/15 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" :disabled="pageNum>=totalPages" @click="goto(pageNum+1)">›</button>
        </div>

        <button @click="emit('close')" class="w-8 h-8 rounded-full hover:bg-ink/5 grid place-items-center text-ink/60 text-lg leading-none">✕</button>
      </div>

      <!-- Body -->
      <div class="flex-1 min-h-0 flex flex-col lg:flex-row gap-4 p-4 md:p-5">
        <!-- Cropper -->
        <div class="relative w-full lg:w-[62%] rounded-xl border border-ink/12 bg-paper overflow-hidden" style="height: 68vh">
          <div v-if="loadingPage || (!pageSrc && pdfDocRef)" class="absolute inset-0 z-10 grid place-items-center bg-white/70 text-sm text-ink/55 font-medium">Rendering page {{ pageNum }}…</div>
          <div v-if="!pdfDocRef" class="absolute inset-0 grid place-items-center text-sm text-ink/50 px-6 text-center">
            {{ props.pdfBuffer ? "Loading PDF…" : "No PDF loaded — upload it in Extract first" }}
          </div>
          <Cropper
            v-else-if="pageSrc"
            ref="cropperRef"
            :src="pageSrc"
            :stencil-component="RectangleStencil"
            :canvas="{ minHeight: 120, minWidth: 120 }"
            style="width: 100%; height: 100%"
            class="bg-paper"
            @change="onCropChange"
          />
        </div>

        <!-- Side panel -->
        <aside class="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <div>
            <div class="text-xs font-bold text-ink/70 uppercase tracking-wider">Live preview</div>
            <div class="mt-2 rounded-xl border border-dashed border-ink/15 bg-paper min-h-36 grid place-items-center p-2.5">
              <img v-if="previewUrl" :src="previewUrl" class="max-w-full max-h-56 rounded shadow-sm" />
              <span v-else class="text-xs text-ink/40 text-center px-4">drag the box — live preview lands here</span>
            </div>
          </div>

          <div class="rounded-xl border border-ink/10 bg-paper p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-ink/70 uppercase tracking-wider">Quality</span>
              <span v-if="cropSize" :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', quality==='good' ? 'bg-correct/15 text-green-700' : quality==='ok' ? 'bg-hlyellow/60 text-ink' : 'bg-redmargin/10 text-redmargin']">
                {{ quality === "good" ? "✅ Good" : quality === "ok" ? "⚠️ Acceptable" : "❌ Too stretched" }}
              </span>
              <span v-else class="font-mono text-[10px] text-ink/35">—</span>
            </div>
            <div v-if="cropSize" class="font-mono text-[10px] text-ink/45">{{ cropSize.w }} × {{ cropSize.h }} px</div>
            <p class="font-hand text-lg text-ink/45 -rotate-1 leading-tight">drag corners &amp; edges,<br/>then save it onto the question</p>
          </div>

          <div class="mt-auto flex gap-2">
            <button class="flex-1 px-4 py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/65 hover:border-ink/30 hover:text-ink transition-colors" @click="emit('close')">Cancel</button>
            <button class="flex-1 px-4 py-2.5 rounded-xl bg-pen text-white text-xs font-bold disabled:opacity-40 transition-transform hover:-translate-y-0.5" :disabled="!cropSize" @click="saveCrop">Save Diagram</button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>
