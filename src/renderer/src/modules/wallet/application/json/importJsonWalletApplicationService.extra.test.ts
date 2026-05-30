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

vi.mock('../../../../domains/wallet/importService', () => ({
  createPrivateKeyFromHexString: (...a: unknown[]) =>
    mocks.importService.createPrivateKeyFromHexString(...a),
  createPrivateKeyFromWifString: (...a: unknown[]) =>
    mocks.importService.createPrivateKeyFromWifString(...a),
  createWalletAccountFromPrivateKey: (...a: unknown[]) =>
    mocks.importService.createWalletAccountFromPrivateKey(...a),
  decryptImportedWallet: (...a: unknown[]) => mocks.importService.decryptImportedWallet(...a),
  importWalletAccountFromMnemonic: (...a: unknown[]) =>
    mocks.importService.importWalletAccountFromMnemonic(...a),
}))

vi.mock('./createJsonWalletApplicationService', () => ({
  buildJsonWalletDraftFromPrivateKey: (...a: unknown[]) =>
    mocks.createJsonWalletService.buildJsonWalletDraftFromPrivateKey(...a),
}))

vi.mock('../persistence/walletPersistenceService', () => ({
  persistWallet: (...a: unknown[]) => mocks.walletPersistenceService.persistWallet(...a),
  refreshWalletCollections: (...a: unknown[]) =>
    mocks.walletPersistenceService.refreshWalletCollections(...a),
}))

import {
  importDatWalletAccounts,
  validateImportedDatWallet,
} from './importJsonWalletApplicationService'

const account = { key: 'k', address: 'AQ1', salt: 's' }

beforeEach(() => {
  vi.clearAllMocks()
})

describe('validateImportedDatWallet edge cases', () => {
  it('rejects a null wallet', () => {
    expect(validateImportedDatWallet(null)).toEqual({
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    })
  })

  it('drops accounts missing required fields but keeps valid ones', () => {
    const result = validateImportedDatWallet({
      scrypt: { n: 16384 },
      accounts: [account, { key: 'x' }],
    } as never)
    expect(result.ok).toBe(true)
    expect((result as { wallet: { accounts: unknown[] } }).wallet.accounts).toEqual([account])
  })

  it('rejects when no account has the required fields', () => {
    expect(
      validateImportedDatWallet({ scrypt: { n: 16384 }, accounts: [{ key: 'x' }] } as never)
    ).toEqual({ ok: false, errorKey: 'importJsonWallet.invalidDatFile' })
  })
})

describe('importDatWalletAccounts', () => {
  const datWallet = { scrypt: { n: 16384 }, accounts: [account] } as never

  it('skips incomplete entries and reports no inserts', async () => {
    const result = await importDatWalletAccounts({
      datWallet,
      entries: [{ label: '', password: 'p', sourceAccount: account } as never],
    })
    expect(result).toMatchObject({ ok: false, insertedCount: 0, collectionsResult: null })
    expect(mocks.importService.decryptImportedWallet).not.toHaveBeenCalled()
  })

  it('skips entries that fail to decrypt', async () => {
    mocks.importService.decryptImportedWallet.mockResolvedValue(null)
    const result = await importDatWalletAccounts({
      datWallet,
      entries: [{ label: 'L', password: 'p', sourceAccount: account } as never],
    })
    expect(result).toMatchObject({ ok: false, insertedCount: 0 })
  })

  it('counts duplicates without inserting', async () => {
    mocks.importService.decryptImportedWallet.mockResolvedValue('priv')
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      inserted: false,
      duplicate: true,
    })
    const result = await importDatWalletAccounts({
      datWallet,
      entries: [{ label: 'L', password: 'p', sourceAccount: account } as never],
    })
    expect(result).toMatchObject({ ok: false, insertedCount: 0, duplicateCount: 1 })
  })

  it('re-derives accounts for non-default scrypt and refreshes after inserts', async () => {
    mocks.importService.decryptImportedWallet.mockResolvedValue('priv')
    mocks.importService.createWalletAccountFromPrivateKey.mockResolvedValue({
      ...account,
      label: 'L',
    })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({ inserted: true })
    mocks.walletPersistenceService.refreshWalletCollections.mockResolvedValue(['c'])
    const result = await importDatWalletAccounts({
      datWallet: { scrypt: { n: 8192 }, accounts: [account] } as never,
      entries: [{ label: 'L', password: 'p', sourceAccount: account } as never],
    })
    expect(mocks.importService.createWalletAccountFromPrivateKey).toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, insertedCount: 1, collectionsResult: ['c'] })
  })

  it('continues past entries that throw during persistence', async () => {
    mocks.importService.decryptImportedWallet.mockResolvedValue('priv')
    mocks.walletPersistenceService.persistWallet.mockRejectedValue(new Error('boom'))
    const result = await importDatWalletAccounts({
      datWallet,
      entries: [{ label: 'L', password: 'p', sourceAccount: account } as never],
    })
    expect(result).toMatchObject({ ok: false, insertedCount: 0 })
  })
})
