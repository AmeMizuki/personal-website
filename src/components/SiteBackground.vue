<script setup>
import { ref, onMounted } from 'vue'
import FaultyTerminal from '@/components/FaultyTerminal/FaultyTerminal.vue'

const prefersReducedMotion = ref(false)

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const TINT = '#eef0f4'
</script>

<template>
  <FaultyTerminal
    class="site-bg"
    :tint="TINT"
    :scale="2"
    :grid-mul="[3, 2]"
    :digit-size="1.2"
    :scanline-intensity="0.25"
    :curvature="0.15"
    :chromatic-aberration="0"
    :brightness="0.55"
    :mouse-strength="0.25"
    :glitch-amount="0.4"
    :flicker-amount="0.5"
    :noise-amp="0.6"
    :time-scale="0.2"
    :page-load-animation="!prefersReducedMotion"
    :pause="prefersReducedMotion"
  />
</template>

<style scoped>
.site-bg {
  position: fixed;
  inset: 0;
  z-index: var(--z-base);
}
</style>
