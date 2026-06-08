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

vi.mock('../../../../domains/wallet/walletDomainService', () => ({
  findLocalAccount: (...args: unknown[]) => mocks.walletService.findLocalAccount(...args),
  getLocalCopayers: (...args: unknown[]) => mocks.walletService.getLocalCopayers(...args),
  hasLocalCopayer: (...args: unknown[]) => mocks.walletService.hasLocalCopayer(...args),
}))

vi.mock('../../../../domains/sharedWallet/sharedWalletDomainService', () => ({
  queryPendingTransfer: (...args: unknown[]) =>
    mocks.sharedWalletService.queryPendingTransfer(...args),
}))

import {
  checkSharedWalletHasLocalCopayer,
  findLocalSharedSigner,
  findNextLocalSharedSigner,
  loadLocalSharedCopayers,
  loadPendingSharedTransfers,
} from './sharedWalletOverviewApplicationService'

describe('sharedWalletOverviewApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads and formats pending shared transfers', async () => {
    mocks.sharedWalletService.queryPendingTransfer.mockResolvedValue({
      SigningSharedTransfers: [
        {
          assetName: 'ONG',
          amount: '1000000000',
          receiveAddress: 'AQ2',
          sendAddress: 'AS1',
          gasPrice: '500',
          gasLimit: '20000',
          coPayerSignVOS: [
            { address: 'AQ1', name: 'Alice', publickey: 'pk1', isSign: 1 },
            { address: 'AQ2', name: 'Bob', publicKey: 'pk2', isSign: 'false' },
          ],
          transactionidhash: 'legacy-id',
          transactionbodyhash: 'legacy-body',
        },
      ],
    })

    await expect(
      loadPendingSharedTransfers({ network: 'testnet', sharedWalletAddress: 'AQ123' })
    ).resolves.toEqual({
      ok: true,
      transfers: [
        {
          amount: '1.000000000',
          assetName: 'ONG',
          receiveaddress: 'AQ2',
          sendaddress: 'AS1',
          gasprice: '500',
          gaslimit: '20000',
          coPayerSignDtos: [
            {
              address: 'AQ1',
              name: 'Alice',
              publickey: 'pk1',
              publicKey: 'pk1',
              isSign: true,
            },
            {
              address: 'AQ2',
              name: 'Bob',
              publickey: 'pk2',
              publicKey: 'pk2',
              isSign: false,
            },
          ],
          transactionBodyHash: 'legacy-body',
          transactionIdHash: 'legacy-id',
        },
      ],
    })
    expect(mocks.sharedWalletService.queryPendingTransfer).toHaveBeenCalledWith('testnet', {
      sharedAddress: 'AQ123',
      assetName: '',
      beforeTimeStamp: expect.any(Number),
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
        publicKey: '',
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

  it('selects the first local unsigned pending signer', async () => {
    mocks.walletService.getLocalCopayers.mockResolvedValue([
      {
        address: 'AQ3',
        type: 'CommonWallet',
        wallet: { address: 'AQ3', label: 'Third Wallet', publicKey: 'pk3' },
      },
    ])

    await expect(
      findNextLocalSharedSigner([
        { address: 'AQ1', name: 'Alice', isSign: true },
        { address: 'AQ2', name: 'Bob', isSign: false },
        { address: 'AQ3', name: 'Carol', isSign: false },
      ])
    ).resolves.toEqual({
      ok: true,
      signer: {
        address: 'AQ3',
        label: 'Third Wallet',
        publicKey: 'pk3',
        type: 'CommonWallet',
      },
    })
    expect(mocks.walletService.getLocalCopayers).toHaveBeenCalledWith([
      { address: 'AQ2', name: 'Bob', isSign: false },
      { address: 'AQ3', name: 'Carol', isSign: false },
    ])
  })
})
