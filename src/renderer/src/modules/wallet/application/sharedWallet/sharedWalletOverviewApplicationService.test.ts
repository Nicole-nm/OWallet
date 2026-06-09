import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  walletService: {
    findLocalAccount: vi.fn(),
    getLocalCopayers: vi.fn(),
    hasLocalCopayer: vi.fn(),
  },
  sharedWalletService: {
    queryPendingTransfer: vi.fn(),
    querySharedWallet: vi.fn(),
    createSharedWallet: vi.fn(),
  },
}))

vi.mock('../../../../domains/wallet/walletDomainService', () => ({
  findLocalAccount: (...args: unknown[]) => mocks.walletService.findLocalAccount(...args),
  getLocalCopayers: (...args: unknown[]) => mocks.walletService.getLocalCopayers(...args),
  hasLocalCopayer: (...args: unknown[]) => mocks.walletService.hasLocalCopayer(...args),
}))

vi.mock('../../../../domains/wallet/shared', () => ({
  queryPendingTransfer: (...args: unknown[]) =>
    mocks.sharedWalletService.queryPendingTransfer(...args),
  querySharedWallet: (...args: unknown[]) => mocks.sharedWalletService.querySharedWallet(...args),
  createSharedWallet: (...args: unknown[]) => mocks.sharedWalletService.createSharedWallet(...args),
}))

import {
  checkSharedWalletHasLocalCopayer,
  checkSharedWalletRegistrationStatus,
  findLocalSharedSigner,
  findNextLocalSharedSigner,
  loadLocalSharedCopayers,
  loadPendingSharedTransfers,
  registerSharedWalletOnNetwork,
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
          amount: '1',
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

  describe('checkSharedWalletRegistrationStatus', () => {
    it('returns registered=true when the server has the shared wallet', async () => {
      mocks.sharedWalletService.querySharedWallet.mockResolvedValue({
        sharedWalletAddress: 'AShared123',
        sharedWalletName: 'Team Wallet',
      })

      await expect(checkSharedWalletRegistrationStatus('MAIN_NET', 'AShared123')).resolves.toEqual({
        ok: true,
        registered: true,
      })
      expect(mocks.sharedWalletService.querySharedWallet).toHaveBeenCalledWith(
        'MAIN_NET',
        'AShared123'
      )
    })

    it('returns registered=false when the server response lacks sharedWalletAddress', async () => {
      mocks.sharedWalletService.querySharedWallet.mockResolvedValue({})

      await expect(checkSharedWalletRegistrationStatus('TEST_NET', 'AShared123')).resolves.toEqual({
        ok: true,
        registered: false,
      })
    })

    it('returns registered=false on network error', async () => {
      mocks.sharedWalletService.querySharedWallet.mockRejectedValue(new Error('network down'))

      const result = await checkSharedWalletRegistrationStatus('TEST_NET', 'AShared123')
      expect(result.ok).toBe(false)
      expect('registered' in result ? result.registered : undefined).toBe(false)
    })
  })

  describe('registerSharedWalletOnNetwork', () => {
    it('returns ok=true when the server accepts the registration', async () => {
      mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })

      const wallet = {
        sharedWalletAddress: 'AShared123',
        sharedWalletName: 'Team Wallet',
        totalNumber: 3,
        requiredNumber: 2,
        coPayers: [
          { name: 'Alice', publickey: 'pk1', address: 'AQ1' },
          { name: 'Bob', publicKey: 'pk2', address: 'AQ2' },
        ],
      }

      await expect(registerSharedWalletOnNetwork('TEST_NET', wallet as never)).resolves.toEqual({
        ok: true,
      })
      expect(mocks.sharedWalletService.createSharedWallet).toHaveBeenCalledWith('TEST_NET', {
        sharedWalletAddress: 'AShared123',
        sharedWalletName: 'Team Wallet',
        totalNumber: 3,
        requiredNumber: 2,
        coPayers: [
          { name: 'Alice', publickey: 'pk1', address: 'AQ1' },
          { name: 'Bob', publickey: 'pk2', address: 'AQ2' },
        ],
      })
    })

    it('returns ok=false when the server rejects the registration', async () => {
      mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 1, Desc: 'exists' })

      const wallet = {
        sharedWalletAddress: 'AShared123',
        sharedWalletName: 'Team Wallet',
        totalNumber: 3,
        requiredNumber: 2,
        coPayers: [],
      }

      await expect(registerSharedWalletOnNetwork('TEST_NET', wallet as never)).resolves.toEqual({
        ok: false,
        errorKey: 'sharedWalletHome.registerFailed',
      })
    })

    it('returns ok=false on network error', async () => {
      mocks.sharedWalletService.createSharedWallet.mockRejectedValue(new Error('timeout'))

      const wallet = {
        sharedWalletAddress: 'AShared123',
        sharedWalletName: 'Team Wallet',
        totalNumber: 3,
        requiredNumber: 2,
        coPayers: [],
      }

      const result = await registerSharedWalletOnNetwork('TEST_NET', wallet as never)
      expect(result.ok).toBe(false)
      expect('errorKey' in result ? result.errorKey : undefined).toBe(
        'sharedWalletHome.registerFailed'
      )
    })
  })
})
