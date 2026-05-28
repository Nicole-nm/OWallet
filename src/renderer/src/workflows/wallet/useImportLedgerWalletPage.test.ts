import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  currentWalletStore: {
    setCurrentWallet: vi.fn(),
  },
  walletsStore: {
    setWalletCollections: vi.fn(),
    setWalletCollectionsLoaded: vi.fn(),
  },
  feedback: {
    notifyWarning: vi.fn(),
  },
  ledgerMonitor: {
    ledgerStatus: 'READY',
    ledgerPk: 'PUB-0',
    useLedgerStatusMonitor: vi.fn(),
  },
  application: {
    loadLedgerAccountPage: vi.fn(),
    loadLedgerAccountSelection: vi.fn(),
    importLedgerWalletSelections: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: unknown) => key,
  }),
}))

vi.mock('../../stores/modules/CurrentWallet', () => ({
  useCurrentWalletStore: () => mocks.currentWalletStore,
}))

vi.mock('../../stores/modules/Wallets', () => ({
  useWalletsStore: () => mocks.walletsStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
}))

vi.mock('../../modules/wallet/composables/useLedgerStatusMonitor', () => ({
  useLedgerStatusMonitor: (...args: unknown[]) =>
    mocks.ledgerMonitor.useLedgerStatusMonitor(...args),
}))

vi.mock('../../modules/wallet/application/ledgerWalletConnectionService', () => ({
  loadLedgerAccountPage: (...args: unknown[]) => mocks.application.loadLedgerAccountPage(...args),
  loadLedgerAccountSelection: (...args: unknown[]) =>
    mocks.application.loadLedgerAccountSelection(...args),
}))

vi.mock('../../modules/wallet/application/ledgerWalletImportService', () => ({
  importLedgerWalletSelections: (...args: unknown[]) =>
    mocks.application.importLedgerWalletSelections(...args),
}))

import { useImportLedgerWalletPage } from './useImportLedgerWalletPage'

