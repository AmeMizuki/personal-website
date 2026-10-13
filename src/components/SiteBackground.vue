<script setup>
import { ref, onMounted } from 'vue'
import AsciiBackground from '@/components/AsciiBackground.vue'

const prefersReducedMotion = ref(false)

onMounted(() => {
  prefersReducedMotion.value = window.matchMedia('(prefers-reduced-motion: reduce)').matches
})

const TINT = '#eef0f4'
</script>

<template>
  <AsciiBackground
    class="site-bg"
    :tint="TINT"
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
