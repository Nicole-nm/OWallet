import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadLedgerAccountSelection: vi.fn(),
}))

vi.mock('lodash-es', () => ({
  debounce: (callback: (...args: unknown[]) => unknown) => callback,
}))

vi.mock('../../modules/wallet/application/ledger/ledgerWalletConnectionService', () => ({
  loadLedgerAccountSelection: (...args: unknown[]) => mocks.loadLedgerAccountSelection(...args),
}))

import { useLedgerAdvancedMode } from './useLedgerAdvancedMode'

function createForm() {
  return {
    neo: false,
    isAdvancedMode: false,
    notNeoPathParam: '',
    neoPathParam: '3',
    advancedModeLoading: false,
    advancedModePublicKey: null,
    publicKeyList: [] as Array<{ address: string; publicKey: string }>,
  }
}

describe('useLedgerAdvancedMode', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('loads standard and Neo account selections while clearing rejected results', async () => {
    const form = createForm()
    const advancedMode = useLedgerAdvancedMode(form, vi.fn(), vi.fn())
    const selection = { address: 'ALedger' }
    mocks.loadLedgerAccountSelection.mockResolvedValueOnce({ ok: true, selection })

    await advancedMode.debouncedGetPkForAdvancedMode()
    expect(mocks.loadLedgerAccountSelection).toHaveBeenLastCalledWith({ acct: 0, neo: false })
    expect(form.advancedModePublicKey).toBe(selection)
    expect(form.advancedModeLoading).toBe(false)

    form.neo = true
    mocks.loadLedgerAccountSelection.mockResolvedValueOnce({ ok: false })
    await advancedMode.debouncedGetPkForAdvancedMode()
    expect(mocks.loadLedgerAccountSelection).toHaveBeenLastCalledWith({ acct: 3, neo: true })
    expect(form.advancedModePublicKey).toBeNull()
  })

  it('loads initial accounts only when leaving advanced mode with an empty list', () => {
    const form = createForm()
    const stopInitialLoading = vi.fn()
    const loadInitialAccounts = vi.fn(async () => {})
    const advancedMode = useLedgerAdvancedMode(form, stopInitialLoading, loadInitialAccounts)

    advancedMode.toggleImportLedgerMode()
    expect(form.isAdvancedMode).toBe(true)
    expect(loadInitialAccounts).not.toHaveBeenCalled()

    advancedMode.toggleImportLedgerMode()
    expect(form.isAdvancedMode).toBe(false)
    expect(loadInitialAccounts).toHaveBeenCalledOnce()

    form.publicKeyList = [{ address: 'ALedger', publicKey: 'ledger-pk' }]
    advancedMode.toggleImportLedgerMode()
    advancedMode.toggleImportLedgerMode()
    expect(loadInitialAccounts).toHaveBeenCalledOnce()
    expect(stopInitialLoading).toHaveBeenCalledTimes(4)
  })
})
