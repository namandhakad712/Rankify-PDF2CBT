<script setup lang="ts">
import { gsap } from 'gsap';
import { nextTick, onMounted, onBeforeUnmount, useTemplateRef } from 'vue';

function lerp(a: number, b: number, n: number): number {
  return (1 - n) * a + n * b;
}

function getLocalPointerPos(e: MouseEvent | TouchEvent, rect: DOMRect): { x: number; y: number } {
  let clientX = 0,
    clientY = 0;
  if ('touches' in e && e.touches.length > 0) {
    clientX = e.touches[0].clientX;
    clientY = e.touches[0].clientY;
  } else if ('clientX' in e) {
    clientX = e.clientX;
    clientY = e.clientY;
  }
  return {
    x: clientX - rect.left,
    y: clientY - rect.top
  };
}

function getMouseDistance(p1: { x: number; y: number }, p2: { x: number; y: number }): number {
  const dx = p1.x - p2.x;
  const dy = p1.y - p2.y;
  return Math.hypot(dx, dy);
}

class ImageItem {
  public DOM: { el: HTMLDivElement; inner: HTMLDivElement | null } = {
    el: null as unknown as HTMLDivElement,
    inner: null
  };
  public defaultStyle: gsap.TweenVars = { scale: 1, x: 0, y: 0, opacity: 0 };
  public rect: DOMRect | null = null;
  private resize!: () => void;

  constructor(DOM_el: HTMLDivElement) {
    this.DOM.el = DOM_el;
    this.DOM.inner = this.DOM.el.querySelector('.content__img-inner');
    this.getRect();
    this.initEvents();
  }

  private initEvents() {
    this.resize = () => {
      gsap.set(this.DOM.el, this.defaultStyle);
      this.getRect();
    };
    window.addEventListener('resize', this.resize);
  }

  private getRect() {
    this.rect = this.DOM.el.getBoundingClientRect();
  }

  public destroy() {
    window.removeEventListener('resize', this.resize);
  }
}

class ImageTrailVariant1 {
  private container: HTMLDivElement;
  private images: ImageItem[];
  private imagesTotal: number;
  private imgPosition: number;
  private zIndexVal: number;
  private activeImagesCount: number;
  private isIdle: boolean;
  private threshold: number;
  private mousePos: { x: number; y: number };
  private lastMousePos: { x: number; y: number };
  private cacheMousePos: { x: number; y: number };
  private rafId: number | null = null;
  private destroyed = false;
  private inBounds = false;

  constructor(container: HTMLDivElement, threshold = 80) {
    this.container = container;
    this.images = [...container.querySelectorAll('.content__img')].map(img => new ImageItem(img as HTMLDivElement));
    this.imagesTotal = this.images.length;
    this.imgPosition = 0;
    this.zIndexVal = 1;
    this.activeImagesCount = 0;
    this.isIdle = true;
    this.threshold = threshold;
    this.mousePos = { x: 0, y: 0 };
    this.lastMousePos = { x: 0, y: 0 };
    this.cacheMousePos = { x: 0, y: 0 };

    const handlePointerMove = (ev: MouseEvent | TouchEvent) => {
      const rect = this.container.getBoundingClientRect();
      const cx = 'touches' in ev && ev.touches.length > 0 ? ev.touches[0].clientX : (ev as MouseEvent).clientX;
      const cy = 'touches' in ev && ev.touches.length > 0 ? ev.touches[0].clientY : (ev as MouseEvent).clientY;
      this.inBounds = cx >= rect.left && cx <= rect.right && cy >= rect.top && cy <= rect.bottom;
      this.mousePos = getLocalPointerPos(ev, rect);
    };
    window.addEventListener('mousemove', handlePointerMove);
    window.addEventListener('touchmove', handlePointerMove);

    const initRender = (ev: MouseEvent | TouchEvent) => {
      const rect = this.container.getBoundingClientRect();
      this.mousePos = getLocalPointerPos(ev, rect);
      this.cacheMousePos = { ...this.mousePos };
      this.rafId = requestAnimationFrame(() => this.render());
      window.removeEventListener('mousemove', initRender as EventListener);
      window.removeEventListener('touchmove', initRender as EventListener);
    };
    window.addEventListener('mousemove', initRender as EventListener);
    window.addEventListener('touchmove', initRender as EventListener);
    this.handlePointerMove = handlePointerMove;
    this.initRender = initRender;
  }

