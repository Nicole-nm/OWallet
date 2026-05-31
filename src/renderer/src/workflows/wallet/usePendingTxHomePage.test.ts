import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTE_PATHS } from '../../router/routes'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  sharedWalletSessionStore: {
    wallet: {
      sharedWalletName: 'Team Wallet',
    },
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/SharedWalletSession', () => ({
  useSharedWalletSessionStore: () => mocks.sharedWalletSessionStore,
}))

import { usePendingTxHomePage } from './usePendingTxHomePage'

describe('usePendingTxHomePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('moves between review and sign steps', () => {
    const page = usePendingTxHomePage()

    expect(page.progressSteps).toEqual([
      { labelKey: 'sharedWalletHome.reviewTransaction' },
      { labelKey: 'sharedWalletHome.signTransaction' },
    ])
    expect(page.currentStep.value).toBe(0)
    expect(page.showInputPass.value).toBe(false)

    page.handleSignEvent()
    expect(page.currentStep.value).toBe(1)
    expect(page.showInputPass.value).toBe(true)

    page.handleBackEvent()
    expect(page.currentStep.value).toBe(0)
    expect(page.showInputPass.value).toBe(false)
  })

  it('keeps the existing breadcrumb and navigation behavior', () => {
    const page = usePendingTxHomePage()

    expect(page.routes.value).toEqual([{ name: 'Team Wallet', path: ROUTE_PATHS.sharedWalletHome }])

    page.backToWallets()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })

    page.handleSubmitEvent()
    expect(mocks.router.push).toHaveBeenCalledWith({ path: ROUTE_PATHS.sharedWalletHome })
  })
})
