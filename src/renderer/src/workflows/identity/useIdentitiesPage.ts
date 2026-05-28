import { computed, onMounted, ref } from 'vue'
import { useIdentitiesStore } from '../../stores/modules/Identities'
import { loadIdentityCollectionIntoStore } from '../support/identityCollectionStoreSync'

export function useIdentitiesPage() {
  const identitiesStore = useIdentitiesStore()
  const isLoadingIdentities = ref(false)
  const identitiesErrorKey = ref('')

  const allIdentities = computed(() => identitiesStore.identities)
  const hasIdentityLoadError = computed(() => Boolean(identitiesErrorKey.value))
  const identitiesEmpty = computed(() => allIdentities.value.length === 0)

  async function reloadIdentities(options: { force?: boolean } = { force: true }) {
    isLoadingIdentities.value = true
    identitiesErrorKey.value = ''

    try {
      const result = await loadIdentityCollectionIntoStore(identitiesStore, options)
      if (!result.ok) {
        identitiesErrorKey.value = result.errorKey || 'identities.loadFailed'
      }
      return result
    } finally {
      isLoadingIdentities.value = false
    }
  }

  async function ensureIdentitiesLoaded() {
    await reloadIdentities({ force: false })
    return allIdentities.value
  }

  onMounted(() => {
    void ensureIdentitiesLoaded()
  })

  return {
    allIdentities,
    ensureIdentitiesLoaded,
    hasIdentityLoadError,
    identitiesEmpty,
    identitiesErrorKey,
    isLoadingIdentities,
    reloadIdentities,
  }
}
