import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  jsonWalletService: {
    buildJsonWallet: vi.fn(),
  },
  detailService: {
    downloadWalletFile: vi.fn(),
    validateWalletWif: vi.fn(),
  },
  accountService: {
    generateWalletKeyPair: vi.fn(),
  },
  walletPersistenceService: {
    persistWallet: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/jsonWalletService', () => ({
  buildJsonWallet: (...args: unknown[]) => mocks.jsonWalletService.buildJsonWallet(...args),
}))

vi.mock('../../../domains/wallet/detailService', () => ({
  downloadWalletFile: (...args: unknown[]) => mocks.detailService.downloadWalletFile(...args),
  validateWalletWif: (...args: unknown[]) => mocks.detailService.validateWalletWif(...args),
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  generateWalletKeyPair: (...args: unknown[]) =>
    mocks.accountService.generateWalletKeyPair(...args),
}))

vi.mock('./walletPersistenceService', () => ({
  persistWallet: (...args: unknown[]) => mocks.walletPersistenceService.persistWallet(...args),
}))

import {
  buildJsonWalletDraftFromPrivateKey,
  createJsonWalletDraft,
  downloadCreatedJsonWallet,
  persistCreatedJsonWallet,
} from './createJsonWalletApplicationService'

describe('createJsonWalletApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('creates wallet drafts from a generated key pair', async () => {
    const privateKey = { id: 'pk-1' }
    mocks.accountService.generateWalletKeyPair.mockResolvedValue({ privateKey, wif: 'WIF-1' })
    mocks.jsonWalletService.buildJsonWallet.mockResolvedValue({
      label: 'Alice',
      account: { address: 'AQ123', publicKey: 'pub-1' },
      content: { name: 'Alice' },
      wif: 'WIF-1',
    })

    await expect(
      createJsonWalletDraft({
        label: 'Alice',
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: true,
      label: 'Alice',
      account: { address: 'AQ123', publicKey: 'pub-1' },
      content: { name: 'Alice' },
      wif: 'WIF-1',
    })

    expect(mocks.jsonWalletService.buildJsonWallet).toHaveBeenCalledWith({
      label: 'Alice',
      privateKey,
      password: 'secret123',
      wif: 'WIF-1',
    })
  })

  it('builds drafts directly from imported private keys', async () => {
    const privateKey = { id: 'pk-2' }
    mocks.jsonWalletService.buildJsonWallet.mockResolvedValue({
      label: 'Imported',
      account: { address: 'AQ999', publicKey: 'pub-9' },
      content: { name: 'Imported' },
      wif: undefined,
    })

    await expect(
      buildJsonWalletDraftFromPrivateKey({
        label: 'Imported',
        privateKey,
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: true,
      label: 'Imported',
      account: { address: 'AQ999', publicKey: 'pub-9' },
      content: { name: 'Imported' },
      wif: undefined,
    })
  })

  it('downloads created wallet backups', async () => {
    mocks.detailService.downloadWalletFile.mockResolvedValue(undefined)

    await expect(downloadCreatedJsonWallet({ address: 'AQ123' })).resolves.toEqual({ ok: true })
    expect(mocks.detailService.downloadWalletFile).toHaveBeenCalledWith({ address: 'AQ123' })
  })

  it('validates generated wif before persisting created wallets', async () => {
    mocks.detailService.validateWalletWif.mockResolvedValue(false)

    await expect(
      persistCreatedJsonWallet({
        account: { address: 'AQ123' },
        wif: 'WIF-1',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'createJsonWallet.createFail',
      reason: 'invalid_wif',
    })
  })

  it('persists created wallets through wallet persistence service', async () => {
    mocks.detailService.validateWalletWif.mockResolvedValue(true)
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      ok: true,
      inserted: true,
      status: 'inserted',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123', publicKey: 'pub-1' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    await expect(
      persistCreatedJsonWallet({
        account: { address: 'AQ123', publicKey: 'pub-1' },
        wif: 'WIF-1',
      })
    ).resolves.toEqual({
      ok: true,
      account: { address: 'AQ123', publicKey: 'pub-1' },
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [{ address: 'AQ123', publicKey: 'pub-1' }],
          sharedWallets: [] as unknown[],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    expect(mocks.walletPersistenceService.persistWallet).toHaveBeenCalledWith('CommonWallet', {
      address: 'AQ123',
      publicKey: 'pub-1',
    })
  })
})
