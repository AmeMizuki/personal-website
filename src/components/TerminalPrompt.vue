<script setup>
import { ref, computed, nextTick, onMounted } from 'vue'
import { gsap } from 'gsap'
import { profile } from '@/data/profile'
import { t } from '@/composables/i18nStore'

const ROUTES = {
  '': '/',
  '~': '/',
  home: '/',
  about: '/about',
  journal: '/journal',
  notes: '/notes',
  projects: '/projects',
}

const COMMANDS = ['help', 'ls', 'whoami', 'cat', 'cd', 'clear', 'sudo', 'rm', 'vim', 'vi', 'exit', 'logout']
const CD_TARGETS = ['~', 'home', 'about', 'journal', 'notes', 'projects']
const CAT_TARGETS = ['about.txt']

function helpLines() {
  return [
    t('terminal.help.help'),
    t('terminal.help.ls'),
    t('terminal.help.whoami'),
    t('terminal.help.cat'),
    t('terminal.help.cd'),
    t('terminal.help.clear'),
    t('terminal.help.hint'),
  ]
}

const LOG_STORAGE_KEY = 'terminal-command-log'

function loadLog() {
  try {
    const raw = localStorage.getItem(LOG_STORAGE_KEY)
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

function saveLog() {
  try {
    localStorage.setItem(LOG_STORAGE_KEY, JSON.stringify(commandLog.value.slice(-50)))
  } catch {
    // localStorage unavailable (private mode, disabled) — recall just won't persist
  }
}

const history = ref([])
const draft = ref('')
const commandLog = ref([])
const logPointer = ref(0)
const inputEl = ref(null)

onMounted(() => {
  commandLog.value = loadLog()
  logPointer.value = commandLog.value.length
})

const promptLabel = computed(() => `${profile.handle}@${profile.hostname}:~$`)

function pushOutput(lines) {
  for (const text of lines) history.value.push({ type: 'output', text })
}

function navigate(path) {
  const a = document.createElement('a')
  a.href = path
  document.body.appendChild(a)
  a.click()
  a.remove()
}

function runCommand(raw) {
  const trimmed = raw.trim()
  history.value.push({ type: 'input', text: trimmed })
  if (!trimmed) return

  commandLog.value.push(trimmed)
  logPointer.value = commandLog.value.length
  saveLog()

  const [cmd, ...args] = trimmed.split(/\s+/)
  const arg = args.join(' ')

  switch (cmd) {
    case 'help':
      pushOutput(helpLines())
      break
    case 'ls':
      pushOutput(['about.txt', 'journal/', 'notes/', 'projects/'])
      break
    case 'whoami':
      pushOutput([`${profile.handle}@${profile.hostname}`, profile.role])
      break
    case 'clear':
      history.value = []
      break
    case 'cat':
      if (arg === 'about.txt') navigate('/about')
      else pushOutput([t('terminal.catNotFound', { arg: arg || '(missing operand)' })])
      break
    case 'cd': {
      const target = arg.replace(/^~\/?/, '').replace(/\/$/, '')
      if (target in ROUTES) navigate(ROUTES[target])
      else pushOutput([t('terminal.cdNotFound', { arg })])
      break
    }
    case 'sudo':
      pushOutput([t('terminal.sudo', { handle: profile.handle })])
      break
    case 'rm':
      if (/-rf/.test(arg) && /\//.test(arg)) pushOutput([t('terminal.rmRefused')])
      else pushOutput([`rm: ${arg || '(missing operand)'}`])
      break
    case 'vim':
    case 'vi':
      pushOutput([':wq', t('terminal.vimEscape')])
      break
    case 'exit':
    case 'logout':
      pushOutput([t('terminal.exit')])
      break
    case 'open':
      // Undocumented on purpose — not in HELP_LINES, not in COMMANDS (no tab-complete
      // hint) — a real easter egg only found by guessing.
      if (arg === 'ame' || arg === 'needy') navigate('/ame')
      else pushOutput([t('terminal.openNotFound', { arg: arg || '(missing operand)' })])
      break
    default:
      pushOutput([t('terminal.notFound', { cmd })])
  }
}

function autocomplete() {
  const value = draft.value
  if (!value.includes(' ')) {
    const matches = COMMANDS.filter((c) => c.startsWith(value) && value)
    if (matches.length === 1) draft.value = `${matches[0]} `
    return
  }

  const [cmd, ...rest] = value.split(' ')
  const partial = rest.join(' ')
  const pool = cmd === 'cd' ? CD_TARGETS : cmd === 'cat' ? CAT_TARGETS : null
  if (!pool) return

  const matches = pool.filter((c) => c.startsWith(partial))
  if (matches.length === 1) draft.value = `${cmd} ${matches[0]}`
}

function onEnter() {
  runCommand(draft.value)
  draft.value = ''
}

function recallOlder() {
  if (logPointer.value <= 0) return
  logPointer.value -= 1
  draft.value = commandLog.value[logPointer.value]
}

function recallNewer() {
  if (logPointer.value >= commandLog.value.length - 1) {
    logPointer.value = commandLog.value.length
    draft.value = ''
    return
  }
  logPointer.value += 1
  draft.value = commandLog.value[logPointer.value]
}

function focusInput() {
  nextTick(() => inputEl.value?.focus())
}

function onEnterLine(el, done) {
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
    done()
    return
  }
  gsap.fromTo(el, { opacity: 0, y: 4 }, { opacity: 1, y: 0, duration: 0.18, ease: 'power2.out', onComplete: done })
}
</script>

<template>
  <div class="term-prompt" @click="focusInput">
    <TransitionGroup tag="div" :css="false" @enter="onEnterLine">
      <div
        v-for="(entry, i) in history"
        :key="i"
        class="term-prompt__line"
        :class="entry.type === 'input' ? 'term-prompt__line--input' : 'term-prompt__line--output'"
      >
        <template v-if="entry.type === 'input'">
          <span class="term-prompt__label">{{ promptLabel }}</span>{{ entry.text }}
        </template>
        <template v-else>{{ entry.text }}</template>
      </div>
    </TransitionGroup>

    <div class="term-prompt__line term-prompt__line--live">
      <span class="term-prompt__label">{{ promptLabel }}</span>
      <input
        ref="inputEl"
        v-model="draft"
        type="text"
        class="term-prompt__input"
        placeholder="type 'help'"
        spellcheck="false"
        autocomplete="off"
        :aria-label="t('terminal.input')"
        @keydown.enter="onEnter"
        @keydown.up.prevent="recallOlder"
        @keydown.down.prevent="recallNewer"
        @keydown.tab.prevent="autocomplete"
      />
    </div>
  </div>
</template>

<style scoped>
.term-prompt {
  font-family: var(--font-mono);
  font-size: var(--text-sm);
  color: var(--color-muted);
  display: flex;
  flex-direction: column;
  gap: var(--space-3xs);
  margin: 0 0 var(--space-lg);
  cursor: text;
}

.term-prompt__line--output {
  overflow-wrap: anywhere;
  white-space: pre-wrap;
}

.term-prompt__line--input,
.term-prompt__line--live {
  color: var(--color-ink);
}

.term-prompt__label {
  color: var(--color-muted);
  margin-inline-end: var(--space-2xs);
}

.term-prompt__line--live {
  display: flex;
  align-items: center;
}

.term-prompt__input {
  flex: 1;
  min-width: 0;
  border: none;
  outline: none;
  background: transparent;
  padding: 0;
  font: inherit;
  color: inherit;
  caret-color: var(--color-cursor);
}

.term-prompt__input::placeholder {
  color: var(--color-rule-2);
}
</style>
