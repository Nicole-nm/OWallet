import { removeIdentity as removeIdentityRecord } from '../../../domains/wallet/applicationService'
import {
  buildIdentityKeystore as buildIdentityKeystoreFromDomain,
  validateIdentityPassword as validateIdentityPasswordFromDomain,
} from '../../../domains/identity/detailService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import type { Identity } from '../../../shared/lib/types'

const logger = createLogger('identityDetailApplicationService')

type ExportIdentityKeystoreResult =
  | { ok: true; keystore: string }
  | { ok: false; errorKey: string; error: unknown }

export function exportIdentityKeystore(identity: unknown): ExportIdentityKeystoreResult {
  try {
    return {
      ok: true,
      keystore: buildIdentityKeystoreFromDomain(identity as Identity),
    }
  } catch (error: unknown) {
    return {
      ok: false,
      errorKey: 'common.networkErr',
      error,
    }
  }
}

export async function validateStoredIdentityPassword(identity: unknown, password: string) {
  return tryCatch(
    async () => ({
      valid: await validateIdentityPasswordFromDomain(identity as Identity, password),
    }),
    { context: 'validateStoredIdentityPassword', errorKey: 'common.networkErr', logger }
  )
}

export async function deleteStoredIdentity(ontid: string) {
  return tryCatch(
    async () => {
      await removeIdentityRecord(ontid)
      return { ontid }
    },
    { context: 'deleteStoredIdentity', errorKey: 'wallets.deleteIdentityFailed', logger }
  )
}
