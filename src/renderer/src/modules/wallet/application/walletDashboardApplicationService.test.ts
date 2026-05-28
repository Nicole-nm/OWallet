import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  marketService: {
    fetchExchangeRate: vi.fn(),
  },
  walletService: {
    fetchNativeBalance: vi.fn(),
    fetchWalletTransactionGroups: vi.fn(),
  },
}))

vi.mock('../../../domains/market/applicationService', () => ({
  fetchExchangeRate: (...args: unknown[]) => mocks.marketService.fetchExchangeRate(...args),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  fetchNativeBalance: (...args: unknown[]) => mocks.walletService.fetchNativeBalance(...args),
  fetchWalletTransactionGroups: (...args: unknown[]) =>
    mocks.walletService.fetchWalletTransactionGroups(...args),
}))

import {
  getWalletAddressExplorerUrl,
  getWalletTransactionExplorerUrl,
  loadWalletExchangeValue,
  loadWalletNativeBalance,
  loadWalletTransactions,
} from './walletDashboardApplicationService'

describe('walletDashboardApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads native balances and exchange values', async () => {
    mocks.walletService.fetchNativeBalance.mockResolvedValue({ ok: true, data: { ont: 1 } })
    mocks.marketService.fetchExchangeRate.mockResolvedValue(2.5)

    await expect(loadWalletNativeBalance('AQ123')).resolves.toEqual({
      ok: true,
      balance: { ont: 1 },
    })
    await expect(loadWalletExchangeValue({ amount: 1 })).resolves.toEqual({
      ok: true,
      value: 2.5,
      errorKey: undefined,
    })
  })

  it('maps wallet transactions into dashboard rows', async () => {
    mocks.walletService.fetchWalletTransactionGroups.mockResolvedValue({
      ok: true,
      data: [
        {
          tx_hash: 'hash-1',
          transfers: [
            { asset_name: 'ont', amount: '2', from_address: 'AQ123', to_address: 'AQ999' },
            { asset_name: 'ong', amount: '1', from_address: 'AQ000', to_address: 'AQ123' },
          ],
        },
      ],
    })

    await expect(
      loadWalletTransactions({ address: 'AQ123', network: 'MAIN_NET', txSliceCount: 5 })
    ).resolves.toEqual({
      ok: true,
      transactions: [
        { txHash: 'hash-1', asset: 'ONT', amount: '-2' },
        { txHash: 'hash-1', asset: 'ONG', amount: '+1' },
      ],
    })
  })

  it('builds explorer urls', () => {
    expect(getWalletTransactionExplorerUrl({ txHash: 'abc', network: 'MainNet' })).toContain('abc')
    expect(getWalletAddressExplorerUrl({ address: 'AQ123', network: 'MainNet' })).toContain('AQ123')
  })
})
