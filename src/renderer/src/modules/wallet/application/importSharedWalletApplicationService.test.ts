import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  sharedWalletService: {
    querySharedWallet: vi.fn(),
  },
  walletPersistenceService: {
    persistWallet: vi.fn(),
  },
}))

vi.mock('../../../domains/sharedWallet/applicationService', () => ({
  querySharedWallet: (...args: unknown[]) => mocks.sharedWalletService.querySharedWallet(...args),
}))

vi.mock('./walletPersistenceService', () => ({
  persistWallet: (...args: unknown[]) => mocks.walletPersistenceService.persistWallet(...args),
}))

import {
  persistImportedSharedWallet,
  queryImportableSharedWallet,
} from './importSharedWalletApplicationService'

describe('importSharedWalletApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads importable shared wallets by address', async () => {
    const wallet = { sharedWalletAddress: 'AQ123', sharedWalletName: 'Core Team' }
    mocks.sharedWalletService.querySharedWallet.mockResolvedValue(wallet)

    await expect(
      queryImportableSharedWallet({
        network: 'testnet',
        sharedWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({
      ok: true,
      wallet,
    })
  })

  it('maps missing shared wallets to notFound', async () => {
    mocks.sharedWalletService.querySharedWallet.mockResolvedValue({})

    await expect(
      queryImportableSharedWallet({
        network: 'testnet',
        sharedWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importSharedWallet.notFound',
    })
  })

  it('persists imported shared wallets and reports duplicates', async () => {
    const wallet = { sharedWalletAddress: 'AQ123' }

    mocks.walletPersistenceService.persistWallet.mockResolvedValueOnce({
      ok: true,
      inserted: true,
      status: 'inserted',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'AQ123' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })
    await expect(persistImportedSharedWallet(wallet)).resolves.toEqual({
      ok: true,
      sharedWallet: wallet,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'AQ123' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    mocks.walletPersistenceService.persistWallet.mockResolvedValueOnce({
      ok: false,
      duplicate: true,
      status: 'duplicate',
    })
    await expect(persistImportedSharedWallet(wallet)).resolves.toEqual({
      ok: false,
      duplicate: true,
      errorKey: 'importSharedWallet.joinBefore',
    })
  })
})
