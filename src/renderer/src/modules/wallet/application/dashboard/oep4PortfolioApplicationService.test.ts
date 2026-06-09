import { beforeEach, describe, expect, it, vi } from 'vitest'

const oep4 = vi.hoisted(() => ({
  queryOep4Balance: vi.fn(),
  queryAllOep4Balances: vi.fn(),
  queryOep4Decimal: vi.fn(),
  queryOep4StringProperty: vi.fn(),
  hasOep4Contract: vi.fn(),
  fetchOep4TokenBalances: vi.fn(),
}))
const domain = vi.hoisted(() => ({
  queryOep4TransactionHistory: vi.fn(),
  registerOep4Contract: vi.fn(),
}))

vi.mock('../../../../domains/wallet/oep4Service', () => oep4)
vi.mock('../../../../domains/wallet/walletDomainService', () => domain)

import {
  createTrackedOep4Token,
  loadTrackedOep4Balances,
  loadTrackedOep4Transactions,
} from './oep4PortfolioApplicationService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createTrackedOep4Token', () => {
  it('builds a tracked token when the contract exists', async () => {
    oep4.hasOep4Contract.mockResolvedValue(true)
    oep4.queryOep4StringProperty.mockResolvedValueOnce('MyToken').mockResolvedValueOnce('MTK')
    oep4.queryOep4Decimal.mockResolvedValue(9)
    oep4.queryOep4Balance.mockResolvedValue(100)

    const result = await createTrackedOep4Token({
      scriptHash: 'hash',
      address: 'addr',
      network: 'MAIN_NET',
    })

    expect(result.ok).toBe(true)
    if (result.ok && result.token) {
      expect(result.token).toMatchObject({
        name: 'MyToken',
        symbol: 'MTK',
        decimal: 9,
        balance: 100,
      })
    }
    expect(domain.registerOep4Contract).toHaveBeenCalledWith('MAIN_NET', 'hash')
  })

  it('returns a no-contract error when the contract does not exist', async () => {
    oep4.hasOep4Contract.mockResolvedValue(false)
    const result = await createTrackedOep4Token({
      scriptHash: 'hash',
      address: 'addr',
      network: 'MAIN_NET',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'commonWalletHome.noOep4Contract' })
  })

  it('returns a network error when a query throws', async () => {
    oep4.hasOep4Contract.mockRejectedValue(new Error('boom'))
    const result = await createTrackedOep4Token({
      scriptHash: 'hash',
      address: 'addr',
      network: 'MAIN_NET',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr' })
  })
})

describe('loadTrackedOep4Balances', () => {
  it('merges fetched balances from bulk API and falls back to RPC', async () => {
    oep4.fetchOep4TokenBalances.mockResolvedValue([{ asset_name: 'A', balance: 5 }])
    oep4.queryOep4Balance.mockResolvedValue(10) // Fallback for B
    const result = await loadTrackedOep4Balances({
      oep4s: [
        { symbol: 'A', net: 'MAIN_NET' },
        { symbol: 'B', net: 'MAIN_NET', scriptHash: 'hash-b', decimal: 8 },
      ] as never,
      address: 'addr',
      network: 'MAIN_NET',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.balances).toEqual([
        { symbol: 'A', net: 'MAIN_NET', balance: 5 },
        { symbol: 'B', net: 'MAIN_NET', scriptHash: 'hash-b', decimal: 8, balance: 10 },
      ])
    }
    expect(oep4.fetchOep4TokenBalances).toHaveBeenCalledWith('addr')
    expect(oep4.queryOep4Balance).toHaveBeenCalledWith('hash-b', 'addr', 8)
  })

  it('returns an empty list on failure', async () => {
    oep4.fetchOep4TokenBalances.mockRejectedValue(new Error('boom bulk'))
    oep4.queryOep4Balance.mockRejectedValue(new Error('boom rpc'))
    const result = await loadTrackedOep4Balances({
      oep4s: [{ symbol: 'A', net: 'MAIN_NET' }] as never,
      address: 'addr',
      network: 'MAIN_NET',
    })
    expect(result).toMatchObject({ balances: [] })
  })
})

describe('loadTrackedOep4Transactions', () => {
  it('maps matching transfers and signs amounts by direction', async () => {
    domain.queryOep4TransactionHistory.mockResolvedValue({
      ok: true,
      data: {
        TxnList: [
          {
            TxnHash: 'tx1',
            TransferList: [
              { AssetName: 'ong', FromAddress: 'addr', Amount: '1' },
              { AssetName: 'MTK', FromAddress: 'addr', Amount: '5' },
              { AssetName: 'MTK', FromAddress: 'other', Amount: '7' },
            ],
          },
        ],
      },
    })

    const result = await loadTrackedOep4Transactions({
      address: 'addr',
      oep4s: [{ symbol: 'MTK' }] as never,
      network: 'MAIN_NET',
    })

    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.transactions).toEqual([
        { txHash: 'tx1', asset: 'MTK', amount: '-5' },
        { txHash: 'tx1', asset: 'MTK', amount: '+7' },
      ])
    }
  })

  it('returns an empty list when the history query is not ok', async () => {
    domain.queryOep4TransactionHistory.mockResolvedValue({ ok: false })
    const result = await loadTrackedOep4Transactions({
      address: 'addr',
      oep4s: [{ symbol: 'MTK' }] as never,
      network: 'MAIN_NET',
    })
    expect(result).toMatchObject({ transactions: [] })
  })
})
