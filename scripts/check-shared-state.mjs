import assert from 'node:assert/strict'
import { createSSRApp, h } from 'vue'
import { renderToString } from '@vue/server-renderer'
import * as i18n from '../src/i18n/utils.js'
import * as language from '../src/composables/i18nStore.js'

// Run directly: node scripts/check-shared-state.mjs
assert.equal(i18n.getLocale(), 'zh-Hant')
i18n.setLocale('en')
language.initI18n()
assert.equal(language.locale.value, 'zh-Hant', 'Server imports must not read or mutate browser state')

const values = new Map([['site-locale', 'en']])
let blocked = false
const storage = {
  getItem: (key) => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, String(value)),
}
globalThis.window = new EventTarget()
Object.defineProperty(window, 'localStorage', {
  get() {
    if (blocked) throw new Error('Storage disabled')
    return storage
  },
})
globalThis.CustomEvent ??= class extends Event {
  constructor(type, options) {
    super(type)
    this.detail = options.detail
  }
}
const announcements = []
window.addEventListener('site-locale-changed', (event) => announcements.push(event.detail))
assert.equal(language.locale.value, 'zh-Hant', 'Stored locale must not initialize during import')
language.initI18n()
assert.equal(language.locale.value, 'en')
assert.equal(i18n.getLocale(), 'en')
// A later/lazy island must still render the server language before its own mount.
assert.equal(await renderToString(createSSRApp({
  setup() {
    const { locale } = language.useI18n()
    return () => h('span', locale.value)
  },
})), '<span>zh-Hant</span>')
i18n.setLocale('toString')
assert.equal(language.locale.value, 'en', 'Inherited dictionary names are not valid locales')
blocked = true
i18n.setLocale('zh-Hant')
assert.equal(language.locale.value, 'zh-Hant')
assert.equal(i18n.getLocale(), 'zh-Hant', 'Blocked writes must retain runtime locale')
language.toggleLocale()
assert.equal(language.locale.value, 'en')
assert.equal(announcements.at(-1), 'en', 'Astro text must receive language changes without storage')
blocked = false
function tabChange(key, newValue, storageArea = storage) {
  const event = new Event('storage')
  Object.assign(event, { key, newValue, storageArea })
  window.dispatchEvent(event)
}
tabChange('site-locale', 'zh-Hant')
assert.equal(language.locale.value, 'zh-Hant')
assert.equal(announcements.at(-1), 'zh-Hant')
tabChange('site-locale', 'en')
assert.equal(language.locale.value, 'en')
tabChange('unrelated', null)
tabChange('site-locale', 'zh-Hant', {})
assert.equal(language.locale.value, 'en', 'Unrelated/session storage changes must be ignored')
tabChange('site-locale', '__proto__')
assert.equal(language.locale.value, 'zh-Hant')
tabChange('site-locale', 'en')
tabChange(null, null)
assert.equal(language.locale.value, 'zh-Hant', 'Clearing storage must reset the shared language')
for (const stored of ['__proto__', 'invalid', null]) {
  if (stored === null) values.delete('site-locale')
  else values.set('site-locale', stored)
  const fresh = await import(`../src/i18n/utils.js?stored=${stored}`)
  assert.equal(fresh.getLocale(), 'zh-Hant')
}
blocked = true
const blockedLocale = await import('../src/i18n/utils.js?blocked')
assert.equal(blockedLocale.getLocale(), 'zh-Hant')
blocked = false

values.set('terminal-command-log', JSON.stringify([null, 3, {}, '', '  ', 'help', ' cd about ']))
const terminal = await import('../src/composables/terminalStore.js')
terminal.initCommandLog()
assert.deepEqual([...terminal.commandLog.value], ['help', 'cd about'])
terminal.recordCommand(null)
terminal.recordCommand('  ')
for (let i = 0; i < 60; i++) terminal.recordCommand(` cmd-${i} `)
assert.equal(terminal.commandLog.value.length, 50)
assert.equal(terminal.commandLog.value[0], 'cmd-10')
assert.deepEqual(JSON.parse(values.get('terminal-command-log')), [...terminal.commandLog.value])
const restored = await import('../src/composables/terminalStore.js?restored')
restored.initCommandLog()
assert.deepEqual([...restored.commandLog.value], [...terminal.commandLog.value])
blocked = true
terminal.recordCommand('help')
terminal.initCommandLog()
assert.equal(terminal.commandLog.value.at(-1), 'help', 'Remounts retain in-memory recall with blocked storage')
assert.equal(terminal.commandLog.value.length, 50)
const blockedTerminal = await import('../src/composables/terminalStore.js?blocked')
blockedTerminal.initCommandLog()
blockedTerminal.recordCommand('ls')
assert.deepEqual([...blockedTerminal.commandLog.value], ['ls'])
blocked = false
for (const raw of ['{', '{}', JSON.stringify(Array.from({ length: 80 }, (_, i) => `cmd-${i}`))]) {
  values.set('terminal-command-log', raw)
  const fresh = await import(`../src/composables/terminalStore.js?raw=${encodeURIComponent(raw)}`)
  fresh.initCommandLog()
  assert.equal(fresh.commandLog.value.length, raw.startsWith('[') ? 50 : 0)
}

// Only the external player/storage boundaries are simulated; actual store handlers run.
globalThis.document = { getElementById: () => ({}) }
let callbacks
let appliedVolume
let isMuted
window.YT = {
  Player: class {
    constructor(_host, options) { callbacks = options.events }
    getDuration() { return 120 }
    setVolume(value) { appliedVolume = value }
    mute() { isMuted = true }
    unMute() { isMuted = false }
    playVideo() {}
  },
}
const originalSetInterval = globalThis.setInterval
globalThis.setInterval = () => 0
try {
  for (const [raw, expected] of [
    [null, 70], ['', 70], ['  ', 70], ['0', 0], ['42.5', 42.5], ['100', 100],
    ['-1', 70], ['101', 70], ['NaN', 70], ['Infinity', 70], ['oops', 70],
  ]) {
    if (raw === null) values.delete('music-player-volume')
    else values.set('music-player-volume', raw)
    const music = await import(`../src/composables/musicPlayerStore.js?volume=${raw}`)
    music.initPlayer('test-video')
    callbacks.onReady({ target: { getDuration: () => 120, setVolume: (value) => { appliedVolume = value }, mute() {}, playVideo() {} } })
    assert.equal(music.volume.value, expected)
    assert.equal(appliedVolume, expected)
    assert.equal(music.ready.value, true)
  }
  blocked = true
  const music = await import('../src/composables/musicPlayerStore.js?blocked')
  music.initPlayer('test-video')
  callbacks.onReady({ target: { getDuration: () => 120, setVolume: (value) => { appliedVolume = value }, mute() {}, playVideo() {} } })
  assert.equal(music.volume.value, 70)
  music.onVolumeInput({ target: { value: '55' } })
  assert.equal(music.volume.value, 55)
  assert.equal(appliedVolume, 55, 'Blocked persistence must not stop actual volume control')
  assert.equal(isMuted, false)
  music.onVolumeInput({ target: { value: '0' } })
  assert.equal(isMuted, true)
  music.onVolumeInput({ target: { value: 'NaN' } })
  assert.equal(music.volume.value, 0)
  blocked = false
  music.onVolumeInput({ target: { value: '35' } })
  assert.equal(values.get('music-player-volume'), '35')
} finally {
  globalThis.setInterval = originalSetInterval
}
console.log('Shared-state locale, recall, and volume assertions passed.')
