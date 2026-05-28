import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  importService: {
    createPrivateKeyFromHexString: vi.fn(),
    createPrivateKeyFromWifString: vi.fn(),
    createWalletAccountFromPrivateKey: vi.fn(),
    decryptImportedWallet: vi.fn(),
    importWalletAccountFromMnemonic: vi.fn(),
  },
  createJsonWalletService: {
    buildJsonWalletDraftFromPrivateKey: vi.fn(),
  },
  walletPersistenceService: {
    persistWallet: vi.fn(),
    refreshWalletCollections: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/importService', () => ({
  createPrivateKeyFromHexString: (...args: any[]) =>
    mocks.importService.createPrivateKeyFromHexString(...args),
  createPrivateKeyFromWifString: (...args: any[]) =>
    mocks.importService.createPrivateKeyFromWifString(...args),
  createWalletAccountFromPrivateKey: (...args: any[]) =>
    mocks.importService.createWalletAccountFromPrivateKey(...args),
  decryptImportedWallet: (...args: any[]) => mocks.importService.decryptImportedWallet(...args),
  importWalletAccountFromMnemonic: (...args: any[]) =>
    mocks.importService.importWalletAccountFromMnemonic(...args),
}))

vi.mock('./createJsonWalletApplicationService', () => ({
  buildJsonWalletDraftFromPrivateKey: (...args: any[]) =>
    mocks.createJsonWalletService.buildJsonWalletDraftFromPrivateKey(...args),
}))

vi.mock('./walletPersistenceService', () => ({
  persistWallet: (...args: any[]) => mocks.walletPersistenceService.persistWallet(...args),
  refreshWalletCollections: (...args: any[]) =>
    mocks.walletPersistenceService.refreshWalletCollections(...args),
}))

import {
  buildImportedJsonWalletDraftFromMnemonic,
  buildImportedJsonWalletDraftFromPrivateKeyHex,
  buildImportedJsonWalletDraftFromWif,
  importDatWalletAccounts,
  parseImportedDatWallet,
  persistImportedJsonWallet,
  validateImportedDatWallet,
} from './importJsonWalletApplicationService'

describe('importJsonWalletApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates imported dat wallet payloads', () => {
    expect(
      validateImportedDatWallet({
        scrypt: { n: 16384 },
        accounts: [{ key: 'k', address: 'a', salt: 's' }],
      })
    ).toEqual({
      ok: true,
      wallet: {
        scrypt: { n: 16384 },
        accounts: [{ key: 'k', address: 'a', salt: 's' }],
      },
    })

    expect(parseImportedDatWallet('{"accounts":[]}')).toEqual({
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    })
  })

  it('rejects invalid private-key hex imports', async () => {
    await expect(
      buildImportedJsonWalletDraftFromPrivateKeyHex({
        label: 'Alice',
        privateKeyHex: 'not-hex',
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importJsonWallet.invalidPrivateKey',
    })
  })

  it('maps invalid wif imports', async () => {
    mocks.importService.createPrivateKeyFromWifString.mockRejectedValue(new Error('bad wif'))

    await expect(
      buildImportedJsonWalletDraftFromWif({
        label: 'Alice',
        wif: 'bad-wif',
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'basicInfo.errWif',
    })
  })

  it('imports mnemonic-based wallets', async () => {
    const account = { address: 'AQ123', label: 'Alice' }
    mocks.importService.importWalletAccountFromMnemonic.mockResolvedValue(account)

    await expect(
      buildImportedJsonWalletDraftFromMnemonic({
        label: 'Alice',
        mnemonic: 'alpha beta gamma',
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: true,
      account,
    })
  })

  it('persists imported wallets as default common wallets', async () => {
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      ok: true,
      inserted: true,
      status: 'inserted',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123', label: 'Alice', isDefault: true }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    await expect(
      persistImportedJsonWallet({
        address: 'AQ123',
        label: 'Alice',
      })
    ).resolves.toEqual({
      ok: true,
      inserted: true,
      status: 'inserted',
      account: {
        address: 'AQ123',
        label: 'Alice',
        isDefault: true,
      },
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123', label: 'Alice', isDefault: true }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    expect(mocks.walletPersistenceService.persistWallet).toHaveBeenCalledWith(
      'CommonWallet',
      {
        address: 'AQ123',
        label: 'Alice',
        isDefault: true,
      },
      {}
    )
  })

  it('imports dat wallet accounts in batch and refreshes once', async () => {
    mocks.importService.decryptImportedWallet
      .mockResolvedValueOnce({ id: 'pk-1' })
      .mockResolvedValueOnce({ id: 'pk-2' })
    mocks.walletPersistenceService.persistWallet
      .mockResolvedValueOnce({ ok: true, inserted: true, status: 'inserted' })
      .mockResolvedValueOnce({ ok: false, duplicate: true, status: 'duplicate' })
    mocks.walletPersistenceService.refreshWalletCollections.mockResolvedValue({
      ok: true,
      collections: {
        normalWallets: [{ address: 'AQ111' }],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
    })

    await expect(
      importDatWalletAccounts({
        datWallet: {
          scrypt: { n: 16384, p: 8, r: 8 },
          accounts: [],
        },
        entries: [
          {
            label: 'Alice',
            password: 'secret123',
            sourceAccount: { key: 'k1', address: 'AQ111', salt: 's1' },
          },
          {
            label: 'Bob',
            password: 'secret123',
            sourceAccount: { key: 'k2', address: 'AQ222', salt: 's2' },
          },
        ],
      })
    ).resolves.toEqual({
      ok: true,
      insertedCount: 1,
      duplicateCount: 1,
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ111' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    expect(mocks.walletPersistenceService.refreshWalletCollections).toHaveBeenCalledTimes(1)
  })
})
