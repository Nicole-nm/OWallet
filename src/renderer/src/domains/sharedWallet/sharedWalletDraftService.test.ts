import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  constants: {
    GAS_LIMIT: '20000',
    GAS_PRICE: '500',
    get TRANSFER_GAS_MIN() {
      return (parseInt(this.GAS_PRICE, 10) * parseInt(this.GAS_LIMIT, 10)) / 1e9
    },
  },
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  buildClaimOng: vi.fn(),
  buildNativeTransfer: vi.fn(),
  buildOep4Transfer: vi.fn(),
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/lib/constants', () => ({
  ...mocks.constants,
  getOntPassHost: vi.fn(() => 'https://node.example'),
  ONT_PASS_API_PATHS: {
    CreateSharedTransfer: '/create',
    CreateSharedWallet: '/wallet',
    QueryPendingTransfer: '/pending',
    QuerySharedWallet: '/query',
    SignSharedTransfer: '/sign',
  },
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  createInvokeTransaction: vi.fn(),
  createSdkParameter: vi.fn(),
}))

vi.mock('../../shared/chain/walletSdk', () => ({
  createSdkAddress: vi.fn(),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: vi.fn((value) => value),
}))

vi.mock('../transaction/assetBuilder', () => ({
  buildClaimOng: (...args: unknown[]) => mocks.buildClaimOng(...args),
  buildNativeTransfer: (...args: unknown[]) => mocks.buildNativeTransfer(...args),
  buildOep4Transfer: (...args: unknown[]) => mocks.buildOep4Transfer(...args),
}))

vi.mock('../transaction/serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

import { TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import { prepareSharedTransferDraft } from './sharedWalletDraftService'

const makeSharedWallet = (requiredNumber: string, totalNumber: string, copayerCount: number) => ({
  address: 'AShared123',
  label: 'Test Shared Wallet',
  publicKey: 'pk-shared',
  sharedWalletAddress: 'AShared123',
  requiredNumber,
  totalNumber,
  coPayers: Array.from({ length: copayerCount }, (_, i) => ({
    name: `Payer ${i + 1}`,
    publickey: `pk-${i + 1}`,
    address: `addr-${i + 1}`,
  })),
})

describe('sharedWalletDraftService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('prepareSharedTransferDraft', () => {
    it('builds an ONT draft for a 2-of-3 M-of-N shared wallet', async () => {
      const fakeTx = { id: 'tx-ont-2of3' }
      mocks.buildNativeTransfer.mockResolvedValue(fakeTx)

      const result = await prepareSharedTransferDraft({
        sharedWallet: makeSharedWallet('2', '3', 3),
        transfer: {
          asset: 'ONT',
          to: 'ARecipient456',
          amount: '100',
          gas: TRANSFER_GAS_MIN,
          isRedeem: false,
        },
        redeem: {},
      })

      expect(result.tx).toBe(fakeTx)
      expect(result.tokenType).toBe('ONT')
      expect(result.amount).toBe('100')
      expect(result.gasPrice).toBe('500')
      expect(result.gasLimit).toBe('20000')
      expect(mocks.buildNativeTransfer).toHaveBeenCalledWith(
        'ONT',
        'AShared123',
        'ARecipient456',
        '100',
        'AShared123',
        '500',
        '20000'
      )
    })

    it('builds an ONG draft for a 3-of-3 M-of-N shared wallet', async () => {
      const fakeTx = { id: 'tx-ong-3of3' }
      mocks.buildNativeTransfer.mockResolvedValue(fakeTx)

      const result = await prepareSharedTransferDraft({
        sharedWallet: makeSharedWallet('3', '3', 3),
        transfer: {
          asset: 'ONG',
          to: 'ARecipient789',
          amount: '5',
          gas: '0.02',
          isRedeem: false,
        },
        redeem: {},
      })

      expect(result.tx).toBe(fakeTx)
      expect(result.tokenType).toBe('ONG')
      expect(result.gasPrice).toBe('1000')
      // ONG amount is multiplied by 1e9
      expect(result.amount).toBe('5000000000')
      expect(mocks.buildNativeTransfer).toHaveBeenCalledWith(
        'ONG',
        'AShared123',
        'ARecipient789',
        '5',
        'AShared123',
        '1000',
        '20000'
      )
    })

    it('builds a redeem draft for a 1-of-1 shared wallet', async () => {
      const fakeTx = { id: 'tx-redeem-1of1' }
      mocks.buildClaimOng.mockResolvedValue(fakeTx)

      const result = await prepareSharedTransferDraft({
        sharedWallet: makeSharedWallet('1', '1', 1),
        transfer: {
          asset: 'ONG',
          isRedeem: true,
          gas: TRANSFER_GAS_MIN,
          to: 'AShared123',
          amount: '0',
        },
        redeem: { claimableOng: '2.5' },
      })

      expect(result.tx).toBe(fakeTx)
      // amount = 2.5 * 1e9
      expect(result.amount).toBe('2500000000')
      expect(result.gasPrice).toBe('500')
      expect(mocks.buildClaimOng).toHaveBeenCalledWith('AShared123', '2.5', '500', '20000')
      expect(mocks.buildNativeTransfer).not.toHaveBeenCalled()
    })

    it('builds an OEP-4 token draft with correct decimal scaling', async () => {
      const fakeTx = { id: 'tx-oep4' }
      mocks.buildOep4Transfer.mockResolvedValue(fakeTx)

      const result = await prepareSharedTransferDraft({
        sharedWallet: makeSharedWallet('2', '3', 3),
        transfer: {
          asset: 'WING',
          to: 'ARecipient000',
          amount: '10',
          decimal: 9,
          scriptHash: 'abcdef1234',
          gas: TRANSFER_GAS_MIN,
          isRedeem: false,
        },
        redeem: {},
      })

      expect(result.tx).toBe(fakeTx)
      expect(result.tokenType).toBe('WING')
      // amount = 10 * 10^9
      expect(result.amount).toBe('10000000000')
      expect(mocks.buildOep4Transfer).toHaveBeenCalledWith(
        'abcdef1234',
        'AShared123',
        'ARecipient000',
        '10',
        9,
        'AShared123',
        expect.any(String),
        '20000'
      )
    })

    it('propagates errors thrown by the underlying asset builder', async () => {
      mocks.buildNativeTransfer.mockRejectedValue(new Error('Invalid address'))

      await expect(
        prepareSharedTransferDraft({
          sharedWallet: makeSharedWallet('2', '3', 3),
          transfer: {
            asset: 'ONT',
            to: 'not-a-valid-address',
            amount: '50',
            gas: TRANSFER_GAS_MIN,
            isRedeem: false,
          },
          redeem: {},
        })
      ).rejects.toThrow('Invalid address')
    })
  })
})
