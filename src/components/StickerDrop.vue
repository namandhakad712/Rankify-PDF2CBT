<template>
  <div ref="layer" :class="confineTo ? 'sticker-layer--confined' : 'sticker-layer'" aria-hidden="true"></div>
</template>

<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import gsap from 'gsap'
import { Observer } from 'gsap/Observer'
import { Physics2DPlugin } from 'gsap/Physics2DPlugin'
import { CustomEase } from 'gsap/CustomEase'
import { CustomBounce } from 'gsap/CustomBounce'

gsap.registerPlugin(Observer, Physics2DPlugin, CustomEase, CustomBounce)

try { CustomEase.create('peel', 'M0,0 C0.22,1 0.36,1.02 0.64,1.08 0.82,1.12 0.88,1 1,1') } catch {}
try { CustomBounce.create('softBounce', { strength: 0.42, squash: 2, squashID: 'softBounce-squash' }) } catch {}

const props = defineProps({ confineTo: { type: String, default: '' } })

const layer = ref(null)
let ctx
let obs
let last = 0

// premium stickers — real PNGs you dropped, fallback SVG
const stickers = [
  { id: 'heart-red', bg: '#FEE2E2', bd: '#FECACA', svg: `<svg viewBox="0 0 32 30" fill="#F26D6D" stroke="#23203A" stroke-width="1.8" stroke-linejoin="round"><path d="M16 26 L6 16 C2 12 2 7 7 4.5 C11 2 16 5 16 5 C16 5 21 2 25 4.5 C30 7 30 12 26 16 Z"/></svg>` },
  { id: 'star-yellow', bg: '#FEF3C7', bd: '#FFD84D', svg: `<svg viewBox="0 0 32 30" fill="#FFD84D" stroke="#23203A" stroke-width="1.8" stroke-linejoin="round"><path d="M16 2 L19.8 11.2 L29.5 11.5 L21.8 17.2 L24.1 26.5 L16 21.4 L7.9 26.5 L10.2 17.2 L2.5 11.5 L12.2 11.2 Z"/></svg>` },
  { id: 'plane-blue', bg: '#DBEAFE', bd: '#93C5FD', svg: `<svg viewBox="0 0 32 20" fill="#60A5FA" stroke="#23203A" stroke-width="1.6" stroke-linejoin="round"><path d="M1 10 L30 1 L19 10 L30 19 Z"/><path d="M19 10 L11 13 L1 10" fill="none"/></svg>` },
  { id: 'pencil-yellow', bg: '#FEF3C7', bd: '#FFD84D', svg: `<svg viewBox="0 0 24 28" stroke="#23203A" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><path d="M7 3 H17 L19 5 V23 L12 27 L5 23 V5 Z" fill="#FFD84D"/><path d="M7 3 L12 7 L17 3" fill="#FACC15"/><path d="M12 7 V23" stroke-dasharray="2 3"/><path d="M9 24 L12 27 L15 24" fill="#FECACA"/></svg>` },
  { id: 'aplus-red', bg: 'white', bd: '#F26D6D', svg: `<svg viewBox="0 0 32 32"><circle cx="16" cy="16" r="14.5" fill="white" stroke="#F26D6D" stroke-width="2.2"/><text x="16" y="21" text-anchor="middle" font-family="Caveat, cursive" font-weight="700" font-size="16" fill="#F26D6D">A+</text></svg>` },
  { id: 'heart-pink', bg: '#FCE7F3', bd: '#FF9EC0', svg: `<svg viewBox="0 0 32 30" fill="#FF9EC0" stroke="#23203A" stroke-width="1.8" stroke-linejoin="round"><path d="M16 26 L6 16 C2 12 2 7 7 4.5 C11 2 16 5 16 5 C16 5 21 2 25 4.5 C30 7 30 12 26 16 Z"/></svg>` }
]

