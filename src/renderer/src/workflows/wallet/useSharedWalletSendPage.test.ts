import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTE_PATHS } from '../../router/routes'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
    go: vi.fn(),
  },
  currentWalletStore: {
    transfer: { isRedeem: false },
  },
  sharedWalletSessionStore: {
    wallet: {
      sharedWalletName: 'Team Wallet',
    },
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../stores/modules/SharedWalletSession', () => ({
  useSharedWalletSessionStore: () => mocks.sharedWalletSessionStore,
}))

import { useSharedWalletSendPage } from './useSharedWalletSendPage'

describe('useSharedWalletSendPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.currentWalletStore.transfer.isRedeem = false
  })

  it('uses the three-step shared transfer flow for regular sends', () => {
    const page = useSharedWalletSendPage()

    expect(page.current.value).toBe(0)
    expect(page.progressSteps.value).toEqual([
      { workflowStep: 0, labelKey: 'sharedWalletHome.transferDetails' },
      { workflowStep: 1, labelKey: 'sharedWalletHome.reviewTransaction' },
      { workflowStep: 2, labelKey: 'sharedWalletHome.signTransaction' },
    ])

    page.handleSendAssetNext()
    expect(page.current.value).toBe(1)

    page.handleSendConfirmNext()
    expect(page.current.value).toBe(2)

    page.handleInputPassBack()
    expect(page.current.value).toBe(1)

    page.handleSendConfirmBack()
    expect(page.current.value).toBe(0)
  })

  it('starts redeem flows on review and only exposes the two actionable steps', () => {
    mocks.currentWalletStore.transfer.isRedeem = true

    const page = useSharedWalletSendPage()

    expect(page.current.value).toBe(1)
    expect(page.progressSteps.value).toEqual([
      { workflowStep: 1, labelKey: 'sharedWalletHome.reviewTransaction' },
      { workflowStep: 2, labelKey: 'sharedWalletHome.signTransaction' },
    ])

    page.handleSendConfirmBack()
    expect(page.current.value).toBe(1)
  })

  it('keeps the existing navigation behavior', () => {
    const page = useSharedWalletSendPage()

    expect(page.routes.value).toEqual([{ name: 'Team Wallet', path: ROUTE_PATHS.sharedWalletHome }])

    page.handleRouteBack()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })

    page.handleCancel()
    expect(mocks.router.go).toHaveBeenCalledWith(-1)

    page.handleInputPassNext()
    expect(mocks.router.push).toHaveBeenCalledWith({ path: ROUTE_PATHS.sharedWalletHome })
  })
})
