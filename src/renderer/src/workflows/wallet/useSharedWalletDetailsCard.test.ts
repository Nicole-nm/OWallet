import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ROUTE_PATHS } from '../../router/routes'
import type { SharedWalletSession } from '../../shared/types'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  sharedWalletSessionStore: {
    setSharedWallet: vi.fn(),
  },
  walletsStore: {
    deleteSharedWallet: vi.fn(),
  },
  loading: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  feedback: {
    notifyError: vi.fn(),
    notifySuccess: vi.fn(),
  },
  application: {
    deleteStoredSharedWallet: vi.fn(),
  },
  copy: {
    copyText: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('../../stores/modules/SharedWalletSession', () => ({
  useSharedWalletSessionStore: () => mocks.sharedWalletSessionStore,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/composables/useCopyFeedback', async () => {
  const { ref } = await vi.importActual<typeof import('vue')>('vue')
  return {
    useCopyFeedback: () => ({
      copied: ref(false),
      copyText: (...args: unknown[]) => mocks.copy.copyText(...args),
      resetCopied: () => {},
    }),
  }
})

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: unknown[]) => mocks.feedback.notifySuccess(...args),
}))

vi.mock('../../modules/wallet/application/dashboard/walletDetailApplicationService', () => ({
  deleteStoredSharedWallet: (...args: unknown[]) =>
    mocks.application.deleteStoredSharedWallet(...args),
}))

import { useSharedWalletDetailsCard } from './useSharedWalletDetailsCard'

const sampleWallet: SharedWalletSession = {
  sharedWalletAddress: 'AShared123',
  sharedWalletName: 'Core Team',
  coPayers: [],
  requiredNumber: 2,
  totalNumber: 3,
}

describe('useSharedWalletDetailsCard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('hands the wallet itself to the session store on navigation, not a wrapped object', () => {
    const card = useSharedWalletDetailsCard()

    card.toSharedWalletHome(sampleWallet)

    expect(mocks.sharedWalletSessionStore.setSharedWallet).toHaveBeenCalledTimes(1)
    expect(mocks.sharedWalletSessionStore.setSharedWallet).toHaveBeenCalledWith(sampleWallet)
    expect(mocks.sharedWalletSessionStore.setSharedWallet).not.toHaveBeenCalledWith({
      wallet: sampleWallet,
    })
    expect(mocks.router.push).toHaveBeenCalledWith({ path: ROUTE_PATHS.sharedWalletHome })
  })

  it('copies the wallet address via the copy feedback composable', async () => {
    const card = useSharedWalletDetailsCard()

    await card.copyAddress(sampleWallet)

    expect(mocks.copy.copyText).toHaveBeenCalledWith('AShared123')
  })

  it('opens and closes the delete confirmation modal', () => {
    const card = useSharedWalletDetailsCard()

    expect(card.showModal.value).toBe(false)
    card.openDeleteModal()
    expect(card.showModal.value).toBe(true)
    card.closeDeleteModal()
    expect(card.showModal.value).toBe(false)
  })

  it('removes the wallet from the store and notifies success on a successful delete', async () => {
    mocks.application.deleteStoredSharedWallet.mockResolvedValue({
      ok: true,
      address: 'AShared123',
    })

    const card = useSharedWalletDetailsCard()
    card.openDeleteModal()

    await card.handleDelete('AShared123')

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.application.deleteStoredSharedWallet).toHaveBeenCalledWith('AShared123')
    expect(mocks.walletsStore.deleteSharedWallet).toHaveBeenCalledWith('AShared123')
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('wallets.deleteSucceess')
    expect(mocks.feedback.notifyError).not.toHaveBeenCalled()
    expect(card.showModal.value).toBe(false)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
  })

  it('notifies error and keeps the modal open when the delete request fails', async () => {
    mocks.application.deleteStoredSharedWallet.mockResolvedValue({
      ok: false,
      errorKey: 'wallets.deleteFailed',
    })

    const card = useSharedWalletDetailsCard()
    card.openDeleteModal()

    await card.handleDelete('AShared123')

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('wallets.deleteFailed')
    expect(mocks.walletsStore.deleteSharedWallet).not.toHaveBeenCalled()
    expect(mocks.feedback.notifySuccess).not.toHaveBeenCalled()
    expect(card.showModal.value).toBe(true)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
  })

  it('falls back to the default error key when the failure result omits one', async () => {
    mocks.application.deleteStoredSharedWallet.mockResolvedValue({ ok: false })

    const card = useSharedWalletDetailsCard()

    await card.handleDelete('AShared123')

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('wallets.deleteFailed')
  })
})
