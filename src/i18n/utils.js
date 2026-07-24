import { ui, defaultLocale } from './ui'

export const STORAGE_KEY = 'site-locale'

export function getLocale() {
  if (typeof localStorage === 'undefined') return defaultLocale
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored && stored in ui ? stored : defaultLocale
}

export function setLocale(locale) {
  localStorage.setItem(STORAGE_KEY, locale)
  window.dispatchEvent(new CustomEvent('site-locale-changed', { detail: locale }))
}

export function t(key, vars = {}, locale = getLocale()) {
  const dict = ui[locale] ?? ui[defaultLocale]
  const template = dict[key] ?? ui[defaultLocale][key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''))
}
