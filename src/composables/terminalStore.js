import { ref } from 'vue'

const STORAGE_KEY = 'terminal-command-log'
const MAX_COMMANDS = 50
let initialized = false

export const commandLog = ref([])

export function initCommandLog() {
  if (initialized || typeof window === 'undefined') return
  initialized = true
  try {
    const stored = JSON.parse(window.localStorage.getItem(STORAGE_KEY) || '[]')
    if (Array.isArray(stored)) {
      commandLog.value = stored
        .filter((command) => typeof command === 'string' && command.trim())
        .map((command) => command.trim())
        .slice(-MAX_COMMANDS)
    }
  } catch {
    // In-memory recall remains available when storage is blocked or malformed.
  }
}

export function recordCommand(command) {
  if (typeof window === 'undefined' || typeof command !== 'string' || !command.trim()) return
  initCommandLog()
  commandLog.value.push(command.trim())
  if (commandLog.value.length > MAX_COMMANDS) {
    commandLog.value.splice(0, commandLog.value.length - MAX_COMMANDS)
  }
  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(commandLog.value))
  } catch {
    // Keep recall across client navigation even without persistent storage.
  }
}
