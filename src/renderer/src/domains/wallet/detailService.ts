import FileHelper from '../../shared/persistence/fileHelper'
import { DEFAULT_SCRYPT } from '../../shared/lib/constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import {
  removeWallet as removeWalletFromDomain,
  updateWalletField as updateWalletFieldFromDomain,
} from './applicationService'
import { WalletType } from '../../shared/types/wallet'
import type { CommonWallet, HardwareWallet, ScryptParams } from '../../shared/lib/types'

export async function downloadWalletFile(wallet: CommonWallet) {
  const { Wallet, Account } = await loadOntologySdk()
  const walletFile = Wallet.create(wallet.label || '')
  walletFile.scrypt.n = DEFAULT_SCRYPT.cost
  const account = Account.parseJsonObj(wallet)
  walletFile.addAccount(account)
  FileHelper.downloadFile(walletFile.toJsonObj(), wallet.label)
}

interface DecryptedPrivateKeyLike {
  serializeWIF(): string
  encrypt(password: string, address: unknown, salt: string, scrypt: ScryptParams): { key: string }
}

function decryptWalletWithSdk(
  Crypto: unknown,
  wallet: CommonWallet,
  password: string,
  scrypt: ScryptParams = DEFAULT_SCRYPT
) {
  const sdkCrypto = Crypto as {
    PrivateKey: new (key: string) => {
      decrypt(...args: never[]): DecryptedPrivateKeyLike
    }
    Address: new (address: string) => unknown
  }
  const enc = new sdkCrypto.PrivateKey(wallet.key)

  try {
    return enc.decrypt(
      password as never,
      new sdkCrypto.Address(wallet.address) as never,
      wallet.salt as never,
      scrypt as never
    )
  } catch {
    return null
  }
}

function base64ToHex(value: string) {
  const binary = atob(value)
  return Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
}

export async function exportWalletWif(wallet: CommonWallet, password: string) {
  const { Crypto } = await loadOntologySdk()
  const privateKey = decryptWalletWithSdk(Crypto, wallet, password)
  if (!privateKey) {
    return null
  }

  return privateKey.serializeWIF()
}

export async function validateWalletPassword(wallet: CommonWallet, password: string) {
  const { Crypto } = await loadOntologySdk()
  return Boolean(decryptWalletWithSdk(Crypto, wallet, password))
}

export async function validateWalletWif(walletWif: string, address: string) {
  const { Crypto } = await loadOntologySdk()
  const privateKey = Crypto.PrivateKey.deserializeWIF(walletWif)
  const publicKey = privateKey.getPublicKey()
  const walletAddress = Crypto.Address.fromPubKey(publicKey)
  return walletAddress.toBase58() === address
}

export async function deleteStoredWallet(wallet: CommonWallet | HardwareWallet) {
  const type = 'key' in wallet && wallet.key ? WalletType.CommonWallet : WalletType.HardwareWallet
  await removeWalletFromDomain(type, wallet.address)
  return { type, address: wallet.address }
}

export async function changeStoredWalletPassword(
  wallet: CommonWallet,
  oldPassword: string,
  newPassword: string
) {
  const { Crypto } = await loadOntologySdk()
  const privateKey = decryptWalletWithSdk(Crypto, wallet, oldPassword)
  if (!privateKey) {
    return null
  }

  const saltHex = base64ToHex(wallet.salt)
  const address = new Crypto.Address(wallet.address)
  const nextEncryption = privateKey.encrypt(newPassword, address, saltHex, DEFAULT_SCRYPT)
  const updatedWallet = {
    ...wallet,
    key: nextEncryption.key,
  }

  await updateWalletFieldFromDomain(wallet.address, { wallet: updatedWallet })
  return updatedWallet
}
