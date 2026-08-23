// @ts-nocheck
<template>
  <div class="evervault-container">
    <canvas ref="particleCanvas" class="particle-canvas"></canvas>
    <canvas ref="scannerCanvas" class="scanner-canvas"></canvas>
    
    <div class="card-stream" ref="cardStream">
      <div class="card-line" ref="cardLine">
        <div 
          v-for="(card, index) in cards" 
          :key="index" 
          class="card-wrapper"
        >
          <div class="card card-normal">
            <slot :name="`card-${index}`" :index="index">
              <div class="default-card-content">
                {{ card.title }}
              </div>
            </slot>
          </div>
          <div class="card card-ascii">
            <div class="ascii-content" :ref="el => asciiRefs[index] = el"></div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
// @ts-nocheck
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

const props = defineProps({
  cards: {
    type: Array,
    default: () => [
      { title: 'Card 1' },
      { title: 'Card 2' },
      { title: 'Card 3' },
      { title: 'Card 4' }
    ]
  }
});

const particleCanvas = ref(null);
const scannerCanvas = ref(null);
const cardStream = ref(null);
const cardLine = ref(null);
const asciiRefs = ref([]);

let cardStreamController = null;
let particleSystem = null;
let particleScanner = null;

const codeChars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789(){}[]<>;:,._-+=!@#$%^&*|\\/\"'`~?";

// Card Stream Controller Class
class CardStreamController {
  constructor(container, cardLine, asciiElements) {
    this.container = container;
    this.cardLine = cardLine;
    this.asciiElements = asciiElements;
    
    this.position = 0;
    this.velocity = 120;
    this.direction = -1;
    this.isAnimating = true;
    this.isDragging = false;
    
    this.lastTime = 0;
    this.lastMouseX = 0;
    this.mouseVelocity = 0;
    this.friction = 0.95;
    this.minVelocity = 30;
    
    this.containerWidth = 0;
    this.cardLineWidth = 0;
    
    this.init();
  }
  
  init() {
    this.calculateDimensions();
    this.setupEventListeners();
    // Don't auto-animate - controlled by ScrollTrigger
    // this.updateCardPosition();
    // this.animate();
    this.startPeriodicUpdates();
  }
  
  calculateDimensions() {
    this.containerWidth = this.container.offsetWidth;
    const cardWidth = 400;
    const cardGap = 60;
    const cardCount = this.cardLine.children.length;
    this.cardLineWidth = (cardWidth + cardGap) * cardCount;
  }

  setupEventListeners() {
    // Disable manual dragging - controlled by ScrollTrigger
    // this.cardLine.addEventListener('mousedown', (e) => this.startDrag(e));
    // document.addEventListener('mousemove', (e) => this.onDrag(e));
    // document.addEventListener('mouseup', () => this.endDrag());
    
    // this.cardLine.addEventListener('touchstart', (e) => this.startDrag(e.touches[0]), { passive: false });
    // document.addEventListener('touchmove', (e) => this.onDrag(e.touches[0]), { passive: false });
    // document.addEventListener('touchend', () => this.endDrag());
    
    // this.cardLine.addEventListener('wheel', (e) => this.onWheel(e));
    this.cardLine.addEventListener('selectstart', (e) => e.preventDefault());
    this.cardLine.addEventListener('dragstart', (e) => e.preventDefault());
    
    window.addEventListener('resize', () => this.calculateDimensions());
  }
  
  startDrag(e) {
    e.preventDefault();
    this.isDragging = true;
    this.isAnimating = false;
    this.lastMouseX = e.clientX;
    this.mouseVelocity = 0;
    
    const transform = window.getComputedStyle(this.cardLine).transform;
    if (transform !== 'none') {
      const matrix = new DOMMatrix(transform);
      this.position = matrix.m41;
    }
    
    this.cardLine.style.animation = 'none';
    this.cardLine.classList.add('dragging');
    document.body.style.userSelect = 'none';
    document.body.style.cursor = 'grabbing';
  }

