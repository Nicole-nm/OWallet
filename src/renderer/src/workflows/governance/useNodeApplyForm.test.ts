import { ref } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  notifyFailure: vi.fn(),
}))

vi.mock('../../shared/ui/notifyFailure', () => ({
  notifyFailure: (...args: unknown[]) => mocks.notifyFailure(...args),
}))

import { useNodeApplyForm } from './useNodeApplyForm'
import type { NodeApplyWallet } from './useNodeApplyWalletSelection'

describe('useNodeApplyForm', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.notifyFailure.mockReturnValue(false)
  })

  it('advances only after the node apply form validates', () => {
    const stakeWallet = ref<NodeApplyWallet | null>({ address: 'AQ-stake' } as NodeApplyWallet)
    const ontBalance = ref('10000')
    const ongBalance = ref('500.1')
    const walletType = ref('commonWallet')
    const form = useNodeApplyForm({
      stakeWallet,
      getNodePublicKey: () => 'operation-pk',
      ontBalance,
      ongBalance,
      walletType,
    })
    form.stakeAmount.value = '10000'

    form.next()

    expect(form.current.value).toBe(1)
    expect(mocks.notifyFailure).toHaveBeenCalledWith({ ok: true })
  })

  it('keeps the user on the current step when validation fails', () => {
    const stakeWallet = ref<NodeApplyWallet | null>(null)
    const ontBalance = ref('10000')
    const ongBalance = ref('500.1')
    const walletType = ref('commonWallet')
    const form = useNodeApplyForm({
      stakeWallet,
      getNodePublicKey: () => '',
      ontBalance,
      ongBalance,
      walletType,
    })
    mocks.notifyFailure.mockReturnValueOnce(true)

    form.next()

    expect(form.current.value).toBe(0)
    expect(mocks.notifyFailure).toHaveBeenCalledWith({
      ok: false,
      errorKey: 'nodeApply.stakeWalletRequired',
    })
  })

  it('validates amount format and moves back from the confirmation step', () => {
    const ontBalance = ref('10000')
    const ongBalance = ref('500.1')
    const walletType = ref('commonWallet')
    const form = useNodeApplyForm({
      stakeWallet: ref<NodeApplyWallet | null>({ address: 'AQ-stake' } as NodeApplyWallet),
      getNodePublicKey: () => 'operation-pk',
      ontBalance,
      ongBalance,
      walletType,
    })

    form.stakeAmount.value = '10.5'
    form.validateAmount()
    expect(form.validAmount.value).toBe(false)

    form.current.value = 1
    form.cancel()
    expect(form.current.value).toBe(0)
  })
})
