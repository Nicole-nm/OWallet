import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadSelectableOep4Tokens: vi.fn(),
  notifyError: vi.fn(),
}))

vi.mock('../../shared/composables/useAsyncAction', () => ({
  useAsyncAction: () => ({
    run: (action: () => Promise<unknown>) => action(),
  }),
}))

vi.mock('../../modules/wallet/application/transfer/tokenSelectionApplicationService', () => ({
  loadSelectableOep4Tokens: (...args: unknown[]) => mocks.loadSelectableOep4Tokens(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: (...args: unknown[]) => mocks.notifyError(...args),
}))

import { useOep4SelectionModal } from './useOep4SelectionModal'

function createModal() {
  const tokensStore = {
    oep4Tokens: {
      testnet: [{ contract_hash: 'selected' }],
    },
    setOep4Token: vi.fn(),
  }
  const getOep4Balances = vi.fn(async () => {})
  const modal = useOep4SelectionModal({
    tokensStore: tokensStore as never,
    settingStore: { network: 'testnet' } as never,
    getOep4Balances,
  })
  return { getOep4Balances, modal, tokensStore }
}

describe('useOep4SelectionModal', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps selectable tokens and clears state after failed requests', async () => {
    const { modal } = createModal()
    mocks.loadSelectableOep4Tokens.mockResolvedValueOnce({
      ok: true,
      total: 1,
      list: [{ contract_hash: 'token', decimals: undefined, symbol: 'TKN', selected: true }],
    })

    await expect(modal.fetchSelectableOep4Tokens()).resolves.toMatchObject({ ok: true })
    expect(modal.oep4SelectionItems.value).toEqual([
      { contract_hash: 'token', decimal: 0, symbol: 'TKN', selected: true },
    ])

    mocks.loadSelectableOep4Tokens.mockResolvedValueOnce({ ok: false })
    await modal.fetchSelectableOep4Tokens()
    expect(modal.oep4SelectionItems.value).toEqual([])
    expect(modal.oep4SelectionTotal.value).toBe(0)
    expect(mocks.notifyError).toHaveBeenCalledWith('common.networkErr')
  })

  it('fetches on open, reloads balances on close, and resets pagination', async () => {
    const { getOep4Balances, modal } = createModal()
    mocks.loadSelectableOep4Tokens.mockResolvedValue({ ok: true, total: 0, list: [] })
    modal.oep4SelectionPageNumber.value = 4

    await modal.handleOep4SelectionOpenChange(true)
    expect(modal.showOep4Selection.value).toBe(true)
    expect(modal.oep4SelectionPageNumber.value).toBe(1)

    await modal.handleOep4SelectionOpenChange(false)
    expect(modal.showOep4Selection.value).toBe(false)
    expect(getOep4Balances).toHaveBeenCalled()
  })

  it('changes pages and toggles the selected token in store and local state', async () => {
    const { modal, tokensStore } = createModal()
    mocks.loadSelectableOep4Tokens.mockResolvedValue({ ok: true, total: 0, list: [] })
    modal.oep4SelectionItems.value = [
      { contract_hash: 'token', symbol: 'TKN', selected: false },
      { contract_hash: 'other', symbol: 'OTHER', selected: false },
    ]

    modal.handleOep4SelectionPageChange(2)
    await vi.waitFor(() => expect(mocks.loadSelectableOep4Tokens).toHaveBeenCalled())
    expect(modal.oep4SelectionPageNumber.value).toBe(2)

    modal.toggleOep4Selection({ contract_hash: 'token', symbol: 'TKN', selected: false })
    expect(tokensStore.setOep4Token).toHaveBeenCalledWith('testnet', {
      contract_hash: 'token',
      symbol: 'TKN',
      selected: true,
    })
  })
})
