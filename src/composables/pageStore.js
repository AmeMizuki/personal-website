import { ref } from 'vue'

// Shared by the layout lifecycle and persisted navigation island.
export const currentPath = ref('')
export const isPageLoading = ref(false)

export function startPageLoading() {
  isPageLoading.value = true
}

export function finishPageLoading(path) {
  currentPath.value = path
  isPageLoading.value = false
}
