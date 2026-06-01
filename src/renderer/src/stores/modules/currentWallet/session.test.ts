import { describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'
import { useCurrentWalletSessionStore } from './session'

describe('useCurrentWalletSessionStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes transfer, pendingTx, currentSigner, and localCopayers with sane defaults', () => {
    const store = useCurrentWalletSessionStore()
    expect(store.transfer.from).toBe('')
    expect(store.transfer.asset).toBe('ONT')
    expect(store.pendingTx.amount).toBe(0)
    expect(store.currentSigner).toEqual({ type: '', address: '', publicKey: '' })
    expect(store.localCopayers).toEqual([])
  })

  it('setTransferRedeemType flips to ONG for redeem mode', () => {
    const store = useCurrentWalletSessionStore()
    store.setTransferRedeemType({ type: true })
    expect(store.transfer.isRedeem).toBe(true)
    expect(store.transfer.asset).toBe('ONG')
    store.setTransferRedeemType({ type: false })
    expect(store.transfer.asset).toBe('ONT')
  })

  it('setCurrentSigner merges with defaults', () => {
    const store = useCurrentWalletSessionStore()
    store.setCurrentSigner({ account: { address: 'AQ1', publicKey: 'pk' } })
    expect(store.currentSigner.address).toBe('AQ1')
    expect(store.currentSigner.publicKey).toBe('pk')
    expect(store.currentSigner.type).toBe('')
  })

  it('resetCurrentTransfer / resetTransferBalance return to defaults', () => {
    const store = useCurrentWalletSessionStore()
    store.setTransfer({ transfer: { from: 'AQ1', amount: 5 } })
    expect(store.transfer.amount).toBe(5)
    store.resetCurrentTransfer()
    expect(store.transfer.amount).toBe(0)
    store.setTransfer({ transfer: { amount: 7 } })
    store.resetTransferBalance()
    expect(store.transfer.amount).toBe(0)
  })

  it('resetCurrentTransfer accepts a wallet-specific default fee', () => {
    const store = useCurrentWalletSessionStore()
    store.resetCurrentTransfer({ gas: 0.05 })
    expect(store.transfer.gas).toBe(0.05)
  })
})
