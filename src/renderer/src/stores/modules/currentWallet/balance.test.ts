import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCurrentWalletBalanceStore } from './balance'

describe('useCurrentWalletBalanceStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with zeroed balances, redeem, and nep5Ont', () => {
    const store = useCurrentWalletBalanceStore()
    expect(store.balance).toEqual({ ont: 0, ong: 0, waitBoundOng: 0, unboundOng: 0 })
    expect(store.redeem).toEqual({ claimableOng: 0, balanceOng: 0 })
    expect(store.nep5Ont).toBe(0)
  })

  it('setNativeBalance replaces the balance, resetNativeBalance returns defaults', () => {
    const store = useCurrentWalletBalanceStore()
    store.setNativeBalance({ balance: { ont: 10, ong: 5 } })
    expect(store.balance.ont).toBe(10)
    expect(store.balance.ong).toBe(5)
    store.resetNativeBalance()
    expect(store.balance.ont).toBe(0)
  })

  it('setCurrentRedeem updates redeem state', () => {
    const store = useCurrentWalletBalanceStore()
    store.setCurrentRedeem({ redeem: { claimableOng: 1, balanceOng: 2 } })
    expect(store.redeem).toEqual({ claimableOng: 1, balanceOng: 2 })
  })

  it('setNep5Ont updates nep5Ont counter', () => {
    const store = useCurrentWalletBalanceStore()
    store.setNep5Ont({ nep5Ont: 42 })
    expect(store.nep5Ont).toBe(42)
  })
})
