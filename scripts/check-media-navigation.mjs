import { navigate } from 'astro:transitions/client'
import fixtureURL from './media-navigation.webm?url'

export async function checkMediaNavigation() {
  const originalURL = location.href
  const url = new URL(fixtureURL, location.href).href
  const insert = event => {
    const load = event.loader
    event.loader = async () => {
      await load()
      const video = event.newDocument.createElement('video')
      video.id = 'media-navigation-check'
      video.src = url
      video.controls = true
      video.muted = true
      video.preload = 'metadata'
      event.newDocument.querySelector('main').append(video)
      // Let resource selection run while the fetched document is still inactive.
      await new Promise(resolve => setTimeout(resolve, 50))
    }
  }
  document.addEventListener('astro:before-preparation', insert)
  try {
    for (const path of ['/journal', '/notes', '/journal']) {
      const loaded = new Promise(resolve => document.addEventListener('astro:page-load', resolve, { once: true }))
      await navigate(path)
      await loaded
      const video = document.querySelector('#media-navigation-check')
      if (!video) throw new Error('Navigation must insert the new page media')
      // Reject on an actual decoding error, or if playback fails to advance.
      await new Promise((resolve, reject) => {
        const timeout = setTimeout(() => finish(new Error('Video did not play after navigation')), 10000)
        const progress = () => { if (video.currentTime > 0) finish() }
        const error = () => finish(new Error(video.error?.message ?? 'Video load failed'))
        function finish(failure) {
          clearTimeout(timeout)
          video.removeEventListener('timeupdate', progress)
          video.removeEventListener('error', error)
          failure ? reject(failure) : resolve()
        }
        video.addEventListener('timeupdate', progress)
        video.addEventListener('error', error)
        if (video.error) return error()
        video.play().catch(finish)
      })
      if (!video.videoWidth) throw new Error('Video must decode a visible frame')
      video.pause()
    }
    return 'PASS: journal → notes → journal videos decode and play after client-side navigation'
  } finally {
    document.removeEventListener('astro:before-preparation', insert)
    await navigate(originalURL)
  }
}
