<script setup>
import { computed, nextTick, ref, onBeforeUnmount, watch } from 'vue'
import { ChevronLeft, ChevronRight, X, Expand } from '@lucide/vue'
import { useI18n } from '@/composables/i18nStore'

const props = defineProps({ images: { type: Array, default: () => [] }, title: { type: String, required: true } })
const { t } = useI18n()
const selected = ref(0)
const failed = ref(new Set())
const root = ref(null)
const viewer = ref(null)
const mainButton = ref(null)
const current = computed(() => props.images[selected.value])
const position = computed(() => t('projects.imagePosition', { index: selected.value + 1, total: props.images.length }))
let swipe = null

function select(index) {
  selected.value = (index + props.images.length) % props.images.length
}
function keydown(event) {
  if (props.images.length < 2 || !['ArrowLeft', 'ArrowRight'].includes(event.key)) return
  event.preventDefault()
  select(selected.value + (event.key === 'ArrowRight' ? 1 : -1))
}
function markFailed(event) {
  failed.value = new Set([...failed.value, event.target.getAttribute('src')])
}
// Scroll the strips themselves (never the page) so the selected thumbnail stays visible.
function centerSelected(smooth = true) {
  const behavior = smooth && !matchMedia('(prefers-reduced-motion: reduce)').matches ? 'smooth' : 'auto'
  root.value?.querySelectorAll('.gallery__strip').forEach(strip => {
    const item = strip.querySelector('[aria-pressed="true"]')
    if (item) strip.scrollTo({ left: item.offsetLeft - (strip.clientWidth - item.offsetWidth) / 2, behavior })
  })
}
function openPreview() {
  viewer.value.showModal()
  centerSelected(false)
}
function closePreview() { viewer.value.close() }
function swipeBegin(event) { swipe = { x: event.clientX, y: event.clientY } }
function swipeCancel() { swipe = null }
function swipeEnd(event) {
  if (!swipe) return
  const dx = event.clientX - swipe.x
  const dy = event.clientY - swipe.y
  swipe = null
  if (props.images.length > 1 && Math.abs(dx) > 48 && Math.abs(dx) > Math.abs(dy) * 1.5) select(selected.value + (dx < 0 ? 1 : -1))
}
watch(selected, () => nextTick(centerSelected))
watch(() => props.images, () => { selected.value = 0; failed.value = new Set() })
onBeforeUnmount(() => { if (viewer.value?.open) viewer.value.close() })
</script>