  onDrag(e) {
    if (!this.isDragging) return;
    e.preventDefault();
    
    const deltaX = e.clientX - this.lastMouseX;
    this.position += deltaX;
    this.mouseVelocity = deltaX * 60;
    this.lastMouseX = e.clientX;
    
    this.cardLine.style.transform = `translateX(${this.position}px)`;
    this.updateCardClipping();
  }
  
  endDrag() {
    if (!this.isDragging) return;
    
    this.isDragging = false;
    this.cardLine.classList.remove('dragging');
    
    if (Math.abs(this.mouseVelocity) > this.minVelocity) {
      this.velocity = Math.abs(this.mouseVelocity);
      this.direction = this.mouseVelocity > 0 ? 1 : -1;
    } else {
      this.velocity = 120;
    }
    
    this.isAnimating = true;
    document.body.style.userSelect = '';
    document.body.style.cursor = '';
  }
  
  animate() {
    const currentTime = performance.now();
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    
    if (this.isAnimating && !this.isDragging) {
      if (this.velocity > this.minVelocity) {
        this.velocity *= this.friction;
      } else {
        this.velocity = Math.max(this.minVelocity, this.velocity);
      }
      
      this.position += this.velocity * this.direction * deltaTime;
      this.updateCardPosition();
    }
    
    requestAnimationFrame(() => this.animate());
  }

  updateCardPosition() {
    const containerWidth = this.containerWidth;
    const cardLineWidth = this.cardLineWidth;
    
    if (this.position < -cardLineWidth) {
      this.position = containerWidth;
    } else if (this.position > containerWidth) {
      this.position = -cardLineWidth;
    }
    
    this.cardLine.style.transform = `translateX(${this.position}px)`;
    this.updateCardClipping();
  }
  
  updateCardClipping() {
    const scannerX = window.innerWidth / 2;
    const scannerWidth = 8;
    const scannerLeft = scannerX - scannerWidth / 2;
    const scannerRight = scannerX + scannerWidth / 2;
    let anyScanningActive = false;
    
    const wrappers = this.cardLine.querySelectorAll('.card-wrapper');
    wrappers.forEach((wrapper) => {
      const rect = wrapper.getBoundingClientRect();
      const cardLeft = rect.left;
      const cardRight = rect.right;
      const cardWidth = rect.width;
      
      const normalCard = wrapper.querySelector('.card-normal');
      const asciiCard = wrapper.querySelector('.card-ascii');
      
      if (cardLeft < scannerRight && cardRight > scannerLeft) {
        anyScanningActive = true;
        const scannerIntersectLeft = Math.max(scannerLeft - cardLeft, 0);
        const scannerIntersectRight = Math.min(scannerRight - cardLeft, cardWidth);
        
        const normalClipRight = (scannerIntersectLeft / cardWidth) * 100;
        const asciiClipLeft = (scannerIntersectRight / cardWidth) * 100;
        
        normalCard.style.setProperty('--clip-right', `${normalClipRight}%`);
        asciiCard.style.setProperty('--clip-left', `${asciiClipLeft}%`);
        
        if (!wrapper.hasAttribute('data-scanned') && scannerIntersectLeft > 0) {
          wrapper.setAttribute('data-scanned', 'true');
          const scanEffect = document.createElement('div');
          scanEffect.className = 'scan-effect';
          wrapper.appendChild(scanEffect);
          setTimeout(() => {
            if (scanEffect.parentNode) {
              scanEffect.parentNode.removeChild(scanEffect);
            }
          }, 600);
        }
      } else {
        if (cardRight < scannerLeft) {
          normalCard.style.setProperty('--clip-right', '100%');
          asciiCard.style.setProperty('--clip-left', '100%');
        } else if (cardLeft > scannerRight) {
          normalCard.style.setProperty('--clip-right', '0%');
          asciiCard.style.setProperty('--clip-left', '0%');
        }
        wrapper.removeAttribute('data-scanned');
      }
    });
    
    if (window.setScannerScanning && particleScanner) {
      particleScanner.setScanningActive(anyScanningActive);
    }
  }

