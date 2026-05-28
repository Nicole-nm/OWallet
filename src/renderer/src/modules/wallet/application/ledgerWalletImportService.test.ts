import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deriveAddressFromPublicKey: vi.fn(),
  findByPublicKeys: vi.fn(),
  persistWallet: vi.fn(),
  refreshWalletCollections: vi.fn(),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  deriveAddressFromPublicKey: mocks.deriveAddressFromPublicKey,
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  findByPublicKeys: mocks.findByPublicKeys,
}))

vi.mock('./walletPersistenceService', () => ({
  persistWallet: mocks.persistWallet,
  refreshWalletCollections: mocks.refreshWalletCollections,
}))

import {
  buildLedgerWalletAccount,
  buildLedgerWalletLabel,
  importLedgerWalletSelections,
} from './ledgerWalletImportService'

describe('ledgerWalletImportService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.deriveAddressFromPublicKey.mockImplementation(async (publicKey) => `address:${publicKey}`)
    mocks.findByPublicKeys.mockResolvedValue([])
    mocks.persistWallet.mockResolvedValue({ ok: true, inserted: true, status: 'inserted' })
    mocks.refreshWalletCollections.mockResolvedValue({
      ok: true,
      collections: {
        normalWallets: [] as unknown[],
        sharedWallets: [] as unknown[],
        hardwareWallets: [{ address: 'address:pk-1' }, { address: 'address:pk-3' }],
      },
    })
    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)
  })

  it('builds ledger wallet account metadata from a public key selection', async () => {
    await expect(
      buildLedgerWalletAccount({ publicKey: 'pk-1', neo: true, acct: 7 })
    ).resolves.toEqual({
      publicKey: 'pk-1',
      address: 'address:pk-1',
      neo: true,
      acct: 7,
      timestamp: 1700000000000,
    })
  })

  it('formats labels with account suffixes and neo compatibility marker', () => {
    expect(buildLedgerWalletLabel({ label: 'Ledger', neo: false, acct: 2 })).toBe('Ledger-2')
    expect(buildLedgerWalletLabel({ label: 'Ledger', neo: true, acct: 5 })).toBe(
      'Ledger-Compatible NEO-5'
    )
  })

  it('skips duplicates, persists new selections in account order, and refreshes once', async () => {
    mocks.findByPublicKeys.mockResolvedValue([{ publicKey: 'pk-2' }])

    const result = await importLedgerWalletSelections({
      label: 'Ledger',
      neo: false,
      selections: [
        { publicKey: 'pk-3', acct: 3 },
        { publicKey: 'pk-1', acct: 1 },
        { publicKey: 'pk-2', acct: 2 },
      ],
    })

    expect(mocks.persistWallet).toHaveBeenCalledTimes(2)
    expect(mocks.persistWallet).toHaveBeenNthCalledWith(
      1,
      'HardwareWallet',
      {
        publicKey: 'pk-1',
        address: 'address:pk-1',
        neo: false,
        acct: 1,
        timestamp: 1700000000000,
        label: 'Ledger-1',
      },
      { refresh: false }
    )
    expect(mocks.persistWallet).toHaveBeenNthCalledWith(
      2,
      'HardwareWallet',
      {
        publicKey: 'pk-3',
        address: 'address:pk-3',
        neo: false,
        acct: 3,
        timestamp: 1700000000000,
        label: 'Ledger-3',
      },
      { refresh: false }
    )
    expect(mocks.refreshWalletCollections).toHaveBeenCalledTimes(1)
    expect(result).toEqual({
      ok: true,
      insertedAccounts: [
        {
          publicKey: 'pk-1',
          address: 'address:pk-1',
          neo: false,
          acct: 1,
          timestamp: 1700000000000,
          label: 'Ledger-1',
        },
        {
          publicKey: 'pk-3',
          address: 'address:pk-3',
          neo: false,
          acct: 3,
          timestamp: 1700000000000,
          label: 'Ledger-3',
        },
      ],
      duplicateCount: 1,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [] as unknown[],
          hardwareWallets: [{ address: 'address:pk-1' }, { address: 'address:pk-3' }],
        },
      },
    })
  })
})
