import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  walletService: {
    removeIdentity: vi.fn(),
  },
  identityDetailService: {
    buildIdentityKeystore: vi.fn(),
    validateIdentityPassword: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  removeIdentity: (...args: unknown[]) => mocks.walletService.removeIdentity(...args),
}))

vi.mock('../../../domains/identity/detailService', () => ({
  buildIdentityKeystore: (...args: unknown[]) =>
    mocks.identityDetailService.buildIdentityKeystore(...args),
  validateIdentityPassword: (...args: unknown[]) =>
    mocks.identityDetailService.validateIdentityPassword(...args),
}))

import {
  deleteStoredIdentity,
  exportIdentityKeystore,
  validateStoredIdentityPassword,
} from './identityDetailApplicationService'

describe('identityDetailApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports keystore text through the identity detail domain', () => {
    const identity = { ontid: 'did:ont:alice' }
    mocks.identityDetailService.buildIdentityKeystore.mockReturnValue('keystore-text')

    expect(exportIdentityKeystore(identity)).toEqual({
      ok: true,
      keystore: 'keystore-text',
    })
    expect(mocks.identityDetailService.buildIdentityKeystore).toHaveBeenCalledWith(identity)
  })

  it('validates passwords and deletes stored identities through domain services', async () => {
    const identity = { ontid: 'did:ont:alice' }
    mocks.identityDetailService.validateIdentityPassword.mockResolvedValue(true)
    mocks.walletService.removeIdentity.mockResolvedValue(undefined)

    await expect(validateStoredIdentityPassword(identity, 'secret123')).resolves.toEqual({
      ok: true,
      valid: true,
    })
    await expect(deleteStoredIdentity(identity.ontid)).resolves.toEqual({
      ok: true,
      ontid: 'did:ont:alice',
    })
    expect(mocks.walletService.removeIdentity).toHaveBeenCalledWith('did:ont:alice')
  })
})