  onWheel(e) {
    e.preventDefault();
    const scrollSpeed = 20;
    const delta = e.deltaY > 0 ? scrollSpeed : -scrollSpeed;
    this.position += delta;
    this.updateCardPosition();
    this.updateCardClipping();
  }
  
  generateCode(width, height) {
    const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
    const pick = (arr) => arr[randInt(0, arr.length - 1)];
    
    const header = [
      "// compiled preview • scanner demo",
      "// Made with love by Naman",
      "/* generated for visual effect – not executed */",
      "/* Your whole data is secure and private */",
      "const SCAN_WIDTH = 8;",
      "const FADE_ZONE = 35;",
      "const MAX_PARTICLES = 2500;",
      "const TRANSITION = 0.05;",
    ];
    
    const helpers = [
      "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
      "function lerp(a, b, t) { return a + (b - a) * t; }",
      "const now = () => performance.now();",
      "function rng(min, max) { return Math.random() * (max - min) + min; }",
    ];
    
    const particleBlock = (idx) => [
      `class Particle${idx} {`,
      "  constructor(x, y, vx, vy, r, a) {",
      "    this.x = x; this.y = y;",
      "    this.vx = vx; this.vy = vy;",
      "    this.r = r; this.a = a;",
      "  }",
      "  step(dt) { this.x += this.vx * dt; this.y += this.vy * dt; }",
      "}",
    ];
    
    const library = [];
    header.forEach((l) => library.push(l));
    helpers.forEach((l) => library.push(l));
    for (let b = 0; b < 3; b++) particleBlock(b).forEach((l) => library.push(l));
    
    for (let i = 0; i < 40; i++) {
      const n1 = randInt(1, 9);
      const n2 = randInt(10, 99);
      library.push(`const v${i} = (${n1} + ${n2}) * 0.${randInt(1, 9)};`);
    }
    
    let flow = library.join(' ');
    flow = flow.replace(/\s+/g, ' ').trim();
    const totalChars = width * height;
    while (flow.length < totalChars + width) {
      const extra = pick(library).replace(/\s+/g, ' ').trim();
      flow += ' ' + extra;
    }
    
    let out = '';
    let offset = 0;
    for (let row = 0; row < height; row++) {
      let line = flow.slice(offset, offset + width);
      if (line.length < width) line = line + ' '.repeat(width - line.length);
      out += line + (row < height - 1 ? '\n' : '');
      offset += width;
    }
    return out;
  }

  calculateCodeDimensions(cardWidth, cardHeight) {
    const fontSize = 11;
    const lineHeight = 13;
    const charWidth = 6;
    const width = Math.floor(cardWidth / charWidth);
    const height = Math.floor(cardHeight / lineHeight);
    return { width, height, fontSize, lineHeight };
  }
  
  updateAsciiContent() {
    this.asciiElements.forEach((content) => {
      if (content && Math.random() < 0.15) { // Reduced from 0.5 to 0.15 like original
        const { width, height } = this.calculateCodeDimensions(400, 250);
        content.textContent = this.generateCode(width, height);
      }
    });
  }
  
  startPeriodicUpdates() {
    // Update ASCII content at reasonable frequency
    setInterval(() => {
      this.updateAsciiContent();
    }, 200);
    
    // Only update clipping when actually needed (during scroll/animation)
    // Remove continuous frame updates - let ScrollTrigger handle it
  }
  
  // Call this method from ScrollTrigger's onUpdate callback
  triggerClippingUpdate() {
    this.updateCardClipping();
  }
  
  destroy() {
    // Cleanup
  }
}

// Particle Scanner Class
class ParticleScanner {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.animationId = null;
    
