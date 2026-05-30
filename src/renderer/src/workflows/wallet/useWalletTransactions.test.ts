import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  notifyError: vi.fn(),
  openExternalUrl: vi.fn(),
  getWalletAddressExplorerUrl: vi.fn(() => 'https://explorer/address'),
  getWalletTransactionExplorerUrl: vi.fn(() => 'https://explorer/tx'),
  loadWalletTransactions: vi.fn(),
}))

vi.mock('../../shared/ui/feedback', () => ({ notifyError: mocks.notifyError }))

vi.mock('../../modules/app/application/externalNavigationApplicationService', () => ({
  openExternalUrl: mocks.openExternalUrl,
}))

vi.mock('../../modules/wallet/application/dashboard/walletDashboardApplicationService', () => ({
  getWalletAddressExplorerUrl: mocks.getWalletAddressExplorerUrl,
  getWalletTransactionExplorerUrl: mocks.getWalletTransactionExplorerUrl,
  loadWalletTransactions: mocks.loadWalletTransactions,
}))

import { useWalletTransactions } from './useWalletTransactions'

const settingStore = { network: 'MAIN_NET' } as never
const t = (key: string) => key

function setup(address = 'AAddress') {
  return useWalletTransactions({
    address: ref(address),
    settingStore,
    filterGovernanceOng: true,
    txSliceCount: 10,
    t,
  })
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('useWalletTransactions', () => {
  it('showTxDetail opens the transaction explorer url', () => {
    setup().showTxDetail('hash')
    expect(mocks.getWalletTransactionExplorerUrl).toHaveBeenCalledWith({
      txHash: 'hash',
      network: 'MAIN_NET',
    })
    expect(mocks.openExternalUrl).toHaveBeenCalledWith('https://explorer/tx')
  })

  it('checkMoreTx opens the address explorer url', () => {
    setup().checkMoreTx()
    expect(mocks.openExternalUrl).toHaveBeenCalledWith('https://explorer/address')
  })

  it('getTransactions returns false when no address is set', async () => {
    const { getTransactions, completedTx } = setup('')
    expect(await getTransactions()).toBe(false)
    expect(completedTx.value).toEqual([])
    expect(mocks.loadWalletTransactions).not.toHaveBeenCalled()
  })

  it('getTransactions stores transactions on success', async () => {
    const txs = [{ txHash: 'h', asset: 'ONT', amount: '1' }]
    mocks.loadWalletTransactions.mockResolvedValue({ ok: true, transactions: txs })
    const { getTransactions, completedTx } = setup()

    expect(await getTransactions()).toBe(txs)
    expect(completedTx.value).toEqual(txs)
  })

  it('getTransactions notifies an error and returns false on failure', async () => {
    mocks.loadWalletTransactions.mockResolvedValue({ ok: false })
    const { getTransactions } = setup()

    expect(await getTransactions()).toBe(false)
    expect(mocks.notifyError).toHaveBeenCalledWith('dashboard.getTransErr', { literal: true })
  })
})
