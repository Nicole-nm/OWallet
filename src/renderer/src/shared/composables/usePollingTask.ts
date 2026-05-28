import { computed, onBeforeUnmount, onMounted, ref } from 'vue'

type PollingTask<T> = () => Promise<T> | T

interface PollingOptions {
  autoStart?: boolean
  immediate?: boolean
  intervalMs?: number
}

interface StartOptions {
  immediate?: boolean
}

export function usePollingTask<T>(task: PollingTask<T>, options: PollingOptions = {}) {
  const { autoStart = true, immediate = true, intervalMs = 10000 } = options

  const intervalId = ref<ReturnType<typeof setInterval> | null>(null)
  const isPolling = computed(() => intervalId.value !== null)

  function runNow(): Promise<T> | T {
    return task()
  }

  function stopPolling() {
    if (intervalId.value === null) {
      return
    }

    clearInterval(intervalId.value)
    intervalId.value = null
  }

  function startPolling(startOptions: StartOptions = {}) {
    const { immediate: shouldRunImmediately = immediate } = startOptions

    stopPolling()

    if (shouldRunImmediately) {
      runNow()
    }

    intervalId.value = setInterval(() => {
      runNow()
    }, intervalMs)
  }

  onMounted(() => {
    if (autoStart) {
      startPolling()
    }
  })

  onBeforeUnmount(() => {
    stopPolling()
  })

  return {
    intervalId,
    isPolling,
    runNow,
    startPolling,
    stopPolling,
  }
}
