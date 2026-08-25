<script setup lang="ts">
import { ref, onMounted, watch, nextTick, markRaw } from "vue"
import { Cropper, RectangleStencil } from "vue-advanced-cropper"
import "vue-advanced-cropper/dist/style.css"
import { loadPdfFromBuffer, renderPageToCanvas } from "@/lib/pdf"
import { t } from "@/lib/i18n"

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
const autoFocus = ref(true)

/** zoom helpers — enlarge/shrink the visible sheet so wasted area stays minimal */
function zoomBy(factor: number) {
  const c = cropperRef.value
  try {
    if (typeof c?.zoom === "function") c.zoom(factor)
    else {
      // fallback: scale stencil around its center via setCoordinates
      const r = c?.getResult?.()
      const co = r?.coordinates
      const img = r?.imageSize
      if (!co || !img) return
      const w = Math.min(img.width, co.width * factor)
      const h = Math.min(img.height, co.height * factor)
      c.setCoordinates({
        width: w,
        height: h,
        left: Math.max(0, co.left - (w - co.width) / 2),
        top: Math.max(0, co.top - (h - co.height) / 2),
      })
    }
  } catch { /* api variance across versions */ }
}

function fitStencil() {
  const c = cropperRef.value
  try {
    const r = c?.getResult?.()
    const img = r?.imageSize
    if (!img) return c?.reset?.()
    const w = img.width * 0.72
    const h = img.height * 0.55
    c.setCoordinates({ width: w, height: h, left: (img.width - w) / 2, top: (img.height - h) / 2 })
  } catch { /* ignore */ }
}

/** keep stencil generously sized right after a new page renders */
function initStencil() {
  try {
    const r = cropperRef.value?.getResult?.()
    const img = r?.imageSize
    if (!img) return
    const w = img.width * 0.62
    const h = img.height * 0.46
    cropperRef.value?.setCoordinates({ width: w, height: h, left: (img.width - w) / 2, top: (img.height - h) / 2 })
  } catch { /* ignore */ }
}

