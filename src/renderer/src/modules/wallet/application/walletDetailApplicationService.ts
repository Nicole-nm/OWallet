import { removeWallet } from '../../../domains/wallet/applicationService'
import {
  changeStoredWalletPassword as changeStoredWalletPasswordFromDomain,
  deleteStoredWallet as deleteStoredWalletFromDomain,
  downloadWalletFile as downloadWalletFileFromDomain,
  exportWalletWif as exportWalletWifFromDomain,
  validateWalletPassword as validateWalletPasswordFromDomain,
} from '../../../domains/wallet/detailService'
import { WalletType } from '../../../shared/types/wallet'
import type { CommonWallet, HardwareWallet } from '../../../shared/lib/types'

const SHARED_WALLET = WalletType.SharedWallet
type WalletRecordLike = Record<string, unknown>
type WalletDetailFailure = { ok: false; errorKey: string; error?: unknown }
type WalletDetailVoidResult = { ok: true } | WalletDetailFailure
type WalletWifResult = { ok: true; wif: string } | WalletDetailFailure
type WalletPasswordValidationResult = { ok: true } | WalletDetailFailure
type DeleteWalletResult = { ok: true; deletedWallet: unknown } | WalletDetailFailure
type ChangeWalletPasswordResult = { ok: true; wallet: CommonWallet } | WalletDetailFailure
type DeleteSharedWalletResult = { ok: true; address: string } | WalletDetailFailure

export async function downloadStoredWalletFile(
  wallet: WalletRecordLike
): Promise<WalletDetailVoidResult> {
  try {
    await downloadWalletFileFromDomain(wallet as unknown as CommonWallet)
    return { ok: true }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }
}

export async function exportStoredWalletWif(
  wallet: WalletRecordLike,
  password: string
): Promise<WalletWifResult> {
  try {
    const wif = await exportWalletWifFromDomain(wallet as unknown as CommonWallet, password)
    if (!wif) {
      return { ok: false, errorKey: 'common.pwdErr' }
    }

    return { ok: true, wif }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }
}

export async function validateStoredWalletPassword(
  wallet: WalletRecordLike,
  password: string
): Promise<WalletPasswordValidationResult> {
  try {
    const valid = await validateWalletPasswordFromDomain(
      wallet as unknown as CommonWallet,
      password
    )
    return valid ? { ok: true } : { ok: false, errorKey: 'common.pwdErr' }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }
}

export async function deleteStoredWallet(wallet: WalletRecordLike): Promise<DeleteWalletResult> {
  try {
    const deletedWallet = await deleteStoredWalletFromDomain(
      wallet as unknown as CommonWallet | HardwareWallet
    )
    return { ok: true, deletedWallet }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'wallets.deleteFailed', error }
  }
}

export async function changeStoredWalletPassword(
  wallet: WalletRecordLike,
  oldPassword: string,
  newPassword: string
): Promise<ChangeWalletPasswordResult> {
  try {
    const updatedWallet = await changeStoredWalletPasswordFromDomain(
      wallet as unknown as CommonWallet,
      oldPassword,
      newPassword
    )
    if (!updatedWallet) {
      return { ok: false, errorKey: 'common.pwdErr' }
    }

    return { ok: true, wallet: updatedWallet }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'importJsonWallet.saveDbFailed', error }
  }
}

export async function deleteStoredSharedWallet(
  sharedWalletAddress: string
): Promise<DeleteSharedWalletResult> {
  try {
    await removeWallet(SHARED_WALLET, sharedWalletAddress)
    return { ok: true, address: sharedWalletAddress }
  } catch (error: unknown) {
    return { ok: false, errorKey: 'wallets.deleteFailed', error }
  }
}
