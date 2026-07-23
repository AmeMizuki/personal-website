<script setup>
import { ref, computed, onMounted } from 'vue'
import { Play, Pause, Rewind, FastForward, Volume2, VolumeX } from '@lucide/vue'

const VOLUME_STORAGE_KEY = 'music-player-volume'

const props = defineProps({
  album: { type: String, required: true },
  artist: { type: String, required: true },
  cover: { type: String, required: true },
  src: { type: String, required: true },
})

const audioEl = ref(null)

const isPlaying = ref(false)
const currentTime = ref(0)
const duration = ref(0)
const ready = ref(false)
const buffering = ref(false)
const hasError = ref(false)
const justRecovered = ref(false)
const volume = ref(70)
const muted = ref(true)
let recoverTimer = null

function loadStoredVolume() {
  const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : 70
}

const controlsDisabled = computed(() => !ready.value || hasError.value)

const dataState = computed(() => {
  if (hasError.value) return 'error'
  if (justRecovered.value) return 'success'
  if (!ready.value || buffering.value) return 'loading'
  return 'ready'
})

const statusText = computed(() => {
  if (hasError.value) return '音樂載入失敗'
  if (!ready.value) return '音樂載入中'
  if (buffering.value) return '緩衝中'
  return '就緒'
})

const progressPercent = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))

function flagRecovered() {
  hasError.value = false
  justRecovered.value = true
  clearTimeout(recoverTimer)
  recoverTimer = setTimeout(() => {
    justRecovered.value = false
  }, 600)
}

function onLoadedMetadata() {
  duration.value = audioEl.value.duration
}

function onCanPlay() {
  buffering.value = false
  if (!ready.value || hasError.value) flagRecovered()
  ready.value = true
}

function onWaiting() {
  if (ready.value) buffering.value = true
}

function onError() {
  hasError.value = true
  isPlaying.value = false
}

function onTimeUpdate() {
  currentTime.value = audioEl.value.currentTime
}

function onEnded() {
  isPlaying.value = false
  currentTime.value = 0
}

onMounted(() => {
  volume.value = loadStoredVolume()
  audioEl.value.volume = volume.value / 100
  // Browsers only allow autoplay-with-sound after real user interaction with the page —
  // start muted (universally allowed) and let the user unmute via the volume control.
  audioEl.value.muted = true
  muted.value = true
  audioEl.value.play().catch(() => {})
})

function togglePlay() {
  if (!audioEl.value || controlsDisabled.value) return
  if (isPlaying.value) {
    audioEl.value.pause()
  } else {
    audioEl.value.play().catch(() => {})
  }
}

function onSeek(event) {
  const value = Number(event.target.value)
  audioEl.value.currentTime = value
  currentTime.value = value
}

function toggleMute() {
  if (!audioEl.value) return
  muted.value = !muted.value
  audioEl.value.muted = muted.value
}

function onVolumeInput(event) {
  const value = Number(event.target.value)
  volume.value = value
  localStorage.setItem(VOLUME_STORAGE_KEY, String(value))
  if (!audioEl.value) return
  audioEl.value.volume = value / 100
  muted.value = value === 0
  audioEl.value.muted = muted.value
}

function skip(seconds) {
  if (!audioEl.value || controlsDisabled.value) return
  const next = Math.min(Math.max(audioEl.value.currentTime + seconds, 0), duration.value || Infinity)
  audioEl.value.currentTime = next
  currentTime.value = next
}

function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}
</script>

<template>
  <div class="music-player term-pane" :data-state="dataState">
    <audio
      ref="audioEl"
      :src="src"
      preload="metadata"
      autoplay
      muted
      @loadedmetadata="onLoadedMetadata"
      @canplay="onCanPlay"
      @waiting="onWaiting"
      @timeupdate="onTimeUpdate"
      @play="isPlaying = true"
      @pause="isPlaying = false"
      @ended="onEnded"
      @error="onError"
    ></audio>
    <span class="music-player__status" role="status" aria-live="polite">{{ statusText }}</span>

    <div class="music-player__main">
      <img class="music-player__cover" :src="cover" :alt="`${album} 專輯封面`" loading="lazy" />
      <div class="music-player__meta">
        <p class="music-player__album">{{ album }}</p>
        <p class="music-player__artist">{{ artist }}</p>
      </div>
    </div>

    <div class="music-player__progress">
      <span class="music-player__time">{{ formatTime(currentTime) }}</span>
      <input
        type="range"
        class="music-player__seek"
        min="0"
        :max="duration || 0"
        step="0.1"
        :value="currentTime"
        :disabled="controlsDisabled"
        :style="{ '--progress': `${progressPercent}%` }"
        aria-label="播放進度"
        @input="onSeek"
      />
      <span class="music-player__time">{{ formatTime(duration) }}</span>
    </div>

    <div class="music-player__controls">
      <button
        type="button"
        class="music-player__btn"
        :disabled="controlsDisabled"
        aria-label="倒退 10 秒"
        @click="skip(-10)"
      >
        <Rewind :size="18" />
      </button>
      <button
        type="button"
        class="music-player__btn music-player__btn--play"
        :disabled="controlsDisabled"
        :aria-label="isPlaying ? '暫停' : '播放'"
        @click="togglePlay"
      >
        <Pause v-if="isPlaying" :size="20" />
        <Play v-else :size="20" />
      </button>
      <button
        type="button"
        class="music-player__btn"
        :disabled="controlsDisabled"
        aria-label="快轉 10 秒"
        @click="skip(10)"
      >
        <FastForward :size="18" />
      </button>
    </div>

    <div class="music-player__volume">
      <button
        type="button"
        class="music-player__btn music-player__btn--volume"
        :disabled="controlsDisabled"
        :aria-label="muted ? '取消靜音' : '靜音'"
        @click="toggleMute"
      >
        <VolumeX v-if="muted || volume === 0" :size="16" />
        <Volume2 v-else :size="16" />
      </button>
      <input
        type="range"
        class="music-player__volume-seek"
        min="0"
        max="100"
        step="1"
        :value="muted ? 0 : volume"
        :disabled="controlsDisabled"
        :style="{ '--progress': `${muted ? 0 : volume}%` }"
        aria-label="音量"
        @input="onVolumeInput"
      />
    </div>
  </div>