    this.w = window.innerWidth;
    this.h = 300;
    this.particles = [];
    this.count = 0;
    this.maxParticles = 800;
    this.intensity = 0.8;
    this.lightBarX = this.w / 2;
    this.lightBarWidth = 3;
    this.fadeZone = 60;
    
    this.scanTargetIntensity = 1.8;
    this.scanTargetParticles = 2500;
    this.scanTargetFadeZone = 35;
    
    this.scanningActive = false;
    
    this.baseIntensity = this.intensity;
    this.baseMaxParticles = this.maxParticles;
    this.baseFadeZone = this.fadeZone;
    
    this.currentIntensity = this.intensity;
    this.currentMaxParticles = this.maxParticles;
    this.currentFadeZone = this.fadeZone;
    this.transitionSpeed = 0.05;
    
    this.setupCanvas();
    this.createGradientCache();
    this.initParticles();
    this.animate();
    
    window.addEventListener('resize', () => this.onResize());
  }
  
  setupCanvas() {
    this.canvas.width = this.w;
    this.canvas.height = this.h;
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.clearRect(0, 0, this.w, this.h);
  }
  
  onResize() {
    this.w = window.innerWidth;
    this.lightBarX = this.w / 2;
    this.setupCanvas();
  }

  createGradientCache() {
    this.gradientCanvas = document.createElement('canvas');
    this.gradientCtx = this.gradientCanvas.getContext('2d');
    this.gradientCanvas.width = 16;
    this.gradientCanvas.height = 16;
    
    const half = this.gradientCanvas.width / 2;
    const gradient = this.gradientCtx.createRadialGradient(half, half, 0, half, half, half);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 1)');
    gradient.addColorStop(0.3, 'rgba(196, 181, 253, 0.8)');
    gradient.addColorStop(0.7, 'rgba(139, 92, 246, 0.4)');
    gradient.addColorStop(1, 'transparent');
    
    this.gradientCtx.fillStyle = gradient;
    this.gradientCtx.beginPath();
    this.gradientCtx.arc(half, half, half, 0, Math.PI * 2);
    this.gradientCtx.fill();
  }
  
  random(min, max) {
    if (arguments.length < 2) {
      max = min;
      min = 0;
    }
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }
  
  randomFloat(min, max) {
    return Math.random() * (max - min) + min;
  }
  
  createParticle() {
    const intensityRatio = this.intensity / this.baseIntensity;
    const speedMultiplier = 1 + (intensityRatio - 1) * 1.2;
    const sizeMultiplier = 1 + (intensityRatio - 1) * 0.7;
    
    return {
      x: this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2),
      y: this.randomFloat(0, this.h),
      vx: this.randomFloat(0.2, 1.0) * speedMultiplier,
      vy: this.randomFloat(-0.15, 0.15) * speedMultiplier,
      radius: this.randomFloat(0.4, 1) * sizeMultiplier,
      alpha: this.randomFloat(0.6, 1),
      decay: this.randomFloat(0.005, 0.025) * (2 - intensityRatio * 0.5),
      originalAlpha: 0,
      life: 1.0,
      time: 0,
      startX: 0,
      twinkleSpeed: this.randomFloat(0.02, 0.08) * speedMultiplier,
      twinkleAmount: this.randomFloat(0.1, 0.25),
    };
  }

  initParticles() {
    for (let i = 0; i < this.maxParticles; i++) {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }
  }
  
  updateParticle(particle) {
    particle.x += particle.vx;
    particle.y += particle.vy;
    particle.time++;
    
    particle.alpha = particle.originalAlpha * particle.life + Math.sin(particle.time * particle.twinkleSpeed) * particle.twinkleAmount;
    particle.life -= particle.decay;
    
    if (particle.x > this.w + 10 || particle.life <= 0) {
      this.resetParticle(particle);
    }
  }
  
  resetParticle(particle) {
    particle.x = this.lightBarX + this.randomFloat(-this.lightBarWidth / 2, this.lightBarWidth / 2);
    particle.y = this.randomFloat(0, this.h);
    particle.vx = this.randomFloat(0.2, 1.0);
    particle.vy = this.randomFloat(-0.15, 0.15);
    particle.alpha = this.randomFloat(0.6, 1);
    particle.originalAlpha = particle.alpha;
    particle.life = 1.0;
    particle.time = 0;
    particle.startX = particle.x;
  }
  
  drawParticle(particle) {
    if (particle.life <= 0) return;
    
    let fadeAlpha = 1;
    
    if (particle.y < this.fadeZone) {
      fadeAlpha = particle.y / this.fadeZone;
    } else if (particle.y > this.h - this.fadeZone) {
      fadeAlpha = (this.h - particle.y) / this.fadeZone;
    }
    
    fadeAlpha = Math.max(0, Math.min(1, fadeAlpha));
    
    this.ctx.globalAlpha = particle.alpha * fadeAlpha;
    this.ctx.drawImage(
      this.gradientCanvas,
      particle.x - particle.radius,
      particle.y - particle.radius,
      particle.radius * 2,
      particle.radius * 2
    );
  }

  drawLightBar() {
    const verticalGradient = this.ctx.createLinearGradient(0, 0, 0, this.h);
    verticalGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    verticalGradient.addColorStop(this.fadeZone / this.h, 'rgba(255, 255, 255, 1)');
    verticalGradient.addColorStop(1 - this.fadeZone / this.h, 'rgba(255, 255, 255, 1)');
    verticalGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.globalCompositeOperation = 'lighter';
    
    const targetGlowIntensity = this.scanningActive ? 3.5 : 1;
    if (!this.currentGlowIntensity) this.currentGlowIntensity = 1;
    this.currentGlowIntensity += (targetGlowIntensity - this.currentGlowIntensity) * this.transitionSpeed;
    
    const glowIntensity = this.currentGlowIntensity;
    const lineWidth = this.lightBarWidth;
    
    // Core gradient
    const coreGradient = this.ctx.createLinearGradient(
      this.lightBarX - lineWidth / 2, 0,
      this.lightBarX + lineWidth / 2, 0
    );
    coreGradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    coreGradient.addColorStop(0.5, `rgba(255, 255, 255, ${1 * glowIntensity})`);
    coreGradient.addColorStop(1, 'rgba(255, 255, 255, 0)');
    
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = coreGradient;
    this.ctx.fillRect(this.lightBarX - lineWidth / 2, 0, lineWidth, this.h);
    
    // Glow layers
    const glow1Gradient = this.ctx.createLinearGradient(
      this.lightBarX - lineWidth * 2, 0,
      this.lightBarX + lineWidth * 2, 0
    );
    glow1Gradient.addColorStop(0, 'rgba(139, 92, 246, 0)');
    glow1Gradient.addColorStop(0.5, `rgba(196, 181, 253, ${0.8 * glowIntensity})`);
    glow1Gradient.addColorStop(1, 'rgba(139, 92, 246, 0)');
    
    this.ctx.globalAlpha = this.scanningActive ? 1.0 : 0.8;
    this.ctx.fillStyle = glow1Gradient;
    this.ctx.fillRect(this.lightBarX - lineWidth * 2, 0, lineWidth * 4, this.h);
    
    // Apply vertical gradient mask
    this.ctx.globalCompositeOperation = 'destination-in';
    this.ctx.globalAlpha = 1;
    this.ctx.fillStyle = verticalGradient;
    this.ctx.fillRect(0, 0, this.w, this.h);
  }

  render() {
    const targetIntensity = this.scanningActive ? this.scanTargetIntensity : this.baseIntensity;
    const targetMaxParticles = this.scanningActive ? this.scanTargetParticles : this.baseMaxParticles;
    const targetFadeZone = this.scanningActive ? this.scanTargetFadeZone : this.baseFadeZone;
    
    this.currentIntensity += (targetIntensity - this.currentIntensity) * this.transitionSpeed;
    this.currentMaxParticles += (targetMaxParticles - this.currentMaxParticles) * this.transitionSpeed;
    this.currentFadeZone += (targetFadeZone - this.currentFadeZone) * this.transitionSpeed;
    
    this.intensity = this.currentIntensity;
    this.maxParticles = Math.floor(this.currentMaxParticles);
    this.fadeZone = this.currentFadeZone;
    
    this.ctx.globalCompositeOperation = 'source-over';
    this.ctx.clearRect(0, 0, this.w, this.h);
    
    this.drawLightBar();
    
    this.ctx.globalCompositeOperation = 'lighter';
    for (let i = 1; i <= this.count; i++) {
      if (this.particles[i]) {
        this.updateParticle(this.particles[i]);
        this.drawParticle(this.particles[i]);
      }
    }
    
    const currentIntensity = this.intensity;
    const currentMaxParticles = this.maxParticles;
    
    if (Math.random() < currentIntensity && this.count < currentMaxParticles) {
      const particle = this.createParticle();
      particle.originalAlpha = particle.alpha;
      particle.startX = particle.x;
      this.count++;
      this.particles[this.count] = particle;
    }
    
    if (this.count > currentMaxParticles + 200) {
      const excessCount = Math.min(15, this.count - currentMaxParticles);
      for (let i = 0; i < excessCount; i++) {
        delete this.particles[this.count - i];
      }
      this.count -= excessCount;
    }
  }
  
  animate() {
    this.render();
    this.animationId = requestAnimationFrame(() => this.animate());
  }
  
  setScanningActive(active) {
    this.scanningActive = active;
  }
  
  destroy() {
    if (this.animationId) {
      cancelAnimationFrame(this.animationId);
    }
    this.particles = [];
    this.count = 0;
  }
}


