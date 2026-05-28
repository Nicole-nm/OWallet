import { fetchIdentityCollection } from '../../../domains/wallet/applicationService'
import type { Identity } from '../../../shared/lib/types'

interface LoadIdentityCollectionResult {
  ok: boolean
  identities: Identity[]
  cached?: boolean
  errorKey?: string
}

let identityCollectionPromise: Promise<LoadIdentityCollectionResult> | null = null

function getIdentityCollectionSnapshot(currentIdentities: Identity[] = []) {
  return currentIdentities || []
}

export async function loadIdentityCollection({
  currentIdentities = [],
  hasLoadedIdentities = false,
  force = false,
}: {
  currentIdentities?: Identity[]
  hasLoadedIdentities?: boolean
  force?: boolean
} = {}): Promise<LoadIdentityCollectionResult> {
  if (!force && hasLoadedIdentities) {
    return {
      ok: true,
      identities: getIdentityCollectionSnapshot(currentIdentities),
      cached: true,
    }
  }

  if (!force && identityCollectionPromise) {
    return identityCollectionPromise
  }

  identityCollectionPromise = fetchIdentityCollection()
    .then((result) => {
      if (!result.ok) {
        return {
          ok: false,
          identities: getIdentityCollectionSnapshot(currentIdentities),
          errorKey: result.errorKey,
        }
      }

      return {
        ok: true,
        identities: result.data as Identity[],
      }
    })
    .finally(() => {
      identityCollectionPromise = null
    })

  return identityCollectionPromise
}
