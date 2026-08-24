<template>
  <div
    ref="cursorRef"
    :style="{
      position: props.fixed || !containerRef ? 'fixed' : 'absolute',
      top: 0,
      left: 0,
      width: '100%',
      height: '100%',
      pointerEvents: 'none',
      zIndex: 10000
    }"
  >
    <svg
      :style="{
        position: 'absolute',
        left: 0,
        top: 0,
        width: '100%',
        height: '100%'
      }"
    >
      <defs>
        <filter id="filter-noise-x">
          <feTurbulence type="fractalNoise" baseFrequency="0.000001" numOctaves="1" ref="filterXRef" />
          <feDisplacementMap in="SourceGraphic" scale="40" />
        </filter>
        <filter id="filter-noise-y">
          <feTurbulence type="fractalNoise" baseFrequency="0.000001" numOctaves="1" ref="filterYRef" />
          <feDisplacementMap in="SourceGraphic" scale="40" />
        </filter>
      </defs>
    </svg>
    <div
      ref="lineHorizontalRef"
      :style="{
        position: 'absolute',
        width: '100%',
        height: '1px',
        background: color,
        pointerEvents: 'none',
        transform: 'translateY(50%)',
        opacity: 0
      }"
    />
    <div
      ref="lineVerticalRef"
      :style="{
        position: 'absolute',
        height: '100%',
        width: '1px',
        background: color,
        pointerEvents: 'none',
        transform: 'translateX(50%)',
        opacity: 0
      }"
    />
  </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, useTemplateRef, watchEffect, type Ref } from 'vue';
import { gsap } from 'gsap';

interface Props {
  color?: string;
  containerRef?: HTMLElement | null;
  fixed?: boolean;
}

const props = withDefaults(defineProps<Props>(), {
  color: 'white',
  containerRef: null,
  fixed: false
});

const cursorRef = useTemplateRef<HTMLDivElement>('cursorRef');
const lineHorizontalRef = useTemplateRef<HTMLDivElement>('lineHorizontalRef');
const lineVerticalRef = useTemplateRef<HTMLDivElement>('lineVerticalRef');
const filterXRef = useTemplateRef<SVGFETurbulenceElement>('filterXRef');
const filterYRef = useTemplateRef<SVGFETurbulenceElement>('filterYRef');

const lerp = (a: number, b: number, n: number): number => (1 - n) * a + n * b;

const getMousePos = (e: MouseEvent, container: HTMLElement | null) => {
  if (!props.fixed && container) {
    const bounds = container.getBoundingClientRect();
    return {
      x: e.clientX - bounds.left,
      y: e.clientY - bounds.top
    };
  }
  return { x: e.clientX, y: e.clientY };
};

let mouse = { x: 0, y: 0 };
let animationId: number | null = null;
let cleanup: (() => void) | null = null;

onMounted(() => {
  watchEffect(() => {
    if (cleanup) {
      cleanup();
    }

    const handleMouseMove = (ev: Event) => {
      const mouseEvent = ev as MouseEvent;
      mouse = getMousePos(mouseEvent, props.containerRef);

      if (props.containerRef) {
        const bounds = props.containerRef.getBoundingClientRect();
        if (
          mouseEvent.clientX < bounds.left ||
          mouseEvent.clientX > bounds.right ||
          mouseEvent.clientY < bounds.top ||
          mouseEvent.clientY > bounds.bottom
        ) {
          gsap.to([lineHorizontalRef.value, lineVerticalRef.value], { opacity: 0 });
        } else {
          gsap.to([lineHorizontalRef.value, lineVerticalRef.value], { opacity: 1 });
        }
      }
    };

    const target = window;
    target.addEventListener('mousemove', handleMouseMove);

    const renderedStyles: {
      [key: string]: { previous: number; current: number; amt: number };
    } = {
      tx: { previous: 0, current: 0, amt: 0.3 },
      ty: { previous: 0, current: 0, amt: 0.3 }
    };

    gsap.set([lineHorizontalRef.value, lineVerticalRef.value], { opacity: 0 });

    const onMouseMove = () => {
      renderedStyles.tx.previous = renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.previous = renderedStyles.ty.current = mouse.y;

      gsap.to([lineHorizontalRef.value, lineVerticalRef.value], {
        duration: 0.9,
        ease: 'Power3.easeOut',
        opacity: 1
      });

      if (animationId === null) {
        animationId = requestAnimationFrame(render);
      }

      target.removeEventListener('mousemove', onMouseMove);
    };

    target.addEventListener('mousemove', onMouseMove);

    const primitiveValues = { turbulence: 0 };

    const tl = gsap
      .timeline({
        paused: true,
        onStart: () => {
          if (lineHorizontalRef.value && lineVerticalRef.value) {
            lineHorizontalRef.value.style.filter = 'url(#filter-noise-x)';
            lineVerticalRef.value.style.filter = 'url(#filter-noise-y)';
          }
        },
        onUpdate: () => {
          if (filterXRef.value && filterYRef.value) {
            filterXRef.value.setAttribute('baseFrequency', primitiveValues.turbulence.toString());
            filterYRef.value.setAttribute('baseFrequency', primitiveValues.turbulence.toString());
          }
        },
        onComplete: () => {
          if (lineHorizontalRef.value && lineVerticalRef.value) {
            lineHorizontalRef.value.style.filter = 'none';
            lineVerticalRef.value.style.filter = 'none';
          }
        }
      })
      .to(primitiveValues, {
        duration: 0.5,
        ease: 'power1',
        startAt: { turbulence: 1 },
        turbulence: 0
      });

    const enter = () => tl.restart();
    const leave = () => tl.progress(1).kill();

    const render = () => {
      renderedStyles.tx.current = mouse.x;
      renderedStyles.ty.current = mouse.y;

      for (const key in renderedStyles) {
        renderedStyles[key].previous = lerp(
          renderedStyles[key].previous,
          renderedStyles[key].current,
          renderedStyles[key].amt
        );
      }

      if (lineHorizontalRef.value && lineVerticalRef.value) {
        gsap.set(lineVerticalRef.value, { x: renderedStyles.tx.previous });
        gsap.set(lineHorizontalRef.value, { y: renderedStyles.ty.previous });
      }

      animationId = requestAnimationFrame(render);
    };

    const links = props.containerRef ? props.containerRef.querySelectorAll('a') : document.querySelectorAll('a');

    links.forEach((link: HTMLAnchorElement) => {
      link.addEventListener('mouseenter', enter);
      link.addEventListener('mouseleave', leave);
    });

    cleanup = () => {
      target.removeEventListener('mousemove', handleMouseMove);
      target.removeEventListener('mousemove', onMouseMove);

      if (animationId !== null) {
        cancelAnimationFrame(animationId);
        animationId = null;
      }

      links.forEach((link: HTMLAnchorElement) => {
        link.removeEventListener('mouseenter', enter);
        link.removeEventListener('mouseleave', leave);
      });
    };
  });

  onUnmounted(() => {
    if (cleanup) {
      cleanup();
    }
  });
});
</script>
