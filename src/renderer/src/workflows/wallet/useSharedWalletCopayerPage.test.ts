import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  overview: {
    loadLocalSharedCopayers: vi.fn(),
  },
  sharedWalletSessionStore: {
    wallet: {
      sharedWalletAddress: 'AShared123',
      sharedWalletName: 'Core Team',
      coPayers: [
        { address: 'ALocal123', name: 'Alice' },
        { address: 'ARemote123', name: 'Bob' },
      ],
      requiredNumber: 1,
      totalNumber: 2,
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

vi.mock('../../stores/modules/SharedWalletSession', () => ({
  useSharedWalletSessionStore: () => mocks.sharedWalletSessionStore,
}))

vi.mock(
  '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService',
  () => ({
    loadLocalSharedCopayers: (...args: unknown[]) =>
      mocks.overview.loadLocalSharedCopayers(...args),
  })
)

import { useSharedWalletCopayerPage } from './useSharedWalletCopayerPage'

describe('useSharedWalletCopayerPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.overview.loadLocalSharedCopayers.mockResolvedValue({
      ok: true,
      copayers: [{ address: 'ALocal123' }],
    })
  })

  it('marks only co-payers backed by a local wallet', async () => {
    const page = useSharedWalletCopayerPage()

    expect(mocks.overview.loadLocalSharedCopayers).toHaveBeenCalledWith(
      mocks.sharedWalletSessionStore.wallet.coPayers
    )
    await vi.waitFor(() => {
      expect(page.isLocalCopayer('ALocal123')).toBe(true)
    })
    expect(page.isLocalCopayer('ARemote123')).toBe(false)
  })

  it('navigates back to the wallets page', () => {
    const page = useSharedWalletCopayerPage()

    page.backToWallets()

    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })
})