<template>
  <section v-if="current" ref="root" class="gallery" :aria-label="t('projects.galleryLabel', { title })" @keydown="keydown">
    <div v-if="failed.has(current.src)" class="gallery__error" role="status">
      <p>{{ t('projects.imageError') }}</p>
      <a :href="current.src" target="_blank" rel="noopener noreferrer">{{ t('projects.openImage') }}</a>
    </div>
    <button v-else ref="mainButton" class="gallery__main" type="button" :aria-label="t('projects.viewImage', { index: selected + 1 })" @click="openPreview">
      <span class="gallery__backdrop" :style="{ backgroundImage: `url(${JSON.stringify(current.src)})` }" aria-hidden="true"></span>
      <img :key="current.src" class="gallery__image" :src="current.src" :alt="current.alt" loading="lazy" decoding="async" draggable="false" @error="markFailed" />
      <span class="gallery__expand"><Expand :size="16" aria-hidden="true" /> {{ position }}</span>
    </button>
    <div v-if="images.length > 1" class="gallery__strip gallery__thumbnails">
      <button v-for="(image, index) in images" :key="index" type="button" class="gallery__thumbnail" :aria-label="t('projects.viewImage', { index: index + 1 })" :aria-pressed="selected === index" @click="select(index)">
        <img :src="image.src" alt="" loading="lazy" decoding="async" draggable="false" />
        <span>{{ index + 1 }}</span>
      </button>
    </div>
    <p class="gallery__sr" role="status">{{ position }}</p>
    <dialog ref="viewer" class="gallery__viewer" :aria-label="t('projects.galleryLabel', { title })" @close="mainButton?.focus()">
      <div class="gallery__toolbar">
        <span role="status">{{ position }}</span>
        <button type="button" :aria-label="t('projects.closePreview')" autofocus @click="closePreview"><X :size="20" aria-hidden="true" /></button>
      </div>
      <div class="gallery__stage" @pointerdown="swipeBegin" @pointerup="swipeEnd" @pointercancel="swipeCancel">
        <div v-if="failed.has(current.src)" class="gallery__error" role="status">
          <p>{{ t('projects.imageError') }}</p>
          <a :href="current.src" target="_blank" rel="noopener noreferrer">{{ t('projects.openImage') }}</a>
        </div>
        <img v-else :key="current.src" class="gallery__full-image" :src="current.src" :alt="current.alt" loading="lazy" decoding="async" draggable="false" @error="markFailed" />
        <div v-if="images.length > 1" class="gallery__navigation">
          <button type="button" :aria-label="t('projects.previousImage')" @click="select(selected - 1)"><ChevronLeft :size="20" aria-hidden="true" /></button>
          <button type="button" :aria-label="t('projects.nextImage')" @click="select(selected + 1)"><ChevronRight :size="20" aria-hidden="true" /></button>
        </div>
      </div>
      <div v-if="images.length > 1" class="gallery__strip gallery__viewer-strip">
        <button v-for="(image, index) in images" :key="index" type="button" class="gallery__viewer-thumbnail" :aria-label="t('projects.viewImage', { index: index + 1 })" :aria-pressed="selected === index" @click="select(index)">
          <img :src="image.src" alt="" loading="lazy" decoding="async" draggable="false" />
          <span>{{ index + 1 }}</span>
        </button>
      </div>
    </dialog>
  </section>
</template>

<style scoped>
.gallery { min-width: 0; margin-block: var(--space-md); font-variant-numeric: tabular-nums; }
.gallery button {
  font: inherit; color: var(--color-ink); background: var(--color-paper-3);
  border: 1px solid var(--color-rule); border-radius: var(--radius); cursor: pointer;
  -webkit-tap-highlight-color: transparent;
  transition-property: border-color, opacity, scale; transition-duration: 150ms; transition-timing-function: ease-out;
}
.gallery button:active { scale: 0.96; }
.gallery .gallery__main:active { scale: 1; }
.gallery button:focus-visible, .gallery a:focus-visible { outline: 2px solid var(--color-focus); outline-offset: 3px; }

/* Main image: the frame fills the card width; the image is contained (never cropped) over a blurred copy of itself. */
.gallery__main { display: block; position: relative; isolation: isolate; width: 100%; aspect-ratio: 16 / 10; padding: 0; overflow: hidden; cursor: zoom-in; }
.gallery__backdrop { position: absolute; inset: 0; z-index: -1; background-position: center; background-size: cover; filter: blur(24px) brightness(0.55); scale: 1.2; }
.gallery__image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; }
.gallery__expand {
  position: absolute; inset-block-end: var(--space-xs); inset-inline-end: var(--space-xs);
  display: flex; align-items: center; gap: var(--space-xs); padding: var(--space-2xs) var(--space-xs);
  border-radius: var(--radius); background: color-mix(in oklab, var(--color-paper) 72%, transparent);
  backdrop-filter: blur(6px); font-size: var(--text-sm); pointer-events: none;
}

/* Pure black/white 1px image outlines, inset so they never change layout. */
.gallery__image, .gallery__full-image, .gallery__thumbnail img, .gallery__viewer-thumbnail img { outline: 1px solid oklch(0 0 0 / 0.1); outline-offset: -1px; }
:global(.dark) .gallery__image, :global(.dark) .gallery__full-image, :global(.dark) .gallery__thumbnail img, :global(.dark) .gallery__viewer-thumbnail img { outline-color: oklch(1 0 0 / 0.1); }

/* Image swap: a 150ms opacity fade only. */
.gallery__image, .gallery__full-image { transition: opacity 150ms ease-out; }
@starting-style { .gallery__image, .gallery__full-image { opacity: 0; } }

