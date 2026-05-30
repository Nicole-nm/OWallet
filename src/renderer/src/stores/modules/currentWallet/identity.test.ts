import { vi, describe, it, expect, beforeEach } from 'vitest'
import { createPinia, setActivePinia } from 'pinia'

vi.mock('../../../shared/persistence/appStateService', () => ({
  loadCurrentWalletSession: () => null,
  saveCurrentWalletSession: vi.fn(),
}))

import { useCurrentWalletIdentityStore } from './identity'

describe('useCurrentWalletIdentityStore', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('initializes with an empty default wallet', () => {
    const store = useCurrentWalletIdentityStore()
    expect(store.wallet).toEqual({
      publicKey: '',
      address: '',
      name: '',
      label: '',
      coPayers: [],
      requiredNumber: '',
      totalNumber: '',
    })
  })

  it('setCurrentWallet replaces the wallet record', () => {
    const store = useCurrentWalletIdentityStore()
    store.setCurrentWallet({
      wallet: { address: 'AQ1', label: 'A', publicKey: 'pk', name: 'A' } as never,
    })
    expect(store.wallet.address).toBe('AQ1')
    expect(store.wallet.label).toBe('A')
  })

  it('mergeCurrentWallet preserves existing fields', () => {
    const store = useCurrentWalletIdentityStore()
    store.setCurrentWallet({
      wallet: { address: 'AQ1', label: 'A', publicKey: 'pk', name: 'A' } as never,
    })
    store.mergeCurrentWallet({ wallet: { label: 'B' } as never })
    expect(store.wallet.address).toBe('AQ1')
    expect(store.wallet.label).toBe('B')
  })

  it('resetCurrentWallet returns to defaults', () => {
    const store = useCurrentWalletIdentityStore()
    store.setCurrentWallet({
      wallet: { address: 'AQ1', label: 'A', publicKey: 'pk', name: 'A' } as never,
    })
    store.resetCurrentWallet()
    expect(store.wallet.address).toBe('')
  })
})
