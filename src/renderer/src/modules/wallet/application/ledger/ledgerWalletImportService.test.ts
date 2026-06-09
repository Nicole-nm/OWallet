import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  deriveAddressFromPublicKey: vi.fn(),
  findByPublicKeys: vi.fn(),
  persistWallet: vi.fn(),
  refreshWalletCollections: vi.fn(),
}))

vi.mock('../../../../shared/chain/walletSdk', () => ({
  deriveAddressFromPublicKey: mocks.deriveAddressFromPublicKey,
}))

vi.mock('../../../../domains/wallet/walletDomainService', () => ({
  findByPublicKeys: mocks.findByPublicKeys,
}))

vi.mock('../persistence/walletPersistenceService', () => ({
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

  it('defaults neo to false and acct to 0 when buildLedgerWalletAccount omits them', async () => {
    await expect(buildLedgerWalletAccount({ publicKey: 'pk-9', acct: 0 })).resolves.toEqual({
      publicKey: 'pk-9',
      address: 'address:pk-9',
      neo: false,
      acct: 0,
      timestamp: 1700000000000,
    })
  })

  it('treats missing neo as false when buildLedgerWalletLabel omits it', () => {
    expect(buildLedgerWalletLabel({ label: 'Ledger', acct: 1 })).toBe('Ledger-1')
  })

  it('returns ok with no inserts and null collectionsResult when all selections are duplicates', async () => {
    mocks.findByPublicKeys.mockResolvedValue([{ publicKey: 'pk-1' }])

    const result = await importLedgerWalletSelections({
      selections: [{ publicKey: 'pk-1', acct: 1 }],
    })

    expect(result).toMatchObject({
      ok: true,
      insertedAccounts: [],
      duplicateCount: 1,
      collectionsResult: null,
    })
    expect(mocks.persistWallet).not.toHaveBeenCalled()
    expect(mocks.refreshWalletCollections).not.toHaveBeenCalled()
  })

  it('counts duplicates returned by persistWallet without aborting the import', async () => {
    mocks.persistWallet
      .mockResolvedValueOnce({ ok: true, inserted: true })
      .mockResolvedValueOnce({ ok: false, duplicate: true })

    const result = await importLedgerWalletSelections({
      selections: [
        { publicKey: 'pk-1', acct: 1 },
        { publicKey: 'pk-2', acct: 2 },
      ],
    })

    expect(result.ok).toBe(true)
    expect(result.insertedAccounts).toHaveLength(1)
    expect(result.duplicateCount).toBe(1)
  })

  it('surfaces persistWallet failures with their errorKey', async () => {
    mocks.persistWallet.mockResolvedValueOnce({ ok: false, errorKey: 'common.savedbFailed' })
    const result = await importLedgerWalletSelections({
      selections: [{ publicKey: 'pk-1', acct: 1 }],
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.savedbFailed' })
  })

  it('falls back to the default errorKey when persistWallet fails without one', async () => {
    mocks.persistWallet.mockResolvedValueOnce({ ok: false })
    const result = await importLedgerWalletSelections({
      selections: [{ publicKey: 'pk-1', acct: 1 }],
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.savedbFailed' })
  })

  it('catches and reports unexpected exceptions during import', async () => {
    mocks.findByPublicKeys.mockRejectedValue(new Error('db is down'))
    const result = await importLedgerWalletSelections({
      selections: [{ publicKey: 'pk-1', acct: 1 }],
    })
    expect(result).toMatchObject({
      ok: false,
      errorKey: 'common.savedbFailed',
      insertedAccounts: [],
      duplicateCount: 0,
      collectionsResult: null,
    })
  })

  it('ignores selections without a publicKey', async () => {
    const result = await importLedgerWalletSelections({
      selections: [null, undefined, { publicKey: '' }, { publicKey: 'pk-x', acct: 4 }],
    })
    expect(mocks.persistWallet).toHaveBeenCalledTimes(1)
    expect(result.ok).toBe(true)
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