onMounted(async () => {
  if (!props.pdfBuffer) return
  try {
    const doc = await loadPdfFromBuffer(props.pdfBuffer)
    pdfDocRef.value = markRaw(doc)
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
    pdfDocRef.value = markRaw(doc)
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

// first paint of a page → pre-size the stencil so dark unused margins start small
watch(pageSrc, () => { void nextTick().then(() => { initStencil(); onCropChange() }) })

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
          {{ t('cropper.title') }}
          <span v-if="pdfDocRef" class="font-mono text-xs font-normal text-ink/45 ml-2">{{ t('cropper.sourcePdf') }} · {{ totalPages }} {{ t('cropper.pages') }}</span>
        </div>

        <!-- Page navigation -->
        <div v-if="pdfDocRef" class="flex items-center gap-1.5">
          <button class="px-2.5 py-1.5 rounded-lg border border-ink/15 text-xs font-bold text-ink/70 hover:border-pen hover:text-pen transition-colors disabled:opacity-40 disabled:pointer-events-none" :disabled="pageNum<=1" @click="goto(pageNum-1)">‹</button>
          <div class="flex items-center gap-1 font-mono text-xs text-ink/60">
            {{ t('cropper.page') }}
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
          <!-- floating zoom controls -->
          <div v-if="pdfDocRef" class="absolute top-2.5 right-2.5 z-20 flex items-center gap-1 rounded-xl bg-white/95 ring-1 ring-ink/10 shadow-sm px-1 py-0.5">
            <button @click="zoomBy(1.25)" :title="t('cropper.zoomInT')" class="w-7 h-7 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/70 font-bold">＋</button>
            <button @click="zoomBy(0.8)" :title="t('cropper.zoomOutT')" class="w-7 h-7 rounded-lg hover:bg-ink/5 grid place-items-center text-ink/70 font-bold">－</button>
            <button @click="fitStencil" :title="t('cropper.fitT')" class="px-2 h-7 rounded-lg hover:bg-ink/5 grid place-items-center text-[10px] font-mono font-bold text-ink/60">{{ t('cropper.fitLabel') }}</button>
            <button @click="autoFocus = !autoFocus; if (autoFocus) initStencil()" :class="['px-2 h-7 rounded-lg text-[10px] font-mono font-bold transition-colors', autoFocus ? 'bg-pen text-white' : 'text-ink/55 hover:text-pen']" :title="t('cropper.autoT')">{{ t('cropper.autoLabel') }}</button>
          </div>
          <div v-if="loadingPage || (!pageSrc && pdfDocRef)" class="absolute inset-0 z-10 grid place-items-center bg-white/70 text-sm text-ink/55 font-medium">{{ t('cropper.rendering') }}{{ pageNum }}…</div>
          <div v-if="!pdfDocRef" class="absolute inset-0 grid place-items-center text-sm text-ink/50 px-6 text-center">
            {{ props.pdfBuffer ? t('cropper.loading') : t('cropper.noPdf') }}
          </div>
          <Cropper
            v-else-if="pageSrc"
            ref="cropperRef"
            :src="pageSrc"
            :stencil-component="RectangleStencil"
            :auto-zoom="true"
            :canvas="{ minHeight: 120, minWidth: 120 }"
            :stencil-props="{
              movable: true,
              resizable: true,
              handlers: { eastNorth: true, north: true, westNorth: true, west: true, westSouth: true, south: true, eastSouth: true, east: true },
              lines: { north: true, west: true, south: true, east: true },
            }"
            style="width: 100%; height: 100%"
            class="bg-paper"
            @change="onCropChange"
          />
        </div>

        <!-- Side panel -->
        <aside class="w-full lg:w-64 shrink-0 flex flex-col gap-4">
          <div>
            <div class="text-xs font-bold text-ink/70 uppercase tracking-wider">{{ t('cropper.preview') }}</div>
            <div class="mt-2 rounded-xl border border-dashed border-ink/15 bg-paper min-h-36 grid place-items-center p-2.5">
              <img v-if="previewUrl" :src="previewUrl" class="max-w-full max-h-56 rounded shadow-sm" />
              <span v-else class="text-xs text-ink/40 text-center px-4">{{ t('cropper.previewHint') }}</span>
            </div>
          </div>

          <div class="rounded-xl border border-ink/10 bg-paper p-3 space-y-2">
            <div class="flex items-center justify-between">
              <span class="text-xs font-bold text-ink/70 uppercase tracking-wider">{{ t('cropper.quality') }}</span>
              <span v-if="cropSize" :class="['px-2 py-0.5 rounded-full text-[10px] font-bold', quality==='good' ? 'bg-correct/15 text-green-700' : quality==='ok' ? 'bg-hlyellow/60 text-ink' : 'bg-redmargin/10 text-redmargin']">
                {{ quality === "good" ? "✅ " + t("cropper.qGood") : quality === "ok" ? "⚠️ " + t("cropper.qOk") : "❌ " + t("cropper.qBad") }}
              </span>
              <span v-else class="font-mono text-[10px] text-ink/35">—</span>
            </div>
            <div v-if="cropSize" class="font-mono text-[10px] text-ink/45">{{ cropSize.w }} × {{ cropSize.h }} px</div>
            <p class="font-hand text-lg text-ink/45 -rotate-1 leading-tight">{{ t('cropper.hint1') }}<br/>{{ t('cropper.hint2') }}</p>
          </div>

          <div class="mt-auto flex gap-2">
            <button class="flex-1 px-4 py-2.5 rounded-xl border-2 border-ink/12 text-xs font-bold text-ink/65 hover:border-ink/30 hover:text-ink transition-colors" @click="emit('close')">{{ t('cropper.cancel') }}</button>
            <button class="flex-1 px-4 py-2.5 rounded-xl bg-pen text-white text-xs font-bold disabled:opacity-40 transition-transform hover:-translate-y-0.5" :disabled="!cropSize" @click="saveCrop">{{ t('cropper.save') }}</button>
          </div>
        </aside>
      </div>
    </div>
  </div>
</template>

<style scoped>
/* stencil — pen-blue selection + dark surround that shrinks as you crop (auto-zoom) */
:deep(.vue-rectangle-stencil) {
  border: 2px solid rgba(47, 95, 224, 0.85);
  box-shadow: 0 0 0 9999px rgba(35, 32, 58, 0.5);
}
:deep(.vue-handler-wrapper) {
  width: 10px;
  height: 10px;
  background: white;
  border: 2px solid #2f5fe0;
  border-radius: 2px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}
@media (min-width: 640px) {
  :deep(.vue-handler-wrapper) {
    width: 12px;
    height: 12px;
  }
}
:deep(.vue-line-wrapper),
:deep(.vue-simple-line) {
  border-color: rgba(47, 95, 224, 0.5);
}
</style>
