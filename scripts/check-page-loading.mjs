import { navigate } from 'astro:transitions/client'

// Run in the dev browser: await (await import('/scripts/check-page-loading.mjs')).checkPageLoading()
export async function checkPageLoading() {
  const originalURL = location.href
  const targetPath = location.pathname.startsWith('/about') ? '/' : '/about'
  let release
  let started
  const preparing = new Promise(resolve => { started = resolve })
  const gate = new Promise(resolve => { release = resolve })
  const hold = event => {
    const loader = event.loader
    event.loader = async () => {
      started()
      await gate
      await loader()
    }
  }
  document.addEventListener('astro:before-preparation', hold, { once: true })
  try {
    const loaded = new Promise(resolve => document.addEventListener('astro:page-load', resolve, { once: true }))
    const swapped = new Promise(resolve => {
      document.addEventListener('astro:after-swap', () => {
        queueMicrotask(() => resolve({
          active: [...document.querySelectorAll('.term-nav__link.is-active')].map(link => link.getAttribute('href')).join(),
          current: [...document.querySelectorAll('.term-nav__link[aria-current="page"]')].map(link => link.getAttribute('href')).join(),
        }))
      }, { once: true })
    })
    const navigation = navigate(targetPath)
    await preparing
    if (document.documentElement.dataset.loading !== 'navigation' || document.querySelector('main').getAttribute('aria-busy') !== 'true') {
      throw new Error('Pending navigation must expose a visible loading state and busy content')
    }
    if (getComputedStyle(document.querySelector('#preloader')).display === 'none') {
      throw new Error('Loading state must be visible while the actual page loader is pending')
    }
    window.dispatchEvent(new PageTransitionEvent('pageshow', { persisted: false }))
    if (document.documentElement.dataset.loading !== 'navigation') {
      throw new Error('The initial window load must not clear an in-flight navigation')
    }
    release()
    await navigation
    await loaded
    const header = await swapped
    if (header.active !== targetPath || header.current !== targetPath) {
      throw new Error(`Header must match ${targetPath} when the URL changes, not wait for page scripts: ${JSON.stringify(header)}`)
    }
    if (document.documentElement.dataset.loading !== 'ready' || document.querySelector('main').getAttribute('aria-busy') !== 'false') {
      throw new Error('Completed navigation must clear its loading state')
    }
    if (document.activeElement !== document.querySelector('main')) {
      throw new Error('Client-side navigation must focus the new content')
    }
    return 'PASS: header matches the swapped route; Loading completes and focuses content'
  } finally {
    release()
    document.removeEventListener('astro:before-preparation', hold)
    await navigate(originalURL)
  }
}
