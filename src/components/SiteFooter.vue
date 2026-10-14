<script setup>
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { profile } from '@/data/profile'
import { Mail } from '@lucide/vue'
import { sitePath } from '@/lib/site-path'
import { useI18n } from '@/composables/i18nStore'

const { t } = useI18n()

const uptime = ref('00:00:00')
let startedAt = 0
let intervalId = null

function formatUptime(ms) {
  const totalSeconds = Math.floor(ms / 1000)
  const h = String(Math.floor(totalSeconds / 3600)).padStart(2, '0')
  const m = String(Math.floor((totalSeconds % 3600) / 60)).padStart(2, '0')
  const s = String(totalSeconds % 60).padStart(2, '0')
  return `${h}:${m}:${s}`
}

onMounted(() => {
  startedAt = performance.now()
  intervalId = window.setInterval(() => {
    uptime.value = formatUptime(performance.now() - startedAt)
  }, 1000)
})

onBeforeUnmount(() => {
  if (intervalId) window.clearInterval(intervalId)
})
</script>

<template>
  <footer class="site-footer">
    <p class="site-footer__line">
      <span>© {{ new Date().getFullYear() }} {{ profile.name }}</span>
      <span class="site-footer__sep">·</span>
      <span>built with vue + vite + gsap</span>
      <span class="site-footer__sep">·</span>
      <span>session uptime: {{ uptime }}</span>
      <a :href="sitePath('/contact/')" class="site-footer__link">
        <Mail :size="14" aria-hidden="true" />
        <span>{{ t('footer.contact') }}</span>
      </a>
    </p>
  </footer>
</template>

<style scoped>
.site-footer {
  position: relative;
  z-index: var(--z-raised);
  background: color-mix(in oklab, var(--color-paper-2) 82%, transparent);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  border-top: 1px solid var(--color-rule);
  padding: var(--space-lg) clamp(var(--space-md), 4vw, var(--space-xl));
}

.site-footer__line {
  max-width: 88rem;
  margin-inline: auto;
  font-family: var(--font-mono);
  font-size: var(--text-xs);
  color: var(--color-muted);
  display: flex;
  flex-wrap: wrap;
  gap: var(--space-xs);
}

.site-footer__sep {
  color: var(--color-rule);
}

.site-footer__link {
  margin-inline-start: auto;
  display: inline-flex;
  align-items: center;
  gap: var(--space-xs);
  min-height: 32px;
  padding: 0 var(--space-sm);
  border: 1px solid var(--color-rule);
  border-radius: var(--radius);
  color: var(--color-ink);
  text-decoration: none;
  transition:
    border-color var(--dur-short) var(--ease-out),
    background-color var(--dur-short) var(--ease-out);
}

@media (hover: hover) {
  .site-footer__link:hover {
    border-color: var(--color-ink-2);
    background: var(--color-paper-3);
  }
}

.site-footer__link:focus-visible {
  outline: 2px solid var(--color-focus);
  outline-offset: 3px;
}
</style>
