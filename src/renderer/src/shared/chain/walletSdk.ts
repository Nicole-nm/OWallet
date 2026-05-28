import { loadOntologySdk } from './loadOntologySdk'
import type { SdkAddressLike, SdkPrivateKeyLike } from './types'

export async function createSdkAddress(base58: string) {
  const { Crypto } = await loadOntologySdk()
  return new Crypto.Address(base58) as SdkAddressLike
}

export async function deriveAddressFromPublicKey(publicKey: string) {
  const { Crypto } = await loadOntologySdk()
  return Crypto.Address.fromPubKey(new Crypto.PublicKey(publicKey)).toBase58()
}

export async function validateWalletAddress(address: string) {
  try {
    const walletAddress = await createSdkAddress(address)
    walletAddress.serialize()
    return true
  } catch {
    return false
  }
}

export async function generateWalletKeyPair() {
  const { Crypto } = await loadOntologySdk()
  const privateKey = Crypto.PrivateKey.random() as SdkPrivateKeyLike
  const wif = privateKey.serializeWIF()
  const publicKey = privateKey.getPublicKey()
  const address = Crypto.Address.fromPubKey(publicKey as never).toBase58()
  return { privateKey, wif, publicKey: publicKey.serializeHex(), address }
}

export async function createMultiSigWalletAddress(requiredSigNum: number, publicKeys: string[]) {
  const { Crypto } = await loadOntologySdk()
  const sdkPublicKeys = publicKeys.map((hex) => new Crypto.PublicKey(hex))
  return Crypto.Address.fromMultiPubKeys(requiredSigNum, sdkPublicKeys).toBase58()
}
