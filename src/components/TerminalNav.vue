<script setup>
import { computed, onMounted, onBeforeUnmount, ref } from 'vue'
import { profile } from '@/data/profile'
import DecryptedText from '@/components/DecryptedText/DecryptedText.vue'
import MusicPlayerSkin from '@/components/MusicPlayerSkin.vue'
import { initPlayer } from '@/composables/musicPlayerStore'
import { locale, t, toggleLocale } from '@/composables/i18nStore'

const MUSIC_VIDEO_ID = 'acnx9QFbAp4'

const props = defineProps({
  currentPath: { type: String, default: '/' },
})

const currentPath = ref(props.currentPath)
function syncPath() {
  currentPath.value = window.location.pathname
}
onMounted(() => {
  document.addEventListener('astro:page-load', syncPath)
  initPlayer(MUSIC_VIDEO_ID)
})
onBeforeUnmount(() => document.removeEventListener('astro:page-load', syncPath))

const links = [
  { to: '/', cmd: '~/home' },
  { to: '/about', cmd: '~/about' },
  { to: '/journal', cmd: '~/journal' },
  { to: '/notes', cmd: '~/notes' },
  { to: '/projects', cmd: '~/projects' },
]

const promptText = computed(() => `${profile.handle}@${profile.hostname}:~$`)

function isActive(to) {
  if (to === '/') return currentPath.value === '/'
  return currentPath.value.startsWith(to)
}
</script>

<template>
  <nav class="term-nav">
    <div class="term-nav__inner">
      <a href="/" class="term-nav__prompt">
        <DecryptedText
          :text="promptText"
          animate-on="hover"
          :speed="28"
          :max-iterations="10"
          class-name="term-nav__prompt-live"
          encrypted-class-name="term-nav__prompt-cipher"
        />
        <span class="term-nav__cursor" aria-hidden="true">▮</span>
      </a>

      <ul class="term-nav__links">
        <li v-for="link in links" :key="link.to">
          <a :href="link.to" class="term-nav__link" :class="{ 'is-active': isActive(link.to) }">
            <span class="term-nav__link-verb">cd </span>{{ link.cmd }}
          </a>
        </li>
      </ul>

      <MusicPlayerSkin
        compact
        class="term-nav__player"
        album="TIE HUA FEI / 鐵花飛"
        artist="Mili"
        cover="https://img.youtube.com/vi/acnx9QFbAp4/hqdefault.jpg"
      />

      <button type="button" class="term-nav__lang" :aria-label="t('lang.toggleLabel')" @click="toggleLocale">
        {{ locale === 'zh-Hant' ? 'EN' : '中' }}
      </button>
    </div>
  </nav>
</template>

<style scoped>
.term-nav {
  position: fixed;
  inset-block-start: 0;
  inset-inline: 0;
  z-index: var(--z-sticky);
  background: color-mix(in oklab, var(--color-paper-2) 82%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-bottom: 1px solid var(--color-rule);
}

.term-nav__inner {
  max-width: 88rem;
  margin-inline: auto;
  padding: var(--space-sm) clamp(var(--space-md), 4vw, var(--space-xl));
  display: flex;
  align-items: center;
  gap: var(--space-lg);
}

.term-nav__prompt {
  display: inline-flex;
  align-items: baseline;
  gap: var(--space-3xs);
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  text-decoration: none;
  white-space: nowrap;
  color: var(--color-ink);
}

.term-nav__prompt-live {
  color: var(--color-ink);
}

.term-nav__prompt-cipher {
  color: var(--color-muted);
}

.term-nav__cursor {
  color: var(--color-cursor);
  animation: term-blink 1s step-end infinite;
}

@keyframes term-blink {
  50% {
    opacity: 0;
  }
}

.term-nav__links {
  list-style: none;
  display: flex;
  gap: var(--space-lg);
  margin: 0;
  padding: 0;
  flex: 1;
  overflow-x: auto;
  scrollbar-width: none;
}

.term-nav__links::-webkit-scrollbar {
  display: none;
}

.term-nav__link {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-muted);
  text-decoration: none;
  white-space: nowrap;
  padding-block: var(--space-3xs);
  border-bottom: 1px solid transparent;
  transition:
    color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out);
}

.term-nav__link:hover {
  color: var(--color-ink);
}

.term-nav__link.is-active {
  color: var(--color-ink);
  border-bottom-color: var(--color-ink);
}

.term-nav__link-verb {
  color: var(--color-muted);
}

.term-nav__player {
  flex-shrink: 0;
}

.term-nav__lang {
  flex-shrink: 0;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  background: transparent;
  border: 1px solid var(--color-rule);
  border-radius: var(--radius);
  padding: var(--space-3xs) var(--space-xs);
  cursor: pointer;
  transition:
    color var(--dur-short) var(--ease-out),
    border-color var(--dur-short) var(--ease-out);
}

.term-nav__lang:hover {
  color: var(--color-accent);
  border-color: var(--color-accent);
}

.term-nav__lang:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 2px;
}

@media (max-width: 40rem) {
  .term-nav__inner {
    gap: var(--space-sm);
  }
  .term-nav__link-verb {
    display: none;
  }
}
</style>