onMounted(async () => {
  await nextTick();
  
  if (typeof window !== 'undefined') {
    // Initialize ASCII content
    asciiRefs.value.forEach((el, index) => {
      if (el) {
        const { width, height, fontSize, lineHeight } = calculateCodeDimensions(400, 250);
        el.style.fontSize = fontSize + 'px';
        el.style.lineHeight = lineHeight + 'px';
        el.textContent = generateCode(width, height);
      }
    });
    
    // Initialize particle scanner
    if (scannerCanvas.value) {
      particleScanner = new ParticleScanner(scannerCanvas.value);
      // Expose globally for external control
      window.evervaultParticleScanner = particleScanner;
    }
    
    // Initialize card stream controller
    if (cardStream.value && cardLine.value) {
      cardStreamController = new CardStreamController(
        cardStream.value,
        cardLine.value,
        asciiRefs.value
      );
      // Expose globally so ScrollTrigger can call triggerClippingUpdate()
      window.evervaultCardController = cardStreamController;
    }
  }
});

onUnmounted(() => {
  if (cardStreamController) {
    cardStreamController.destroy();
  }
  if (particleScanner) {
    particleScanner.destroy();
  }
});

function calculateCodeDimensions(cardWidth, cardHeight) {
  const fontSize = 11;
  const lineHeight = 13;
  const charWidth = 6;
  const width = Math.floor(cardWidth / charWidth);
  const height = Math.floor(cardHeight / lineHeight);
  return { width, height, fontSize, lineHeight };
}

