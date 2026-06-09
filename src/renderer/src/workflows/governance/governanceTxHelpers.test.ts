import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  notifyFailure: vi.fn(),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.notifyError(...args),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: (...args: unknown[]) => mocks.notifyFailure(...args),
}))

import { resolveWalletOrNotify, stageSignableTx, withLoading } from './governanceTxHelpers'

beforeEach(() => {
  mocks.notifyError.mockReset()
  mocks.notifyFailure.mockReset()
})

describe('resolveWalletOrNotify', () => {
  it('returns the wallet without notifying when present', () => {
    const wallet = { address: 'A1' }
    expect(resolveWalletOrNotify(() => wallet)).toBe(wallet)
    expect(mocks.notifyError).not.toHaveBeenCalled()
  })

  it('notifies with the default key and returns null when absent', () => {
    expect(resolveWalletOrNotify(() => null)).toBeNull()
    expect(mocks.notifyError).toHaveBeenCalledWith('nodeStake.selectIndividualWallet')
  })

  it('uses a custom error key', () => {
    resolveWalletOrNotify(() => null, 'custom.key')
    expect(mocks.notifyError).toHaveBeenCalledWith('custom.key')
  })
})

describe('stageSignableTx', () => {
  it('stages the tx and opens the modal on success', () => {
    mocks.notifyFailure.mockReturnValue(false)
    const tx = ref<unknown>(null)
    const walletPassModal = ref(false)

    const staged = stageSignableTx({ ok: true, tx: 'TX' }, { tx, walletPassModal })

    expect(staged).toBe(true)
    expect(tx.value).toBe('TX')
    expect(walletPassModal.value).toBe(true)
  })

  it('leaves refs untouched on failure', () => {
    mocks.notifyFailure.mockReturnValue(true)
    const tx = ref<unknown>(null)
    const walletPassModal = ref(false)

    const staged = stageSignableTx({ ok: false, errorKey: 'boom' }, { tx, walletPassModal })

    expect(staged).toBe(false)
    expect(tx.value).toBeNull()
    expect(walletPassModal.value).toBe(false)
  })
})

describe('withLoading', () => {
  it('shows then hides around a resolving fn and returns its value', async () => {
    const order: string[] = []
    const loadingStore = {
      showLoadingModals: vi.fn(() => order.push('show')),
      hideLoadingModals: vi.fn(() => order.push('hide')),
    }

    const result = await withLoading(loadingStore, async () => {
      order.push('run')
      return 42
    })

    expect(result).toBe(42)
    expect(order).toEqual(['show', 'run', 'hide'])
  })

  it('hides even when the fn throws', async () => {
    const loadingStore = {
      showLoadingModals: vi.fn(),
      hideLoadingModals: vi.fn(),
    }

    await expect(
      withLoading(loadingStore, async () => {
        throw new Error('nope')
      })
    ).rejects.toThrow('nope')
    expect(loadingStore.hideLoadingModals).toHaveBeenCalledTimes(1)
  })
})
