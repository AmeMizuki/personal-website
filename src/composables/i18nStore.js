import { ref, computed, onMounted } from 'vue'
import { defaultLocale } from '../i18n/ui.js'
import { t as translate, getLocale, setLocale } from '../i18n/utils.js'

export const locale = ref(defaultLocale)
let listening = false

export function initI18n() {
  if (typeof window === 'undefined') return
  if (!listening) {
    listening = true
    window.addEventListener('site-locale-changed', () => {
      locale.value = getLocale()
    })
  }
  locale.value = getLocale()
}

export function t(key, vars) {
  return translate(key, vars, locale.value)
}

export function toggleLocale() {
  initI18n()
  setLocale(locale.value === 'zh-Hant' ? 'en' : 'zh-Hant')
}

export function useI18n() {
  const mounted = ref(false)
  // Each island starts with its server locale, including islands hydrated lazily.
  const visibleLocale = computed(() => mounted.value ? locale.value : defaultLocale)
  onMounted(() => {
    initI18n()
    mounted.value = true
  })
  return {
    locale: visibleLocale,
    t: (key, vars) => translate(key, vars, visibleLocale.value),
    toggleLocale,
  }
}