function generateCode(width, height) {
  const randInt = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;
  const pick = (arr) => arr[randInt(0, arr.length - 1)];
  
  const header = [
    "// compiled preview • scanner demo",
    "/* generated for visual effect – not executed */",
    "const SCAN_WIDTH = 8;",
    "const FADE_ZONE = 35;",
    "const MAX_PARTICLES = 2500;",
    "const TRANSITION = 0.05;",
  ];
  
  const helpers = [
    "function clamp(n, a, b) { return Math.max(a, Math.min(b, n)); }",
    "function lerp(a, b, t) { return a + (b - a) * t; }",
    "const now = () => performance.now();",
    "function rng(min, max) { return Math.random() * (max - min) + min; }",
  ];
  
  const library = [...header, ...helpers];
  
  for (let i = 0; i < 40; i++) {
    const n1 = randInt(1, 9);
    const n2 = randInt(10, 99);
    library.push(`const v${i} = (${n1} + ${n2}) * 0.${randInt(1, 9)};`);
  }
  
  let flow = library.join(' ');
  flow = flow.replace(/\s+/g, ' ').trim();
  const totalChars = width * height;
  while (flow.length < totalChars + width) {
    const extra = pick(library).replace(/\s+/g, ' ').trim();
    flow += ' ' + extra;
  }
  
  let out = '';
  let offset = 0;
  for (let row = 0; row < height; row++) {
    let line = flow.slice(offset, offset + width);
    if (line.length < width) line = line + ' '.repeat(width - line.length);
    out += line + (row < height - 1 ? '\n' : '');
    offset += width;
  }
  return out;
}

