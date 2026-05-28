import { formatScryptParams } from '../../shared/lib/scryptParams'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import type { Identity } from '../../shared/lib/types'

export async function validateIdentityPassword(identity: Identity, password: string) {
  const controlData = identity.controls[0]
  if (!controlData) return false

  const scrypt = identity.scrypt || {
    n: 4096,
    p: 8,
    r: 8,
    dkLen: 64,
  }
  const params = formatScryptParams(scrypt as Record<string, unknown>)
  const { Crypto } = await loadOntologySdk()
  const encryptedKey = new Crypto.PrivateKey(controlData.key)

  try {
    return Boolean(
      encryptedKey.decrypt(
        password,
        new Crypto.Address(controlData.address),
        controlData.salt,
        params
      )
    )
  } catch {
    return false
  }
}

export function buildIdentityKeystore(identity: Identity) {
  const scrypt = identity.scrypt || {
    n: 4096,
    p: 8,
    r: 8,
    dkLen: 64,
  }

  const controlData = identity.controls[0]
  if (!controlData) return ''

  return JSON.stringify({
    type: 'I',
    label: identity.label,
    algorithm: 'ECDSA',
    scrypt,
    key: controlData.key,
    salt: controlData.salt,
    address: controlData.address,
    parameters: {
      curve: 'secp256r1',
    },
  })
}