  private handlePointerMove!: (ev: MouseEvent | TouchEvent) => void;
  private initRender!: (ev: MouseEvent | TouchEvent) => void;

  private render() {
    if (this.destroyed) return;
    const distance = getMouseDistance(this.mousePos, this.lastMousePos);
    this.cacheMousePos.x = lerp(this.cacheMousePos.x, this.mousePos.x, 0.1);
    this.cacheMousePos.y = lerp(this.cacheMousePos.y, this.mousePos.y, 0.1);

    if (distance > this.threshold && this.inBounds) {
      this.showNextImage();
      this.lastMousePos = { ...this.mousePos };
    }
    if (this.isIdle && this.zIndexVal !== 1) {
      this.zIndexVal = 1;
    }
    this.rafId = requestAnimationFrame(() => this.render());
  }

  private showNextImage() {
    ++this.zIndexVal;
    this.imgPosition = this.imgPosition < this.imagesTotal - 1 ? this.imgPosition + 1 : 0;
    const img = this.images[this.imgPosition];

    gsap.killTweensOf(img.DOM.el);
    gsap
      .timeline({
        onStart: () => this.onImageActivated(),
        onComplete: () => this.onImageDeactivated()
      })
      .fromTo(
        img.DOM.el,
        {
          opacity: 1,
          scale: 1,
          zIndex: this.zIndexVal,
          x: this.cacheMousePos.x - (img.rect?.width ?? 0) / 2,
          y: this.cacheMousePos.y - (img.rect?.height ?? 0) / 2
        },
        {
          duration: 0.4,
          ease: 'power1',
          x: this.mousePos.x - (img.rect?.width ?? 0) / 2,
          y: this.mousePos.y - (img.rect?.height ?? 0) / 2
        },
        0
      )
      .to(
        img.DOM.el,
        {
          duration: 0.4,
          ease: 'power3',
          opacity: 0,
          scale: 0.2
        },
        0.4
      );
  }

  private onImageActivated() {
    this.activeImagesCount++;
    this.isIdle = false;
  }

  private onImageDeactivated() {
    this.activeImagesCount--;
    if (this.activeImagesCount === 0) {
      this.isIdle = true;
    }
  }

  public destroy() {
    this.destroyed = true;
    if (this.rafId !== null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    window.removeEventListener('mousemove', this.handlePointerMove);
    window.removeEventListener('touchmove', this.handlePointerMove);
    window.removeEventListener('mousemove', this.initRender);
    window.removeEventListener('touchmove', this.initRender);
    this.images.forEach(img => {
      gsap.killTweensOf(img.DOM.el);
      img.destroy();
    });
  }
}

interface ImageTrailProps {
  items?: string[];
  variant?: number;
  threshold?: number;
}

const props = withDefaults(defineProps<ImageTrailProps>(), {
  items: () => [],
  variant: 1,
  threshold: 80
});

const containerRef = useTemplateRef<HTMLDivElement>('containerRef');
let instance: ImageTrailVariant1 | null = null;

onMounted(async () => {
  await nextTick();
  if (!containerRef.value) return;
  instance = new ImageTrailVariant1(containerRef.value, props.threshold);
});

onBeforeUnmount(() => {
  instance?.destroy();
  instance = null;
});
</script>

<template>
  <div ref="containerRef" class="absolute inset-0 z-10 pointer-events-none overflow-hidden">
    <div
      v-for="(url, i) in items"
      :key="i"
      class="top-0 left-0 absolute opacity-0 rounded-[18px] w-[120px] aspect-square overflow-hidden [will-change:transform,filter] content__img"
    >
      <div
        class="top-[-10px] left-[-10px] absolute bg-contain bg-center bg-no-repeat w-[calc(100%+20px)] h-[calc(100%+20px)] content__img-inner"
        :style="{ backgroundImage: `url(${url})` }"
      />
    </div>
  </div>
</template>