</script>

<style scoped>
.evervault-container {
  position: relative;
  width: 100%;
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.particle-canvas {
  position: absolute;
  top: 50%;
  left: 0;
  transform: translateY(-50%);
  width: 100vw;
  height: 250px;
  z-index: 0;
  pointer-events: none;
}

.scanner-canvas {
  position: absolute;
  top: 50%;
  left: -3px;
  transform: translateY(-50%);
  width: 100vw;
  height: 300px;
  z-index: 15;
  pointer-events: none;
}

.card-stream {
  position: absolute;
  width: 100vw;
  height: 180px;
  display: flex;
  align-items: center;
  overflow: visible;
}

.card-line {
  display: flex;
  align-items: center;
  gap: 60px;
  white-space: nowrap;
  user-select: none;
  will-change: transform;
  pointer-events: none; /* Disable interaction - controlled by scroll */
}

/* Mobile view - optimized gap */
@media (max-width: 768px) {
  .card-line {
    gap: 50px;
  }
}

.card-wrapper {
  position: relative;
  width: 400px;
  height: 250px;
  flex-shrink: 0;
}

.glass-border {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 10;
}

/* Mobile view - optimized card size */
@media (max-width: 768px) {
  .card-wrapper {
    width: 320px;
    height: 200px;
  }
}

.card {
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 250px;
  border-radius: 15px;
  overflow: hidden;
}

/* Mobile view - optimized card size */
@media (max-width: 768px) {
  .card {
    width: 320px;
    height: 200px;
    border-radius: 12px;
  }
}

.card-normal {
  background-size: 400px 250px;
  animation: cardAnimation 10s infinite, cardGradient 45s ease-in-out infinite;
  transform: translateZ(0);
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.12);
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  padding: 0;
  color: #1a1d21;
  z-index: 2;
  position: relative;
  overflow: hidden;
  clip-path: inset(0 0 0 var(--clip-right, 0%) round 15px);
  border: none;
}

/* Mobile view - optimized background size */
@media (max-width: 768px) {
  .card-normal {
    background-size: 320px 200px;
  }
}

/* Holographic border effect - no shadows, just subtle borders */
.card-normal::before {
  content: "";
  position: absolute;
  inset: 0;
  border-radius: 15px;
  border: 1px solid rgba(255, 255, 255, 0.3);
  z-index: 1;
  pointer-events: none;
}

/* Animated holographic gradient overlay */
.card-normal::after {
  content: "";
  width: 100%;
  height: 100%;
  border-radius: 15px;
  background: linear-gradient(
      120deg,
      rgb(255 255 255 / 2%) 30%,
      rgb(255 255 255 / 25%) 40%,
      rgb(255 255 255 / 8%) 40%
    ),
    linear-gradient(0deg, rgb(255 255 255 / 20%), rgb(255 255 255 / 30%));
  background-size: 150% 150%;
  animation: cardGradient 45s ease-in-out infinite;
  transform: translateZ(0);
  position: absolute;
  z-index: 1;
  pointer-events: none;
}

