import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  settingStore: {
    network: 'testnet',
  },
  walletsStore: {
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
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
    createSharedWalletDraft: vi.fn(),
    submitSharedWalletCreation: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: any) => key,
  }),
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loading,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: any[]) => mocks.feedback.notifyError(...args),
  notifySuccess: (...args: any[]) => mocks.feedback.notifySuccess(...args),
}))

vi.mock(
  '../../modules/wallet/application/sharedWallet/createSharedWalletApplicationService',
  () => ({
    createSharedWalletDraft: (...args: any[]) => mocks.application.createSharedWalletDraft(...args),
    submitSharedWalletCreation: (...args: any[]) =>
      mocks.application.submitSharedWalletCreation(...args),
  })
)

import { useCreateSharedWalletPage } from './useCreateSharedWalletPage'

describe('useCreateSharedWalletPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates a shared wallet draft in the workflow and advances to confirmation', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })

    const page = useCreateSharedWalletPage()

    page.basicLabel.value = 'Core Team'
    page.updateCreateSharedWalletCopayerName({ index: 0, value: 'Alice' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 0, value: 'A'.repeat(66) })
    page.updateCreateSharedWalletCopayerName({ index: 1, value: 'Bob' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 1, value: 'B'.repeat(66) })

    await page.submitCreateSharedWalletBasicStep()

    expect(page.currentStep.value).toBe(1)
    expect(page.createdLabel.value).toBe('Core Team')
    expect(page.copayers.value).toEqual([
      { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
      { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
    ])
  })

  it('keeps the shared wallet wizard on basic info when draft creation fails', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: false,
      errorKey: 'createSharedWallet.publicKeyErr',
    })

    const page = useCreateSharedWalletPage()
    await page.submitCreateSharedWalletBasicStep()

    expect(page.currentStep.value).toBe(0)
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('createSharedWallet.publicKeyErr')
  })

  it('guards shared wallet copayer removal and duplicate creation branches', async () => {
    const page = useCreateSharedWalletPage()

    page.removeCreateSharedWalletCopayer(0)

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('createSharedWallet.pksLte2')

    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })
    mocks.application.submitSharedWalletCreation.mockResolvedValue({
      ok: false,
      errorKey: 'createSharedWallet.exist',
      duplicate: true,
    })

    await page.submitCreateSharedWalletBasicStep()
    await page.submitCreateSharedWalletConfirmStep()

    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('createSharedWallet.exist')
    expect(page.currentStep.value).toBe(0)
    expect(page.createdLabel.value).toBe('')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('does not submit shared wallet creation while already processing', async () => {
    const page = useCreateSharedWalletPage()
    page.processing.value = true

    await page.submitCreateSharedWalletConfirmStep()

    expect(mocks.application.submitSharedWalletCreation).not.toHaveBeenCalled()
    expect(mocks.loading.showLoadingModals).not.toHaveBeenCalled()
  })

  it('removes a copayer when more than two exist', () => {
    const page = useCreateSharedWalletPage()
    page.addCreateSharedWalletCopayer()
    page.removeCreateSharedWalletCopayer(0)
    expect(page.pks.value.length).toBe(2)
  })

  it('ignores copayer name/publicKey updates targeting an out-of-range index', () => {
    const page = useCreateSharedWalletPage()
    const before = page.pks.value.map((c) => ({ ...c }))
    page.updateCreateSharedWalletCopayerName({ index: 99, value: 'X' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 99, value: 'Y' })
    expect(page.pks.value).toEqual(before)
  })

  it('validateCreateSharedWalletLabel rejects empty and oversized labels', () => {
    const page = useCreateSharedWalletPage()

    page.basicLabel.value = ''
    page.validateCreateSharedWalletLabel()
    expect(page.validLabel.value).toBe(false)

    page.basicLabel.value = 'a'.repeat(13)
    page.validateCreateSharedWalletLabel()
    expect(page.validLabel.value).toBe(false)
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('createSharedWallet.walletNameErr')

    page.basicLabel.value = 'Valid'
    page.validateCreateSharedWalletLabel()
    expect(page.validLabel.value).toBe(true)
  })

  it('validateCreateSharedWalletPublicKey flags non-66-character keys and ignores out-of-range indexes', () => {
    const page = useCreateSharedWalletPage()
    page.validateCreateSharedWalletPublicKey({ index: 99, value: 'x' })

    page.validateCreateSharedWalletPublicKey({ index: 0, value: 'short' })
    expect(page.pks.value[0]?.pkValid).toBe(false)

    page.validateCreateSharedWalletPublicKey({ index: 0, value: 'a'.repeat(66) })
    expect(page.pks.value[0]?.pkValid).toBe(true)

    page.validateCreateSharedWalletPublicKey({ index: 1, value: '' })
    expect(page.pks.value[1]?.pkValid).toBe(true)
  })

  it('clamps requiredSigNum to the count of copayers from the draft', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Tiny',
      copayers: [{ name: 'A', publickey: 'A'.repeat(66), address: 'AQ1' }],
    })

    const page = useCreateSharedWalletPage()
    page.requiredSigNum.value = 5

    await page.submitCreateSharedWalletBasicStep()
    expect(page.requiredSigNum.value).toBe(1)
  })

  it('falls back to a generic error key when the submit step fails without one', async () => {
    const page = useCreateSharedWalletPage()
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })
    mocks.application.submitSharedWalletCreation.mockResolvedValue({ ok: false })

    await page.submitCreateSharedWalletBasicStep()
    await page.submitCreateSharedWalletConfirmStep()
    expect(mocks.feedback.notifyError).toHaveBeenCalledWith('createSharedWallet.createFailed')
  })

  it('does not flip notifyError for ok-but-no-copayers results without errorKey', async () => {
    const page = useCreateSharedWalletPage()
    mocks.application.createSharedWalletDraft.mockResolvedValue({ ok: false })
    await page.submitCreateSharedWalletBasicStep()
    expect(mocks.feedback.notifyError).not.toHaveBeenCalled()
  })

  it('cancelCreateSharedWalletBasicStep routes back to the wallets list', () => {
    const page = useCreateSharedWalletPage()
    page.cancelCreateSharedWalletBasicStep()
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })

  it('backCreateSharedWalletConfirmStep returns to the basic step', () => {
    const page = useCreateSharedWalletPage()
    page.currentStep.value = 1
    page.backCreateSharedWalletConfirmStep()
    expect(page.currentStep.value).toBe(0)
  })

  it('exposes selectable required-signature options based on copayer count', () => {
    const page = useCreateSharedWalletPage()
    expect(page.options.value).toEqual([{ value: 2, label: 2 }])
    page.addCreateSharedWalletCopayer()
    expect(page.options.value.map((o: { value: number }) => o.value)).toEqual([2, 3])
  })

  it('submits shared wallet creation in the workflow and refreshes wallet cache', async () => {
    mocks.application.createSharedWalletDraft.mockResolvedValue({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })
    mocks.application.submitSharedWalletCreation.mockResolvedValue({
      ok: true,
      sharedWalletAddress: 'shared-address',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    const page = useCreateSharedWalletPage()
    page.basicLabel.value = 'Core Team'
    page.updateCreateSharedWalletCopayerName({ index: 0, value: 'Alice' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 0, value: 'A'.repeat(66) })
    page.updateCreateSharedWalletCopayerName({ index: 1, value: 'Bob' })
    page.updateCreateSharedWalletCopayerPublicKey({ index: 1, value: 'B'.repeat(66) })

    await page.submitCreateSharedWalletBasicStep()

    await page.submitCreateSharedWalletConfirmStep()

    expect(mocks.loading.showLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.loading.hideLoadingModals).toHaveBeenCalledTimes(1)
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [] as unknown[],
      sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
      hardwareWallets: [] as unknown[],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('createSharedWallet.createSuccess')
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
    expect(page.currentStep.value).toBe(0)
    expect(page.createdLabel.value).toBe('')
  })
})
