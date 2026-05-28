import {
  importIdentityFromSerializedKeystore,
  verifyIdentityExistsOnChain,
} from '../../../domains/identity/applicationService'
import { insertIdentity } from '../../../domains/wallet/applicationService'
import type { Identity } from '../../../shared/lib/types'

interface ImportedIdentityKeystore {
  key: string
  address: string
  salt: string
  [key: string]: unknown
}

interface ImportIdentityInput {
  keystoreText: string
  password: string
}

export function validateImportedIdentityKeystore(
  keystore: Partial<ImportedIdentityKeystore> | null | undefined
): keystore is ImportedIdentityKeystore {
  return Boolean(keystore?.key && keystore?.address && keystore?.salt)
}

export async function importIdentityFromKeystore({ keystoreText, password }: ImportIdentityInput) {
  let parsedKeystore: ImportedIdentityKeystore
  try {
    parsedKeystore = JSON.parse(keystoreText)
  } catch {
    return { ok: false, errorKey: 'importIdentity.invalidKeystore' }
  }

  if (!validateImportedIdentityKeystore(parsedKeystore)) {
    return { ok: false, errorKey: 'importIdentity.invalidKeystore' }
  }

  let identity: Identity
  try {
    identity = (await importIdentityFromSerializedKeystore(
      parsedKeystore,
      password
    )) as unknown as Identity
  } catch {
    return { ok: false, errorKey: 'importIdentity.passError' }
  }

  if (!(await verifyIdentityExistsOnChain(identity.ontid))) {
    return { ok: false, errorKey: 'importIdentity.ontidNotExist' }
  }

  try {
    await insertIdentity({
      type: 'Identity',
      address: identity.ontid,
      wallet: identity,
    })
  } catch {
    return { ok: false, errorKey: 'importIdentity.ontidExist', duplicate: true }
  }

  return { ok: true, identity }
}