/* Card theme backgrounds */
.card-wrapper:nth-child(1) .card-normal {
  background-image: url("/images/step-cards/snowy-mint.webp");
}

.card-wrapper:nth-child(2) .card-normal {
  background-image: url("/images/step-cards/egg-sour.webp");
}

.card-wrapper:nth-child(3) .card-normal {
  background-image: url("/images/step-cards/cream-whisper.webp");
}

.card-wrapper:nth-child(4) .card-normal {
  background-image: url("/images/step-cards/tonys-pink.webp");
}

/* Ensure content is above overlays */
.card-normal > * {
  position: relative;
  z-index: 2;
}

/* Card animations */
@keyframes cardAnimation {
  60% {
    background-size: 400px 267px;
    background-position-x: 60%;
    background-position-y: 60%;
  }
}

/* Mobile animation */
@media (max-width: 768px) {
  @keyframes cardAnimation {
    60% {
      background-size: 320px 214px;
      background-position-x: 60%;
      background-position-y: 60%;
    }
  }
}

@keyframes cardGradient {
  0% { background-position: 0% 10%; }
  50% { background-position: 100% 91%; }
  100% { background-position: 0% 10%; }
}

.card-ascii {
  background: transparent;
  z-index: 1;
  position: absolute;
  top: 0;
  left: 0;
  width: 400px;
  height: 250px;
  border-radius: 15px;
  overflow: hidden;
  clip-path: inset(0 calc(100% - var(--clip-left, 0%)) 0 0 round 15px);
  border: none;
  box-shadow: none;
}

/* Mobile view - optimized card size */
@media (max-width: 768px) {
  .card-ascii {
    width: 320px;
    height: 200px;
    border-radius: 12px;
  }
}

.ascii-content {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  color: rgba(139, 92, 246, 0.7);
  font-family: 'Courier New', monospace;
  font-size: 11px;
  line-height: 13px;
  overflow: hidden;
  white-space: pre;
  animation: glitch 0.1s infinite linear alternate-reverse;
  margin: 0;
  padding: 0;
  text-align: left;
  vertical-align: top;
  box-sizing: border-box;
  text-shadow: 
    0 0 10px rgba(139, 92, 246, 0.5),
    0 0 20px rgba(139, 92, 246, 0.3),
    0 0 30px rgba(139, 92, 246, 0.2);
  -webkit-mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.9) 20%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.5) 60%,
    rgba(0, 0, 0, 0.3) 80%,
    rgba(0, 0, 0, 0.1) 100%
  );
  mask-image: linear-gradient(
    to right,
    rgba(0, 0, 0, 1) 0%,
    rgba(0, 0, 0, 0.9) 20%,
    rgba(0, 0, 0, 0.7) 40%,
    rgba(0, 0, 0, 0.5) 60%,
    rgba(0, 0, 0, 0.3) 80%,
    rgba(0, 0, 0, 0.1) 100%
  );
}

/* Mobile view - optimized font size */
@media (max-width: 768px) {
  .ascii-content {
    font-size: 9px;
    line-height: 10px;
  }
}

@keyframes glitch {
  0% { opacity: 1; }
  15% { opacity: 0.9; }
  16% { opacity: 1; }
  49% { opacity: 0.8; }
  50% { opacity: 1; }
  99% { opacity: 0.9; }
  100% { opacity: 1; }
}

.scan-effect {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(90deg, transparent, rgba(0, 255, 255, 0.4), transparent);
  animation: scanEffect 0.6s ease-out;
  pointer-events: none;
  z-index: 5;
}

@keyframes scanEffect {
  0% {
    transform: translateX(-100%);
    opacity: 0;
  }
  50% {
    opacity: 1;
  }
  100% {
    transform: translateX(100%);
    opacity: 0;
  }
}

.default-card-content {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24px;
  font-weight: bold;
  background: transparent;
}
</style>
