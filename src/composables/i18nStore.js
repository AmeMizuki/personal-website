import { ref } from 'vue'
import { t as translate, getLocale, setLocale } from '@/i18n/utils'

// Shared across every Vue component that imports it — toggling here updates all of
// them reactively. Astro-rendered static markup is handled separately (see the
// data-i18n swap script in BaseLayout.astro), listening for the same 'site-locale-changed'
// event this dispatches via setLocale().
export const locale = ref(getLocale())

export function t(key, vars) {
  return translate(key, vars, locale.value)
}

export function toggleLocale() {
  locale.value = locale.value === 'zh-Hant' ? 'en' : 'zh-Hant'
  setLocale(locale.value)
}
