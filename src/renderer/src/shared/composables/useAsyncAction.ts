import { ref } from 'vue'
import { useLoadingModalStore } from './useGlobalLoading'

export function useAsyncAction() {
  const loading = ref(false)
  const loadingStore = useLoadingModalStore()

  async function run<T>(
    action: () => Promise<T>,
    options: {
      useGlobalLoading?: boolean
    } = {}
  ) {
    const { useGlobalLoading = false } = options

    if (useGlobalLoading) {
      loadingStore.showLoadingModals()
    }

    loading.value = true

    try {
      return await action()
    } finally {
      loading.value = false
      if (useGlobalLoading) {
        loadingStore.hideLoadingModals()
      }
    }
  }

  return {
    loading,
    run,
  }
}
