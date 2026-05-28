import { computed, readonly, ref } from 'vue'

const activeLoadingCount = ref(0)
const showLoading = ref(false)
let hideTimerId: ReturnType<typeof setTimeout> | null = null

function clearHideTimer() {
  if (hideTimerId !== null) {
    clearTimeout(hideTimerId)
    hideTimerId = null
  }
}

function scheduleHide(delayMs: number) {
  clearHideTimer()
  hideTimerId = setTimeout(() => {
    if (activeLoadingCount.value === 0) {
      showLoading.value = false
    }
    hideTimerId = null
  }, delayMs)
}

export function showGlobalLoading() {
  clearHideTimer()
  activeLoadingCount.value += 1
  showLoading.value = true
}

export function hideGlobalLoading({ force = false, delayMs = 500 } = {}) {
  if (force) {
    clearHideTimer()
    activeLoadingCount.value = 0
    showLoading.value = false
    return
  }

  activeLoadingCount.value = Math.max(0, activeLoadingCount.value - 1)
  if (activeLoadingCount.value > 0) {
    return
  }

  scheduleHide(delayMs)
}

export function resetGlobalLoading() {
  hideGlobalLoading({ force: true, delayMs: 0 })
}

export function useGlobalLoading() {
  return {
    showLoading: readonly(showLoading),
    activeLoadingCount: computed(() => activeLoadingCount.value),
    showLoadingModals: showGlobalLoading,
    hideLoadingModals: hideGlobalLoading,
    resetLoadingModals: resetGlobalLoading,
  }
}

export const useLoadingModalStore = useGlobalLoading