describe('useImportLedgerWalletPage', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.useRealTimers()
    setActivePinia(createPinia())
    mocks.ledgerMonitor.useLedgerStatusMonitor.mockReturnValue({
      ledgerStatus: mocks.ledgerMonitor.ledgerStatus,
      ledgerPk: mocks.ledgerMonitor.ledgerPk,
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('enables ledger polling while the connect step is active', () => {
    useImportLedgerWalletPage()

    expect(mocks.ledgerMonitor.useLedgerStatusMonitor).toHaveBeenCalledWith({
      shouldPoll: expect.objectContaining({ value: true }),
      interval: expect.objectContaining({ value: 1000 }),
    })
  })

  it('loads ledger account pages when the selection step enters the address list', async () => {
    mocks.application.loadLedgerAccountPage.mockResolvedValue({
      ok: true,
      accounts: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }],
    })

    const page = useImportLedgerWalletPage()
    await page.nextStep()
    await page.loadInitialLedgerAccounts()

    expect(page.step.value).toBe(2)
    expect(page.currentStep.value).toBe(1)
    expect(mocks.application.loadLedgerAccountPage).toHaveBeenCalledWith({
      page: 1,
      pageSize: 5,
      neo: false,
    })
    expect(page.form.initialPageStatus).toBe('ready')
    expect(page.form.publicKeyList).toEqual([{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }])
  })

  it('does not reload the first ledger account page when addresses are already present', async () => {
    mocks.application.loadLedgerAccountPage.mockResolvedValue({
      ok: true,
      accounts: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }],
    })

    const page = useImportLedgerWalletPage()
    await page.nextStep()
    await page.loadInitialLedgerAccounts()
    await page.loadInitialLedgerAccounts()

    expect(mocks.application.loadLedgerAccountPage).toHaveBeenCalledTimes(1)
  })

  it('keeps retrying the first ledger account page until it loads successfully', async () => {
    vi.useFakeTimers()
    mocks.application.loadLedgerAccountPage
      .mockResolvedValueOnce({ ok: false, accounts: [] as unknown[] })
      .mockResolvedValueOnce({
        ok: true,
        accounts: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }],
      })

    const page = useImportLedgerWalletPage()
    await page.nextStep()
    await page.loadInitialLedgerAccounts()

    expect(page.form.initialPageStatus).toBe('retrying')
    expect(page.form.publicKeyList).toEqual([])

    await vi.advanceTimersByTimeAsync(1000)

    expect(mocks.application.loadLedgerAccountPage).toHaveBeenCalledTimes(2)
    expect(page.form.initialPageStatus).toBe('ready')
    expect(page.form.publicKeyList).toEqual([{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }])
  })

  it('stops retrying the first ledger account page after switching to advanced mode', async () => {
    vi.useFakeTimers()
    mocks.application.loadLedgerAccountPage.mockResolvedValue({
      ok: false,
      accounts: [] as unknown[],
    })

    const page = useImportLedgerWalletPage()
    await page.nextStep()
    await page.loadInitialLedgerAccounts()

    expect(page.form.initialPageStatus).toBe('retrying')

    page.toggleImportLedgerMode()
    await vi.advanceTimersByTimeAsync(1000)

    expect(page.form.isAdvancedMode).toBe(true)
    expect(page.form.initialPageStatus).toBe('idle')
    expect(mocks.application.loadLedgerAccountPage).toHaveBeenCalledTimes(1)
  })

  it('loads the next ledger account page with five addresses per page', async () => {
    mocks.application.loadLedgerAccountPage
      .mockResolvedValueOnce({
        ok: true,
        accounts: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }],
      })
      .mockResolvedValueOnce({
        ok: true,
        accounts: [{ acct: 5, publicKey: 'PUB-5', address: 'AQ005' }],
      })

    const page = useImportLedgerWalletPage()
    await page.nextStep()
    await page.loadInitialLedgerAccounts()
    page.nextImportLedgerPage()
    await Promise.resolve()

    expect(page.form.page).toBe(2)
    expect(mocks.application.loadLedgerAccountPage).toHaveBeenNthCalledWith(2, {
      page: 2,
      pageSize: 5,
      neo: false,
    })
  })

  it('imports selected ledger wallets in the workflow and refreshes wallet cache', async () => {
    mocks.application.importLedgerWalletSelections.mockResolvedValue({
      ok: true,
      insertedAccounts: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000', label: 'Ledger-0' }],
      duplicateCount: 1,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [] as unknown[],
          hardwareWallets: [{ address: 'AQ000' }],
        },
      },
    })

    const page = useImportLedgerWalletPage()
    page.updateImportLedgerField({ field: 'label', value: 'Ledger' })
    page.selectImportLedgerAddress({ acct: 0, publicKey: 'PUB-0', address: 'AQ000' })

    await page.submitImportLedgerWallet()

    expect(mocks.application.importLedgerWalletSelections).toHaveBeenCalledWith({
      selections: [{ acct: 0, publicKey: 'PUB-0', address: 'AQ000' }],
      label: 'Ledger',
      neo: false,
    })
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('ledgerWallet.alreadyImported')
    expect(mocks.walletsStore.setWalletCollections).toHaveBeenCalledWith({
      normalWallets: [] as unknown[],
      sharedWallets: [] as unknown[],
      hardwareWallets: [{ address: 'AQ000' }],
    })
    expect(mocks.walletsStore.setWalletCollectionsLoaded).toHaveBeenCalledWith(true)
    expect(mocks.currentWalletStore.setCurrentWallet).toHaveBeenCalledWith({
      wallet: { acct: 0, publicKey: 'PUB-0', address: 'AQ000', label: 'Ledger-0' },
    })
    expect(mocks.router.push).toHaveBeenCalledWith({ name: 'Wallets' })
  })
})