/* Thumbnails keep their natural ratio (fixed height, contained) so nothing is cropped. */
.gallery__strip { position: relative; display: flex; gap: var(--space-xs); padding: 6px; overflow-x: auto; overscroll-behavior-inline: contain; scrollbar-width: thin; }
.gallery__thumbnail, .gallery__viewer-thumbnail { position: relative; display: flex; flex: none; height: 3.5rem; min-width: 3.5rem; max-width: 7rem; padding: 0; overflow: hidden; opacity: 0.6; }
.gallery__thumbnail img, .gallery__viewer-thumbnail img { display: block; height: 100%; width: auto; max-width: 100%; margin-inline: auto; object-fit: contain; }
.gallery__thumbnail span, .gallery__viewer-thumbnail span {
  position: absolute; inset-inline-end: 3px; inset-block-end: 3px; padding-inline: 4px;
  background: color-mix(in oklab, var(--color-paper) 72%, transparent); font-size: var(--text-xs);
}
.gallery__thumbnail[aria-pressed='true'], .gallery__viewer-thumbnail[aria-pressed='true'] { opacity: 1; outline: 2px solid var(--color-focus); outline-offset: -2px; }
.gallery__thumbnail[aria-pressed='true'] span, .gallery__viewer-thumbnail[aria-pressed='true'] span { text-decoration: underline; font-weight: 700; }
.gallery__sr { position: absolute; width: 1px; height: 1px; margin: 0; overflow: hidden; clip-path: inset(50%); white-space: nowrap; }

/* Full-screen viewer: the image fills the whole stage, contained. */
.gallery__viewer {
  position: fixed; inset: 0; width: 100%; max-width: none; height: 100dvh; max-height: none; margin: 0; padding: 0; border: 0;
  color: var(--color-ink); background: color-mix(in oklab, var(--color-paper) 96%, transparent);
  backdrop-filter: blur(12px); overscroll-behavior: contain;
  opacity: 0; transition: opacity 150ms ease-out, overlay 150ms ease-out allow-discrete, display 150ms ease-out allow-discrete;
}
.gallery__viewer[open] { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; opacity: 1; }
@starting-style { .gallery__viewer[open] { opacity: 0; } }
.gallery__viewer::backdrop { background: transparent; }
:global(html:has(.gallery__viewer[open])) { overflow: hidden; }
.gallery__toolbar { display: flex; align-items: center; justify-content: space-between; gap: var(--space-xs); padding: var(--space-xs) var(--space-md); font-size: var(--text-sm); }
.gallery__toolbar button, .gallery__navigation button { display: inline-flex; align-items: center; justify-content: center; min-width: 44px; min-height: 44px; padding: 0; }
.gallery__stage { position: relative; min-height: 0; touch-action: pan-y pinch-zoom; }
.gallery__full-image { position: absolute; inset: 0; width: 100%; height: 100%; object-fit: contain; user-select: none; }
.gallery__navigation { position: absolute; inset: 0; display: flex; align-items: center; justify-content: space-between; padding-inline: var(--space-sm); pointer-events: none; }
.gallery__navigation button { pointer-events: auto; background: color-mix(in oklab, var(--color-paper) 70%, transparent); backdrop-filter: blur(6px); }
.gallery__viewer-strip { justify-content: safe center; padding-inline: var(--space-md); }

.gallery__error { display: grid; gap: var(--space-xs); place-content: center; justify-items: center; aspect-ratio: 16 / 10; padding: var(--space-md); background: var(--color-paper-3); font-size: var(--text-sm); text-align: center; }
.gallery__error p { margin: 0; }
.gallery__error a { color: var(--color-ink); text-decoration: underline; }
.gallery__stage .gallery__error { position: absolute; inset: 0; aspect-ratio: auto; }

@media (max-width: 30rem) { .gallery__main, .gallery__error { aspect-ratio: 4 / 3; } }
@media (hover: hover) {
  .gallery button:hover { border-color: var(--color-ink-2); }
  .gallery__thumbnail:hover, .gallery__viewer-thumbnail:hover { opacity: 1; }
}
@media (prefers-reduced-motion: reduce) { .gallery button:active { scale: 1; } }
</style>
