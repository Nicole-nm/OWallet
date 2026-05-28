import { fetchWalletCollections } from '../../../domains/wallet/applicationService'
import type { WalletCollections } from '../../../shared/lib/types'

interface LoadWalletCollectionsResult {
  ok: boolean
  collections: WalletCollections
  cached?: boolean
  errorKey?: string
}

let walletCollectionsPromise: Promise<LoadWalletCollectionsResult> | null = null

function getWalletCollectionsSnapshot(walletsStore: Partial<WalletCollections> = {}) {
  return {
    normalWallets: walletsStore.normalWallets || [],
    sharedWallets: walletsStore.sharedWallets || [],
    hardwareWallets: walletsStore.hardwareWallets || [],
  }
}

export async function loadWalletCollections({
  currentCollections = {},
  hasLoadedWallets = false,
  force = false,
}: {
  currentCollections?: Partial<WalletCollections>
  hasLoadedWallets?: boolean
  force?: boolean
} = {}): Promise<LoadWalletCollectionsResult> {
  if (!force && hasLoadedWallets) {
    return {
      ok: true,
      collections: getWalletCollectionsSnapshot(currentCollections),
      cached: true,
    }
  }

  if (!force && walletCollectionsPromise) {
    return walletCollectionsPromise
  }

  walletCollectionsPromise = fetchWalletCollections()
    .then((result) => {
      if (!result.ok) {
        return {
          ok: false,
          collections: getWalletCollectionsSnapshot(currentCollections),
          errorKey: result.errorKey,
        }
      }

      return {
        ok: true,
        collections: getWalletCollectionsSnapshot(result.data),
      }
    })
    .finally(() => {
      walletCollectionsPromise = null
    })

  return walletCollectionsPromise
}
