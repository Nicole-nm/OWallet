import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import type { ScryptParams } from '../../shared/lib/types'
import type { SdkPrivateKeyLike, SerializedWalletLike } from '../../shared/chain/types'

export async function createPrivateKeyFromHexString(hex: string) {
  const { Crypto } = await loadOntologySdk()
  return new Crypto.PrivateKey(hex) as SdkPrivateKeyLike
}

export async function createPrivateKeyFromWifString(wif: string) {
  const { Crypto } = await loadOntologySdk()
  return Crypto.PrivateKey.deserializeWIF(wif) as SdkPrivateKeyLike
}

export async function importWalletAccountFromMnemonic(
  label: string,
  mnemonic: string,
  password: string,
  scrypt: ScryptParams
) {
  const { Account } = await loadOntologySdk()
  const account = Account.importWithMnemonic(label, mnemonic, password, scrypt as never)
  return account.toJsonObj() as Record<string, unknown>
}

export async function decryptImportedWallet(
  wallet: SerializedWalletLike,
  password: string,
  scrypt: ScryptParams
) {
  const { Crypto } = await loadOntologySdk()
  const encryptedKey = new Crypto.PrivateKey(wallet.key)

  try {
    return encryptedKey.decrypt(
      password,
      new Crypto.Address(wallet.address),
      wallet.salt,
      scrypt as never
    )
  } catch {
    return null
  }
}

export async function createWalletAccountFromPrivateKey(
  privateKey: SdkPrivateKeyLike | unknown,
  password: string,
  label: string,
  scrypt: ScryptParams
) {
  const { Account } = await loadOntologySdk()
  const account = Account.create(privateKey as never, password, label, scrypt as never)
  return account.toJsonObj() as Record<string, unknown>
}
