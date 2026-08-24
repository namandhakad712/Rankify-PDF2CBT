<template>
  <div ref="wrapRef" class="dot-grid" :style="{ opacity }">
    <canvas ref="canvasRef"></canvas>
  </div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'

const props = defineProps({
  dotSize: { type: Number, default: 5.5 },
  gap: { type: Number, default: 26 },
  baseColor: { type: String, default: '#8b5cf6' },
  activeColor: { type: String, default: '#e879f9' },
  proximity: { type: Number, default: 140 },
  speed: { type: Number, default: 0.35 },
  opacity: { type: Number, default: 1 }
})

const wrapRef = ref(null)
const canvasRef = ref(null)

let ctx = null
let raf = 0
let ro = null
let W = 0
let H = 0
let dots = []
const mouse = { x: -9999, y: -9999 }

function hexRgb (hex) {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex || '')
  return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [0, 0, 0]
}

const base = hexRgb(props.baseColor)
const act = hexRgb(props.activeColor)

function build () {
  const dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = wrapRef.value.clientWidth
  H = wrapRef.value.clientHeight
  canvasRef.value.width = W * dpr
  canvasRef.value.height = H * dpr
  canvasRef.value.style.width = W + 'px'
  canvasRef.value.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
  dots = []
  for (let x = props.gap / 2; x < W; x += props.gap) {
    for (let y = props.gap / 2; y < H; y += props.gap) {
      dots.push({ cx: x, cy: y, s: 0 })
    }
  }
}

function loop (t) {
  raf = requestAnimationFrame(loop)
  ctx.clearRect(0, 0, W, H)
  const time = t * 0.001 * props.speed
  for (const d of dots) {
    const dx = mouse.x - d.cx
    const dy = mouse.y - d.cy
    const dist = Math.sqrt(dx * dx + dy * dy)
    const prox = Math.max(0, 1 - dist / props.proximity)
    const wave = (Math.sin(time + d.cx * 0.012 + d.cy * 0.01) + 1) * 0.5
    const target = prox * prox
    d.s += (target - d.s) * 0.12
    const r = (props.dotSize / 2) * (0.35 + wave * 0.3 + d.s * 1.15)
    const cr = Math.round(base[0] + (act[0] - base[0]) * d.s)
    const cg = Math.round(base[1] + (act[1] - base[1]) * d.s)
    const cb = Math.round(base[2] + (act[2] - base[2]) * d.s)
    const alpha = 0.1 + wave * 0.08 + d.s * 0.75
    ctx.beginPath()
    ctx.arc(d.cx, d.cy, r, 0, Math.PI * 2)
    ctx.fillStyle = `rgba(${cr},${cg},${cb},${alpha.toFixed(3)})`
    ctx.fill()
  }
}

function onMove (e) {
  const r = wrapRef.value.getBoundingClientRect()
  mouse.x = e.clientX - r.left
  mouse.y = e.clientY - r.top
}

function onLeave () {
  mouse.x = -9999
  mouse.y = -9999
}

onMounted(() => {
  ctx = canvasRef.value.getContext('2d')
  build()
  ro = new ResizeObserver(build)
  ro.observe(wrapRef.value)
  wrapRef.value.addEventListener('pointermove', onMove, { passive: true })
  wrapRef.value.addEventListener('pointerleave', onLeave, { passive: true })
  raf = requestAnimationFrame(loop)
})

onBeforeUnmount(() => {
  cancelAnimationFrame(raf)
  if (ro) ro.disconnect()
})
</script>

<style scoped>
.dot-grid {
  position: absolute;
  inset: 0;
  overflow: hidden;
  pointer-events: auto;
}

.dot-grid canvas {
  display: block;
}
</style>