function getLayerPoint(clientX, clientY) {
  if (!props.confineTo || !layer.value) return { x: clientX, y: clientY }
  const r = layer.value.getBoundingClientRect()
  return { x: clientX - r.left, y: clientY - r.top }
}
function spawn(clientX, clientY, vel = 14) {
  if (!layer.value) return
  if (layer.value.children.length > 14) layer.value.firstChild?.remove()
  const p = getLayerPoint(clientX, clientY)
  const x = p.x, y = p.y

  const data = stickers[Math.floor(Math.random() * stickers.length)]
  const el = document.createElement('div')
  el.innerHTML = data.svg
  const svg = el.firstElementChild
  el.className = 'sticker-premium'
  el.style.cssText = `position:absolute;left:${x}px;top:${y}px;width:48px;height:46px;background:${data.bg};border:2.5px solid ${data.bd};border-radius:16px;display:grid;place-items:center;box-shadow:0 10px 24px rgba(35,32,58,.18), 0 2px 8px rgba(35,32,58,.1);pointer-events:none;will-change:transform,opacity;transform:translate(-50%,-50%);`
  if (svg) { svg.style.width = '68%'; svg.style.height = '68%'; }

  // try real PNG if you dropped individual stickers — swap in
  const img = new Image()
  img.src = `/images/notebook/stickers/${data.id}.png`
  img.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;object-fit:contain;padding:5px;border-radius:13px;'
  img.onload = () => { if (img.naturalWidth > 12) { el.innerHTML = ''; el.style.background='white'; el.appendChild(img) } }

  layer.value.appendChild(el)

  // peel pop — CustomEase + Bounce feel
  gsap.set(el, { scale: 0, rotation: gsap.utils.random(-16, 16) })
  gsap.to(el, { scale: gsap.utils.random(0.95, 1.08), rotation: gsap.utils.random(-6, 6), duration: 0.42, ease: 'peel' })
  gsap.to(el, { scaleY: 1, duration: 0.42, ease: 'softBounce-squash', overwrite: true })

  // physics drop — real gravity + friction, velocity from Observer
  const v = gsap.utils.clamp(280, 620, vel * 28)
  const ang = gsap.utils.random(78, 102) // straight down with slight spread
  gsap.to(el, {
    duration: gsap.utils.random(1.15, 1.45),
    physics2D: { velocity: v, angle: ang, gravity: 980, friction: 0.02 },
    rotation: `+=${gsap.utils.random(-38, 38)}`,
    ease: 'none',
    onComplete: () => gsap.to(el, { opacity: 0, scale: 0.88, duration: 0.18, onComplete: () => el.remove() })
  })
}

onMounted(() => {
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isFine = window.matchMedia('(pointer: fine)').matches
  if (reduced || !isFine) return

  const confineEl = props.confineTo ? document.querySelector(props.confineTo) : null
  const obsTarget = confineEl || window
  ctx = gsap.context(() => {
    let lastX = 0, lastY = 0, lastT = performance.now()

    obs = Observer.create({
      target: obsTarget,
      type: 'pointer',
      tolerance: 8,
      debounce: false,
      onMove: self => {
        const now = performance.now()
        if (now - last < 76) return
        const dx = self.x - lastX
        const dy = self.y - lastY
        const dt = Math.max(16, now - lastT)
        const vel = Math.sqrt(dx*dx + dy*dy) / (dt/16)
        if (vel < 6) { lastX=self.x; lastY=self.y; lastT=now; return }
        last = now; lastX=self.x; lastY=self.y; lastT=now
        spawn(self.x, self.y, vel)
      }
    })

    // burst on sticker triggers — when confined, only those inside the block
    const triggerScope = props.confineTo ? `${props.confineTo} [data-sticker-trigger]` : '[data-sticker-trigger]'
    gsap.utils.toArray(triggerScope).forEach(el => {
      el.addEventListener('pointerenter', () => {
        const r = el.getBoundingClientRect()
        const cx = r.left + r.width/2
        const cy = r.top + r.height/2
        for (let i=0;i<3;i++) setTimeout(()=> spawn(cx+gsap.utils.random(-16,16), cy+gsap.utils.random(-8,8), 22), i*72)
      })
    })
  }, layer.value)
})

onBeforeUnmount(() => {
  ctx?.revert()
  obs?.kill()
})
</script>

<style scoped>
.sticker-layer {
  position: fixed;
  inset: 0;
  z-index: 30;
  pointer-events: none;
  overflow: hidden;
}
.sticker-layer--confined {
  position: absolute;
  inset: 0;
  z-index: 20;
  pointer-events: none;
  overflow: hidden;
}
.sticker-premium {
  transform-origin: 50% 50%;
}
@media (pointer: coarse) { .sticker-layer, .sticker-layer--confined{ display:none } }
</style>
