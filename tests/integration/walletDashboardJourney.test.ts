import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'
import { clearHttpCache } from '../../src/renderer/src/shared/network/httpClient'
import { useWalletBalances } from '../../src/renderer/src/workflows/wallet/useWalletBalances'
import { useWalletTransactions } from '../../src/renderer/src/workflows/wallet/useWalletTransactions'

const fetchJson = vi.fn()

beforeEach(() => {
  clearHttpCache()
  fetchJson.mockReset()
  Object.assign(globalThis, {
    window: {
      owalletPlatform: {
        http: { fetchJson },
      },
    },
  })
})

afterEach(() => {
  Reflect.deleteProperty(globalThis, 'window')
})

describe('wallet dashboard journey', () => {
  it('loads balance and transaction rows through workflow, application, and domain layers', async () => {
    fetchJson.mockImplementation(async (url: string) => {
      if (url.includes('/NATIVE/balances')) {
        return {
          result: [
            { asset_name: 'ont', balance: '42' },
            { asset_name: 'ong', balance: '3' },
            { asset_name: 'waitboundong', balance: '2' },
            { asset_name: 'unboundong', balance: '1' },
          ],
        }
      }

      if (url.includes('/transactions')) {
        return {
          result: [
            {
              tx_hash: 'tx-hash',
              transfers: [
                {
                  asset_name: 'ont',
                  from_address: 'AQ123',
                  to_address: 'AQ999',
                  amount: '7',
                },
              ],
            },
          ],
        }
      }

      throw new Error(`Unexpected integration HTTP request: ${url}`)
    })

    const currentWalletStore = {
      balance: { ont: 0, ong: 0, waitBoundOng: 0, unboundOng: 0 },
      setNativeBalance: vi.fn(),
    }
    const tokensStore = {
      oep4Tokens: { TEST_NET: {} },
      oep4WithBalances: [],
      setOep4Balances: vi.fn(),
    }
    const settingStore = { network: 'TEST_NET' }
    const address = ref('AQ123')
    const balances = useWalletBalances({
      address,
      currentWalletStore: currentWalletStore as never,
      tokensStore: tokensStore as never,
      settingStore: settingStore as never,
      t: (key) => key,
    })
    const transactions = useWalletTransactions({
      address,
      settingStore: settingStore as never,
      filterGovernanceOng: false,
      txSliceCount: 10,
      t: (key) => key,
    })

    await expect(balances.getBalance()).resolves.toEqual({
      ont: '42',
      ong: '3',
      waitBoundOng: '2',
      unboundOng: '1',
    })
    await expect(transactions.getTransactions()).resolves.toEqual([
      { txHash: 'tx-hash', asset: 'ONT', amount: '-7' },
    ])
    expect(currentWalletStore.setNativeBalance).toHaveBeenCalledWith({
      balance: {
        ont: '42',
        ong: '3',
        waitBoundOng: '2',
        unboundOng: '1',
      },
    })
  })
})
