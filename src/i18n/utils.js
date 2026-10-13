import { ui, defaultLocale } from './ui.js'

export const STORAGE_KEY = 'site-locale'

let currentLocale = null
let listening = false

function validLocale(value) {
  return typeof value === 'string' && Object.hasOwn(ui, value)
}

function announceLocale() {
  window.dispatchEvent(new CustomEvent('site-locale-changed', { detail: currentLocale }))
}

export function getLocale() {
  if (typeof window === 'undefined') return defaultLocale
  if (currentLocale === null) {
    try {
      const stored = window.localStorage.getItem(STORAGE_KEY)
      currentLocale = validLocale(stored) ? stored : defaultLocale
    } catch {
      currentLocale = defaultLocale
    }
  }
  if (!listening) {
    listening = true
    window.addEventListener('storage', (event) => {
      if (event.key !== STORAGE_KEY && event.key !== null) return
      try {
        if (event.storageArea && event.storageArea !== window.localStorage) return
      } catch {
        return
      }
      currentLocale = validLocale(event.newValue) ? event.newValue : defaultLocale
      announceLocale()
    })
  }
  return currentLocale
}

export function setLocale(locale) {
  if (typeof window === 'undefined' || !validLocale(locale)) return
  getLocale()
  currentLocale = locale
  try {
    window.localStorage.setItem(STORAGE_KEY, locale)
  } catch {
    // Keep the current session reactive when persistence is unavailable.
  }
  announceLocale()
}

export function t(key, vars = {}, locale = getLocale()) {
  const dict = ui[locale] ?? ui[defaultLocale]
  const template = dict[key] ?? ui[defaultLocale][key] ?? key
  return template.replace(/\{(\w+)\}/g, (_, name) => (name in vars ? vars[name] : ''))
}
