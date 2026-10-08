<script setup lang="ts">
import { onBeforeUnmount, onMounted, useTemplateRef, watch } from 'vue'

const props = withDefaults(defineProps<{ pause?: boolean; tint?: string }>(), {
  pause: false,
  tint: '#eef0f4',
})
const pre = useTemplateRef<HTMLPreElement>('pre')
const ramp = ' .:-=+*#%@'
let cleanup: (() => void) | undefined

// Fixed coordinate seed: resizing and replaying a frame never reshuffle the noise.
function hash(x: number, y: number) {
  let n = Math.imul(x, 374761393) ^ Math.imul(y, 668265263) ^ 0x51f15e
  n = Math.imul(n ^ (n >>> 13), 1274126177)
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296
}

onMounted(() => {
  const element = pre.value!
  let width = 1, height = 1, left = 0, top = 0
  let cellWidth = 1, cellHeight = 1, cols = 1, rows = 1
  let targetX = 0.5, targetY = 0.5, pointerX = 0.5, pointerY = 0.5
  let pointerActive = false
  let rippleX = 0, rippleY = 0, rippleStart = -Infinity
  let elapsed = 0, previous: number | undefined, lastFrame = 0, raf = 0
  let disposed = false

  function render(time: number) {
    const t = time / 1000
    const density = props.pause ? 1 : 0.16 + 0.84 * Math.min(time / 2000, 1)
    const scale = Math.min(width, height)
    const hoverX = pointerX * width / scale
    const hoverY = pointerY * height / scale
    const rippleAge = (time - rippleStart) / 1000
    const rippleStrength = !props.pause && rippleAge >= 0 && rippleAge < 1.6
      ? (1 - rippleAge / 1.6) ** 2
      : 0
    const flicker = 0.97 + hash(Math.floor(t * 8), 17) * 0.03
    let text = ''

    for (let row = 0; row < rows; row++) {
      const y = (row + 0.5) * cellHeight / scale
      const scanline = 0.88 + 0.12 * Math.sin(row * 1.7 - t * 1.2)
      for (let col = 0; col < cols; col++) {
        const noise = hash(col, row)
        if (noise > density) {
          text += ' '
          continue
        }
        // Sample in physical coordinates so click ripples stay circular.
        const x = (col + 0.5) * cellWidth / scale
        const wave = Math.sin(x * 9 + t * 0.35)
          + Math.sin(y * 11 - t * 0.25)
          + Math.sin((x + y) * 6 + t * 0.18)
        let light = 0.04 + ((wave + 3) / 6) ** 2 * 0.33 + noise * 0.045
        if (pointerActive && !props.pause) {
          const distanceSquared = (x - hoverX) ** 2 + (y - hoverY) ** 2
          light += Math.exp(-distanceSquared / 0.0144) * 0.48
        }
        if (rippleStrength > 0) {
          const distance = Math.hypot(x - rippleX * width / scale, y - rippleY * height / scale)
          const ring = Math.max(0, 1 - Math.abs(distance - (0.02 + rippleAge * 0.65)) / 0.045)
          light += ring * rippleStrength * 0.8
        }
        text += ramp[Math.round(Math.min(1, Math.max(0, light * scanline * flicker)) * (ramp.length - 1))]
      }
      if (row < rows - 1) text += '\n'
    }
    element.textContent = text
  }

  function resize() {
    if (disposed) return
    const rect = element.getBoundingClientRect()
    const style = getComputedStyle(element)
    const fontSize = parseFloat(style.fontSize) || 12
    let measuredWidth = 0
    if (element.firstChild?.textContent?.length) {
      const range = document.createRange()
      range.setStart(element.firstChild, 0)
      range.setEnd(element.firstChild, 1)
      measuredWidth = range.getBoundingClientRect().width
    }
    width = Math.max(1, rect.width)
    height = Math.max(1, rect.height)
    left = rect.left
    top = rect.top
    cellWidth = measuredWidth || fontSize * 0.6
    cellHeight = parseFloat(style.lineHeight) || fontSize
    cols = Math.max(1, Math.floor(width / cellWidth))
    rows = Math.max(1, Math.floor(height / cellHeight))
    render(props.pause ? 0 : elapsed)
  }

  function tick(now: number) {
    if (document.hidden || props.pause) return
    if (previous !== undefined) elapsed += now - previous
    previous = now
    if (elapsed - lastFrame >= 50) {
      const smoothing = 1 - Math.exp(-(elapsed - lastFrame) / 180)
      pointerX += (targetX - pointerX) * smoothing
      pointerY += (targetY - pointerY) * smoothing
      render(elapsed)
      lastFrame = elapsed
    }
    raf = requestAnimationFrame(tick)
  }

  function syncAnimation() {
    cancelAnimationFrame(raf)
    previous = undefined
    if (props.pause) {
      elapsed = lastFrame = 0
      pointerX = pointerY = 0.5
      pointerActive = false
      rippleStart = -Infinity
      render(0)
    } else if (!document.hidden) {
      raf = requestAnimationFrame(tick)
    }
  }

  function pointerMove(event: PointerEvent) {
    if (props.pause) return
    pointerActive = true
    targetX = Math.max(0, Math.min(1, (event.clientX - left) / width))
    targetY = Math.max(0, Math.min(1, (event.clientY - top) / height))
  }

  function click(event: MouseEvent) {
    if (props.pause || document.hidden) return
    rippleX = Math.max(0, Math.min(1, (event.clientX - left) / width))
    rippleY = Math.max(0, Math.min(1, (event.clientY - top) / height))
    rippleStart = elapsed
  }

  const observer = new ResizeObserver(resize)
  resize()
  observer.observe(element)
  void document.fonts.ready.then(resize)
  window.addEventListener('pointermove', pointerMove, { passive: true })
  window.addEventListener('click', click, { passive: true })
  document.addEventListener('visibilitychange', syncAnimation)
  const stopWatching = watch(() => props.pause, syncAnimation)
  syncAnimation()

  cleanup = () => {
    disposed = true
    cancelAnimationFrame(raf)
    observer.disconnect()
    stopWatching()
    window.removeEventListener('pointermove', pointerMove)
    window.removeEventListener('click', click)
    document.removeEventListener('visibilitychange', syncAnimation)
    element.textContent = ''
  }
})

onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <pre ref="pre" class="ascii-background" aria-hidden="true" :style="{ color: tint }" />
</template>

<style scoped>
.ascii-background {
  margin: 0;
  overflow: hidden;
  pointer-events: none;
  user-select: none;
  white-space: pre;
  font-family: var(--font-mono);
  font-size: clamp(10px, 1.2vw, 24px);
  font-weight: 400;
  font-variant-ligatures: none;
  line-height: 1;
  letter-spacing: 0;
  opacity: 0.3;
}
</style>
