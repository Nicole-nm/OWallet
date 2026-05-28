import { loadIdentityCollection } from '../../modules/identity/application/identityCollectionApplicationService'
import type { Identity } from '../../shared/lib/types'

export async function loadIdentityCollectionIntoStore(
  identitiesStore: unknown,
  options: { force?: boolean } = {}
) {
  const store = identitiesStore as {
    identities: Identity[]
    hasLoadedIdentities: boolean
    setIdentities(identities: Identity[]): void
    setIdentitiesLoaded(loaded: boolean): void
  }
  const result = await loadIdentityCollection({
    currentIdentities: store.identities,
    force: options.force,
    hasLoadedIdentities: store.hasLoadedIdentities,
  })

  if (result.ok) {
    store.setIdentities(result.identities)
    store.setIdentitiesLoaded(true)
    return result
  }

  store.setIdentitiesLoaded(false)
  return result
}
