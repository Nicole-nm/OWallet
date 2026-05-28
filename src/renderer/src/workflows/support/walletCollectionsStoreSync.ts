import { loadWalletCollections } from '../../modules/wallet/application/walletCollectionApplicationService'
import type { WalletCollections } from '../../shared/lib/types'

interface WalletCollectionsStoreLike extends WalletCollections {
  hasLoadedWallets: boolean
  setWalletCollections(collections: WalletCollections): void
  setWalletCollectionsLoaded(loaded: boolean): void
}

interface WalletCollectionsResultLike {
  ok?: boolean
  collections?: WalletCollections
}

function getCurrentCollections(walletsStore: WalletCollectionsStoreLike) {
  return {
    normalWallets: walletsStore.normalWallets,
    sharedWallets: walletsStore.sharedWallets,
    hardwareWallets: walletsStore.hardwareWallets,
  }
}

/**
 * Apply a wallet collections result object to the store.
 * Extracted from 5 workflow files that each duplicated this logic.
 */
export function applyWalletCollectionsResult(walletsStore: unknown, collectionsResult: unknown) {
  const store = walletsStore as WalletCollectionsStoreLike
  const result = collectionsResult as WalletCollectionsResultLike | null | undefined
  if (!result) {
    return
  }

  if (result.ok && result.collections) {
    store.setWalletCollections(result.collections)
    store.setWalletCollectionsLoaded(true)
    return
  }

  store.setWalletCollectionsLoaded(false)
}

export async function loadWalletCollectionsIntoStore(
  walletsStore: unknown,
  options: { force?: boolean } = {}
) {
  const store = walletsStore as WalletCollectionsStoreLike
  const result = await loadWalletCollections({
    currentCollections: getCurrentCollections(store),
    force: options.force,
    hasLoadedWallets: store.hasLoadedWallets,
  })

  if (result.ok) {
    store.setWalletCollections(result.collections)
    store.setWalletCollectionsLoaded(true)
    return result
  }

  store.setWalletCollectionsLoaded(false)
  return result
}
