<script setup lang="ts">
import { computed } from "vue"
import { t } from "@/lib/i18n"
import pdfSvg from "@/assets/pdf.svg"
import textSvg from "@/assets/text.svg"
import pdfOcrSvg from "@/assets/pdf-ocr.svg"
import pagesSvg from "@/assets/pages.svg"
import aiAgentSvg from "@/assets/ai-agent.svg"
import jsonSvg from "@/assets/json-reference.svg"

export type PipeStage = "idle" | "read" | "ocr" | "chunks" | "agent" | "done"

const props = defineProps<{
  stage: PipeStage
  ocrUsed: boolean
  providerName: string
  modelName: string
  progress: { index: number; status: string }[]
}>()

const ORDER: PipeStage[] = ["idle", "read", "ocr", "chunks", "agent", "done"]
const idx = computed(() => ORDER.indexOf(props.stage))

type St = "idle" | "active" | "done"
function st(of: PipeStage): St {
  const i = ORDER.indexOf(of)
  if (i <= 0 || i > idx.value) return i === idx.value && props.stage !== "idle" ? "active" : "idle"
  return "done"
}

const ocrSt = computed<St>(() => {
  // OCR node skipped entirely when the PDF had a text layer
  if (!props.ocrUsed && idx.value >= ORDER.indexOf("chunks") && props.stage !== "idle") return "done"
  return st("ocr")
})

const cls = (s: St) =>
  s === "active"
    ? "ring-2 ring-pen shadow-[0_0_0_4px_rgba(47,95,224,0.12)] animate-pulse bg-white"
    : s === "done"
      ? "ring-1 ring-correct/40 bg-correct/[0.06]"
      : "ring-1 ring-ink/10 bg-paper opacity-60"

const arrowCls = (reached: boolean) => (reached ? "text-pen" : "text-ink/25")

const chunkCells = computed(() =>
  props.progress.slice(0, 24).map((p) => ({
    i: p.index,
    cls:
      p.status === "done"
        ? "bg-correct/70"
        : p.status === "running"
          ? "bg-pen animate-pulse"
          : p.status === "failed"
            ? "bg-redmargin"
            : "bg-ink/15",
  })),
)

const iconCls = (s: St) => (s === "idle" ? "opacity-30" : "opacity-100")
</script>

<template>
  <div class="rounded-2xl border border-dashed border-ink/20 bg-gradient-to-br from-paper to-white p-4 md:p-5 overflow-x-auto">
    <div class="flex items-stretch gap-2 min-w-[760px]">
      <!-- PDF -->
      <div :class="['flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[92px]', cls(st('read'))]">
        <img :src="pdfSvg" alt="" class="w-7 h-7" :class="iconCls(st('read'))" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase">PDF</span>
      </div>
      <div class="flex items-center font-mono text-lg" :class="arrowCls(idx >= ORDER.indexOf('ocr') || stage==='read')">›</div>

      <!-- Text layer check -->
      <div :class="['flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[92px]', cls(st('read'))]">
        <img :src="textSvg" alt="" class="w-7 h-7" :class="iconCls(st('read'))" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase text-center leading-tight">{{ t('pipeline.text') }}<br />{{ t('pipeline.layer') }}</span>
        <span v-if="idx > ORDER.indexOf('read')" class="font-mono text-[8px]" :class="ocrUsed ? 'text-redmargin' : 'text-green-700'">{{ ocrUsed ? t('pipeline.scanned') : t('pipeline.found') }}</span>
      </div>
      <div class="flex items-center font-mono text-lg" :class="arrowCls(idx > ORDER.indexOf('read'))">›</div>

      <!-- Mistral OCR -->
      <div :class="['relative flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[92px]', cls(ocrSt)]">
        <img :src="pdfOcrSvg" alt="" class="w-7 h-7" :class="ocrSt === 'active' ? 'opacity-100 animate-pulse' : iconCls(ocrSt)" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase text-center leading-tight">Mistral<br />OCR</span>
        <span v-if="ocrSt !== 'idle'" class="absolute -top-2 right-1 font-mono text-[8px] bg-hlyellow text-ink px-1 rounded-full">{{ ocrUsed ? t('pipeline.on') : t('pipeline.skip') }}</span>
      </div>
      <div class="flex items-center font-mono text-lg" :class="arrowCls(idx > ORDER.indexOf('ocr'))">›</div>

      <!-- Page chunks -->
      <div :class="['flex flex-col items-center gap-1.5 rounded-xl px-3 py-3 min-w-[110px]', cls(st('chunks'))]">
        <img :src="pagesSvg" alt="" class="w-7 h-7" :class="iconCls(st('chunks'))" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase">{{ t('pipeline.pages') }}</span>
        <div v-if="chunkCells.length" class="grid grid-cols-8 gap-0.5">
          <span v-for="c in chunkCells" :key="c.i" class="w-1.5 h-1.5 rounded-[2px]" :class="c.cls" />
        </div>
      </div>
      <div class="flex items-center font-mono text-lg" :class="arrowCls(idx > ORDER.indexOf('chunks'))">›</div>

      <!-- AI Agent -->
      <div :class="['flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[130px]', cls(st('agent'))]">
        <img :src="aiAgentSvg" alt="" class="w-7 h-7" :class="st('agent') === 'active' ? 'opacity-100 animate-pulse' : iconCls(st('agent'))" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase">AI Agent</span>
        <span class="font-mono text-[8px] text-ink/55 truncate max-w-[120px]" :title="providerName + ' · ' + modelName">{{ providerName }}<br />{{ modelName }}</span>
      </div>
      <div class="flex items-center font-mono text-lg" :class="arrowCls(idx >= ORDER.indexOf('done'))">›</div>

      <!-- JSON out -->
      <div :class="['flex flex-col items-center gap-1 rounded-xl px-3 py-3 min-w-[92px]', cls(st('done'))]">
        <img :src="jsonSvg" alt="" class="w-7 h-7" :class="iconCls(st('done'))" />
        <span class="font-mono text-[9px] font-bold tracking-wider uppercase">JSON</span>
        <span v-if="stage === 'done'" class="font-mono text-[8px] text-green-700">{{ t('pipeline.ready') }}</span>
      </div>
    </div>
  </div>
</template>
