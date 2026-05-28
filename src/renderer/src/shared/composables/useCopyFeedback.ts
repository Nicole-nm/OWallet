import { onBeforeUnmount, ref } from 'vue'
import { notifySuccess } from '../ui/feedback'

export function useCopyFeedback({ resetDelay = 3000, successMessageKey = '' } = {}) {
  const copied = ref(false)
  let copiedTimer: ReturnType<typeof setTimeout> | null = null

  function resetCopied() {
    copied.value = false
  }

  function clearCopiedTimer() {
    if (!copiedTimer) {
      return
    }

    clearTimeout(copiedTimer)
    copiedTimer = null
  }

  async function copyText(value: string) {
    await navigator.clipboard.writeText(value)
    copied.value = true
    if (successMessageKey) {
      notifySuccess(successMessageKey)
    }
    clearCopiedTimer()
    copiedTimer = setTimeout(resetCopied, resetDelay)
  }

  onBeforeUnmount(() => {
    clearCopiedTimer()
  })

  return {
    copied,
    copyText,
    resetCopied,
  }
}
