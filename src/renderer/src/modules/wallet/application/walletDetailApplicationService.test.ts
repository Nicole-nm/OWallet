import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  walletService: {
    removeWallet: vi.fn(),
  },
  walletDetailService: {
    changeStoredWalletPassword: vi.fn(),
    deleteStoredWallet: vi.fn(),
    downloadWalletFile: vi.fn(),
    exportWalletWif: vi.fn(),
    validateWalletPassword: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  removeWallet: (...args: unknown[]) => mocks.walletService.removeWallet(...args),
}))

vi.mock('../../../domains/wallet/detailService', () => ({
  changeStoredWalletPassword: (...args: unknown[]) =>
    mocks.walletDetailService.changeStoredWalletPassword(...args),
  deleteStoredWallet: (...args: unknown[]) => mocks.walletDetailService.deleteStoredWallet(...args),
  downloadWalletFile: (...args: unknown[]) => mocks.walletDetailService.downloadWalletFile(...args),
  exportWalletWif: (...args: unknown[]) => mocks.walletDetailService.exportWalletWif(...args),
  validateWalletPassword: (...args: unknown[]) =>
    mocks.walletDetailService.validateWalletPassword(...args),
}))

import {
  changeStoredWalletPassword,
  deleteStoredSharedWallet,
  deleteStoredWallet,
  downloadStoredWalletFile,
  exportStoredWalletWif,
  validateStoredWalletPassword,
} from './walletDetailApplicationService'

describe('walletDetailApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('delegates wallet file actions to wallet detail domain services', async () => {
    const wallet = { address: 'AQ123' }
    mocks.walletDetailService.downloadWalletFile.mockResolvedValue(undefined)
    mocks.walletDetailService.exportWalletWif.mockResolvedValue('WIF-1')
    mocks.walletDetailService.validateWalletPassword.mockResolvedValue(true)
    mocks.walletDetailService.changeStoredWalletPassword.mockResolvedValue({
      address: 'AQ123',
      key: 'next-key',
    })
    mocks.walletDetailService.deleteStoredWallet.mockResolvedValue({ address: 'AQ123' })

    await expect(downloadStoredWalletFile(wallet)).resolves.toEqual({ ok: true })
    await expect(exportStoredWalletWif(wallet, 'secret123')).resolves.toEqual({
      ok: true,
      wif: 'WIF-1',
    })
    await expect(validateStoredWalletPassword(wallet, 'secret123')).resolves.toEqual({
      ok: true,
    })
    await expect(changeStoredWalletPassword(wallet, 'old-pass', 'new-pass')).resolves.toEqual({
      ok: true,
      wallet: {
        address: 'AQ123',
        key: 'next-key',
      },
    })
    await expect(deleteStoredWallet(wallet)).resolves.toEqual({
      ok: true,
      deletedWallet: { address: 'AQ123' },
    })
  })

  it('maps wallet password failures to a password error key', async () => {
    const wallet = { address: 'AQ123' }
    mocks.walletDetailService.exportWalletWif.mockResolvedValue(null)
    mocks.walletDetailService.validateWalletPassword.mockResolvedValue(false)
    mocks.walletDetailService.changeStoredWalletPassword.mockResolvedValue(null)

    await expect(exportStoredWalletWif(wallet, 'wrong-password')).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
    await expect(validateStoredWalletPassword(wallet, 'wrong-password')).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
    await expect(changeStoredWalletPassword(wallet, 'wrong-password', 'new-pass')).resolves.toEqual(
      {
        ok: false,
        errorKey: 'common.pwdErr',
      }
    )
  })

  it('deletes stored shared wallets through the wallet domain service', async () => {
    mocks.walletService.removeWallet.mockResolvedValue(undefined)

    await expect(deleteStoredSharedWallet('AS123')).resolves.toEqual({
      ok: true,
      address: 'AS123',
    })
    expect(mocks.walletService.removeWallet).toHaveBeenCalledWith('SharedWallet', 'AS123')
  })
})
