import FileHelper from '../../shared/persistence/fileHelper'
import { DEFAULT_SCRYPT } from '../../shared/lib/constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { tryDecryptWallet } from '../../shared/chain/transactionSdk'
import {
  removeWallet as removeWalletFromDomain,
  updateWalletField as updateWalletFieldFromDomain,
} from './walletDomainService'
import { WalletType } from '../../shared/types/wallet'
import type { CommonWallet, HardwareWallet } from '../../shared/lib/types'

export async function downloadWalletFile(wallet: CommonWallet) {
  const { Wallet, Account } = await loadOntologySdk()
  const walletFile = Wallet.create(wallet.label || '')
  walletFile.scrypt.n = DEFAULT_SCRYPT.cost
  const account = Account.parseJsonObj(
    wallet as unknown as Parameters<typeof Account.parseJsonObj>[0]
  )
  walletFile.addAccount(account)
  FileHelper.downloadFile(walletFile.toJsonObj(), wallet.label)
}

function base64ToHex(value: string) {
  const binary = atob(value)
  return Array.from(binary, (char) => char.charCodeAt(0).toString(16).padStart(2, '0')).join('')
}

export async function exportWalletWif(wallet: CommonWallet, password: string) {
  const privateKey = await tryDecryptWallet(wallet, password)
  if (!privateKey) {
    return null
  }

  return privateKey.serializeWIF()
}

export async function validateWalletPassword(wallet: CommonWallet, password: string) {
  return Boolean(await tryDecryptWallet(wallet, password))
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
  const privateKey = await tryDecryptWallet(wallet, oldPassword)
  if (!privateKey?.encrypt) {
    return null
  }

  const { Crypto } = await loadOntologySdk()
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
