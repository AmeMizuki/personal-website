import { ref, computed } from 'vue'

const VOLUME_STORAGE_KEY = 'music-player-volume'

let player = null
let pollTimer = null
let recoverTimer = null

export const isPlaying = ref(false)
export const currentTime = ref(0)
export const duration = ref(0)
export const ready = ref(false)
export const buffering = ref(false)
export const hasError = ref(false)
export const justRecovered = ref(false)
export const volume = ref(70)
export const muted = ref(true)

function loadStoredVolume() {
  const stored = Number(localStorage.getItem(VOLUME_STORAGE_KEY))
  return Number.isFinite(stored) && stored >= 0 && stored <= 100 ? stored : 70
}

export const controlsDisabled = computed(() => !ready.value || hasError.value)

export const dataState = computed(() => {
  if (hasError.value) return 'error'
  if (justRecovered.value) return 'success'
  if (!ready.value || buffering.value) return 'loading'
  return 'ready'
})

export const statusText = computed(() => {
  if (hasError.value) return '音樂載入失敗'
  if (!ready.value) return '音樂載入中'
  if (buffering.value) return '緩衝中'
  return '就緒'
})

export const progressPercent = computed(() => (duration.value ? (currentTime.value / duration.value) * 100 : 0))

function flagRecovered() {
  hasError.value = false
  justRecovered.value = true
  clearTimeout(recoverTimer)
  recoverTimer = setTimeout(() => {
    justRecovered.value = false
  }, 600)
}

function startPolling() {
  clearInterval(pollTimer)
  pollTimer = setInterval(() => {
    if (!player || typeof player.getCurrentTime !== 'function') return
    currentTime.value = player.getCurrentTime()
  }, 250)
}

function onPlayerReady(event) {
  duration.value = event.target.getDuration()
  volume.value = loadStoredVolume()
  event.target.setVolume(volume.value)

  event.target.mute()
  muted.value = true
  ready.value = true
  event.target.playVideo()
  startPolling()
}

function onPlayerStateChange(event) {
  const State = window.YT.PlayerState
  if (event.data === State.PLAYING) {
    isPlaying.value = true
    buffering.value = false
    if (hasError.value) flagRecovered()
    duration.value = player.getDuration()
  } else if (event.data === State.PAUSED) {
    isPlaying.value = false
    buffering.value = false
  } else if (event.data === State.BUFFERING) {
    buffering.value = true
  } else if (event.data === State.ENDED) {
    isPlaying.value = false
    buffering.value = false
    currentTime.value = 0
  }
}

function onPlayerError() {
  hasError.value = true
  isPlaying.value = false
}

export function initPlayer(videoId) {
  if (player) return

  let host = document.getElementById('music-player-engine-host')
  if (!host) {
    host = document.createElement('div')
    host.id = 'music-player-engine-host'
    host.style.cssText = 'position:fixed;width:1px;height:1px;overflow:hidden;opacity:0;pointer-events:none;'
    document.documentElement.appendChild(host)
  }

  function create() {
    player = new window.YT.Player(host, {
      height: '1',
      width: '1',
      videoId,
      playerVars: {
        autoplay: 1,
        controls: 0,
        disablekb: 1,
        fs: 0,
        modestbranding: 1,
        playsinline: 1,
        rel: 0,
      },
      events: {
        onReady: onPlayerReady,
        onStateChange: onPlayerStateChange,
        onError: onPlayerError,
      },
    })
  }

  if (window.YT && window.YT.Player) {
    create()
    return
  }
  const previousCallback = window.onYouTubeIframeAPIReady
  window.onYouTubeIframeAPIReady = () => {
    previousCallback?.()
    create()
  }
  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const script = document.createElement('script')
    script.src = 'https://www.youtube.com/iframe_api'
    document.head.appendChild(script)
  }
}

export function togglePlay() {
  if (!player || controlsDisabled.value) return
  if (isPlaying.value) {
    player.pauseVideo()
  } else {
    player.playVideo()
  }
}

export function onSeek(event) {
  const value = Number(event.target.value)
  player.seekTo(value, true)
  currentTime.value = value
}

export function toggleMute() {
  if (!player) return
  muted.value = !muted.value
  if (muted.value) {
    player.mute()
  } else {
    player.unMute()
  }
}

export function onVolumeInput(event) {
  const value = Number(event.target.value)
  volume.value = value
  localStorage.setItem(VOLUME_STORAGE_KEY, String(value))
  if (!player) return
  player.setVolume(value)
  muted.value = value === 0
  if (muted.value) {
    player.mute()
  } else {
    player.unMute()
  }
}

export function skip(seconds) {
  if (!player || controlsDisabled.value) return
  const next = Math.min(Math.max(player.getCurrentTime() + seconds, 0), duration.value || Infinity)
  player.seekTo(next, true)
  currentTime.value = next
}

export function formatTime(seconds) {
  if (!Number.isFinite(seconds)) return '0:00'
  const m = Math.floor(seconds / 60)
  const s = Math.floor(seconds % 60)
    .toString()
    .padStart(2, '0')
  return `${m}:${s}`
}