</template>

<style scoped>
.music-player {
  position: relative;
  width: 100%;
  max-width: 22rem;
  padding: var(--space-lg);
  display: flex;
  flex-direction: column;
  gap: var(--space-md);
  transition: border-color var(--dur-short) var(--ease-out);
}

.music-player[data-state='error'] {
  border-color: var(--color-destructive);
}

.music-player[data-state='success'] {
  border-color: var(--color-ink-2);
}

.music-player__status {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
}

.music-player__main {
  display: flex;
  align-items: center;
  gap: var(--space-md);
  min-width: 0;
}

.music-player__cover {
  flex-shrink: 0;
  width: 3.5rem;
  height: 3.5rem;
  object-fit: cover;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius);
}

.music-player__meta {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
}

.music-player__album {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  font-weight: 700;
  color: var(--color-ink);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__artist {
  margin: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.music-player__progress {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.music-player__time {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  font-variant-numeric: tabular-nums;
  min-width: 2.4em;
}

.music-player__seek {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  height: 3px;
  border-radius: var(--radius);
  background: linear-gradient(
    to right,
    var(--color-ink) var(--progress, 0%),
    var(--color-rule) var(--progress, 0%)
  );
  outline: 2px solid transparent;
  outline-offset: 3px;
  cursor: pointer;
  transition: outline-color var(--dur-micro) var(--ease-out);
}

.music-player__seek::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-ink);
  border: none;
  cursor: pointer;
}

.music-player__seek::-moz-range-thumb {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--color-ink);
  border: none;
  cursor: pointer;
}

.music-player__seek:focus-visible {
  outline-color: var(--color-focus);
}

.music-player__seek:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.music-player__controls {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: var(--space-sm);
}

.music-player__volume {
  display: flex;
  align-items: center;
  gap: var(--space-sm);
}

.music-player__btn--volume {
  width: 1.75rem;
  height: 1.75rem;
}

.music-player__volume-seek {
  flex: 1;
  appearance: none;
  -webkit-appearance: none;
  height: 3px;
  border-radius: var(--radius);
  background: linear-gradient(
    to right,
    var(--color-ink) var(--progress, 0%),
    var(--color-rule) var(--progress, 0%)
  );
  outline: 2px solid transparent;
  outline-offset: 3px;
  cursor: pointer;
  transition: outline-color var(--dur-micro) var(--ease-out);
}

.music-player__volume-seek::-webkit-slider-thumb {
  appearance: none;
  -webkit-appearance: none;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-ink);
  border: none;
  cursor: pointer;
}

.music-player__volume-seek::-moz-range-thumb {
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background: var(--color-ink);
  border: none;
  cursor: pointer;
}

.music-player__volume-seek:focus-visible {
  outline-color: var(--color-focus);
}

.music-player__volume-seek:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.music-player__btn {
  position: relative;
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius);
  background: transparent;
  color: var(--color-ink);
  cursor: pointer;
  transition:
    background-color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out),
    transform var(--dur-micro) var(--ease-out);
}

.music-player__btn::before {
  content: '';
  position: absolute;
  inset: -11px;
}

.music-player__btn--play {
  width: 2.75rem;
  height: 2.75rem;
}

@media (hover: hover) {
  .music-player__btn:hover:not(:disabled) {
    background: var(--color-paper-3);
    border-color: var(--color-ink-2);
  }
}

.music-player__btn:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

.music-player__btn:active:not(:disabled) {
  transform: translateY(1px);
}

.music-player__btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.music-player[data-state='loading'] .music-player__btn--play {
  animation: music-player-pulse 1.1s var(--ease-in-out) infinite;
}

@keyframes music-player-pulse {
  50% {
    opacity: 0.55;
  }
}
</style>
