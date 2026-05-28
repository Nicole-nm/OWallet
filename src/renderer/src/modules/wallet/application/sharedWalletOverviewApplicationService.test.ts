import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  walletService: {
    findLocalAccount: vi.fn(),
    getLocalCopayers: vi.fn(),
    hasLocalCopayer: vi.fn(),
  },
  sharedWalletService: {
    queryPendingTransfer: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  findLocalAccount: (...args: unknown[]) => mocks.walletService.findLocalAccount(...args),
  getLocalCopayers: (...args: unknown[]) => mocks.walletService.getLocalCopayers(...args),
  hasLocalCopayer: (...args: unknown[]) => mocks.walletService.hasLocalCopayer(...args),
}))

vi.mock('../../../domains/sharedWallet/applicationService', () => ({
  queryPendingTransfer: (...args: unknown[]) =>
    mocks.sharedWalletService.queryPendingTransfer(...args),
}))

import {
  checkSharedWalletHasLocalCopayer,
  findLocalSharedSigner,
  loadLocalSharedCopayers,
  loadPendingSharedTransfers,
} from './sharedWalletOverviewApplicationService'

describe('sharedWalletOverviewApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and formats pending shared transfers', async () => {
    mocks.sharedWalletService.queryPendingTransfer.mockResolvedValue({
      SigningSharedTransfers: [{ assetName: 'ONG', amount: '1000000000' }],
    })

    await expect(
      loadPendingSharedTransfers({ network: 'testnet', sharedWalletAddress: 'AQ123' })
    ).resolves.toEqual({
      ok: true,
      transfers: [{ assetName: 'ONG', amount: '1.000000000' }],
    })
  })

  it('loads local shared copayer state', async () => {
    mocks.walletService.getLocalCopayers.mockResolvedValue([{ address: 'AQ123' }])
    mocks.walletService.hasLocalCopayer.mockResolvedValue(true)
    mocks.walletService.findLocalAccount.mockResolvedValue({
      type: 'CommonWallet',
      wallet: { address: 'AQ123', label: 'Main Wallet' },
    })

    await expect(loadLocalSharedCopayers([{ address: 'AQ123', name: 'Copayer' }])).resolves.toEqual(
      {
        ok: true,
        copayers: [{ address: 'AQ123' }],
      }
    )
    await expect(findLocalSharedSigner('AQ123')).resolves.toEqual({
      ok: true,
      signer: {
        address: 'AQ123',
        label: 'Main Wallet',
        type: 'CommonWallet',
      },
    })
    await expect(
      checkSharedWalletHasLocalCopayer([{ address: 'AQ123', name: 'Copayer' }])
    ).resolves.toEqual({
      ok: true,
      hasLocalCopayer: true,
    })
  })
})
