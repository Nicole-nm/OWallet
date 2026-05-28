import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  oep4Service: {
    fetchOep4TokenBalances: vi.fn(),
    fetchOep4TokenList: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/oep4Service', () => ({
  fetchOep4TokenBalances: (...args: any[]) => mocks.oep4Service.fetchOep4TokenBalances(...args),
  fetchOep4TokenList: (...args: any[]) => mocks.oep4Service.fetchOep4TokenList(...args),
}))

import {
  loadSelectableOep4Tokens,
  loadSelectedOep4TokenBalances,
} from './tokenSelectionApplicationService'

const selectedToken = {
  contract_hash: 'hash-1',
  contractHash: 'hash-1',
  name: 'AAA',
  symbol: 'AAA',
  decimals: 0,
  selected: true,
}

describe('tokenSelectionApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads selectable oep4 tokens with persisted selected flags', async () => {
    mocks.oep4Service.fetchOep4TokenList.mockResolvedValue({
      records: [{ contract_hash: 'hash-1', symbol: 'AAA' }],
      total: 1,
    })

    await expect(
      loadSelectableOep4Tokens({
        pageSize: 10,
        pageNumber: 1,
        selectedTokensByNetwork: {
          'hash-1': selectedToken,
        },
      })
    ).resolves.toEqual({
      ok: true,
      list: [{ contract_hash: 'hash-1', symbol: 'AAA', selected: true }],
      total: 1,
    })
  })

  it('loads selected oep4 balances for dashboard cards', async () => {
    mocks.oep4Service.fetchOep4TokenBalances.mockResolvedValue([{ asset_name: 'AAA', balance: 9 }])

    await expect(
      loadSelectedOep4TokenBalances({
        address: 'AQ123',
        selectedTokensByNetwork: {
          'hash-1': selectedToken,
        },
      })
    ).resolves.toEqual({
      ok: true,
      balances: [{ ...selectedToken, balance: 9 }],
    })
  })
})
