import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    go: vi.fn(),
  },
  currentWalletStore: {
    wallet: { label: 'TestWallet', key: 'key-1', address: 'AQ123' },
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

import { useCommonSendPage } from './useCommonSendPage'

describe('useCommonSendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('starts on step 0', () => {
    const { currentStep } = useCommonSendPage()
    expect(currentStep.value).toBe(0)
  })

  it('advances to confirm step', () => {
    const { currentStep, goToCommonSendConfirm } = useCommonSendPage()
    goToCommonSendConfirm()
    expect(currentStep.value).toBe(1)
  })

  it('goes back to asset step', () => {
    const { currentStep, goToCommonSendConfirm, goBackToCommonSendAsset } = useCommonSendPage()
    goToCommonSendConfirm()
    goBackToCommonSendAsset()
    expect(currentStep.value).toBe(0)
  })

  it('navigates to wallets on goBackToWallets', () => {
    const { goBackToWallets } = useCommonSendPage()
    goBackToWallets()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('navigates back on cancelCommonSend', () => {
    const { cancelCommonSend } = useCommonSendPage()
    cancelCommonSend()
    expect(mocks.router.go).toHaveBeenCalledWith(-1)
  })

  it('navigates back on finishCommonSend', () => {
    const { finishCommonSend } = useCommonSendPage()
    finishCommonSend()
    expect(mocks.router.go).toHaveBeenCalledWith(-1)
  })

  it('exposes currentWallet from store', () => {
    const { currentWallet } = useCommonSendPage()
    expect(currentWallet.value.label).toBe('TestWallet')
  })

  it('builds breadcrumb routes from wallet label', () => {
    const { routes } = useCommonSendPage()
    expect(routes.value).toEqual([{ name: 'TestWallet', path: '/Wallets/dashboard' }])
  })
})
