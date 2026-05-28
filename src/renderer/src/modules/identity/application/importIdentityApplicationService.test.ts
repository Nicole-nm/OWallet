import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  identityService: {
    importIdentityFromSerializedKeystore: vi.fn(),
    verifyIdentityExistsOnChain: vi.fn(),
  },
  walletService: {
    insertIdentity: vi.fn(),
  },
}))

vi.mock('../../../domains/identity/applicationService', () => ({
  importIdentityFromSerializedKeystore: (...args: unknown[]) =>
    mocks.identityService.importIdentityFromSerializedKeystore(...args),
  verifyIdentityExistsOnChain: (...args: unknown[]) =>
    mocks.identityService.verifyIdentityExistsOnChain(...args),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  insertIdentity: (...args: unknown[]) => mocks.walletService.insertIdentity(...args),
}))

import {
  importIdentityFromKeystore,
  validateImportedIdentityKeystore,
} from './importIdentityApplicationService'

describe('importIdentityApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates imported identity keystores', () => {
    expect(validateImportedIdentityKeystore({ key: 'k', address: 'a', salt: 's' })).toBe(true)
    expect(validateImportedIdentityKeystore({ key: 'k', address: 'a' })).toBe(false)
  })

  it('rejects invalid keystore payloads', async () => {
    await expect(
      importIdentityFromKeystore({
        keystoreText: '{"invalid":true}',
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importIdentity.invalidKeystore',
    })
  })

  it('maps import password failures', async () => {
    mocks.identityService.importIdentityFromSerializedKeystore.mockRejectedValue(
      new Error('bad password')
    )

    await expect(
      importIdentityFromKeystore({
        keystoreText: JSON.stringify({ key: 'k', address: 'a', salt: 's' }),
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importIdentity.passError',
    })
  })

  it('rejects identities that do not exist on-chain', async () => {
    mocks.identityService.importIdentityFromSerializedKeystore.mockResolvedValue({
      ontid: 'did:ont:alice',
    })
    mocks.identityService.verifyIdentityExistsOnChain.mockResolvedValue(false)

    await expect(
      importIdentityFromKeystore({
        keystoreText: JSON.stringify({ key: 'k', address: 'a', salt: 's' }),
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importIdentity.ontidNotExist',
    })
  })

  it('persists imported identities locally', async () => {
    const identity = { ontid: 'did:ont:alice', controls: [] as unknown[] }
    mocks.identityService.importIdentityFromSerializedKeystore.mockResolvedValue(identity)
    mocks.identityService.verifyIdentityExistsOnChain.mockResolvedValue(true)
    mocks.walletService.insertIdentity.mockResolvedValue({ ok: true })

    await expect(
      importIdentityFromKeystore({
        keystoreText: JSON.stringify({ key: 'k', address: 'a', salt: 's' }),
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: true,
      identity,
    })

    expect(mocks.walletService.insertIdentity).toHaveBeenCalledWith({
      type: 'Identity',
      address: 'did:ont:alice',
      wallet: identity,
    })
  })

  it('maps duplicate identities to ontidExist', async () => {
    mocks.identityService.importIdentityFromSerializedKeystore.mockResolvedValue({
      ontid: 'did:ont:alice',
    })
    mocks.identityService.verifyIdentityExistsOnChain.mockResolvedValue(true)
    mocks.walletService.insertIdentity.mockRejectedValue(new Error('duplicate'))

    await expect(
      importIdentityFromKeystore({
        keystoreText: JSON.stringify({ key: 'k', address: 'a', salt: 's' }),
        password: 'secret123',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'importIdentity.ontidExist',
      duplicate: true,
    })
  })
})
