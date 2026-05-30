import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Identity } from '../../shared/lib/types'

const mocks = vi.hoisted(() => ({
  loadOntologySdk: vi.fn(),
  formatScryptParams: vi.fn(),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/lib/scryptParams', () => ({
  formatScryptParams: (...args: unknown[]) => mocks.formatScryptParams(...args),
}))

import { validateIdentityPassword, buildIdentityKeystore } from './detailService'

function makeIdentity(overrides: Partial<Identity> = {}): Identity {
  return {
    ontid: 'did:ont:abc',
    label: 'Alice',
    controls: [
      {
        key: 'encrypted-key',
        salt: 'salt-hex',
        address: 'AAddress',
      },
    ],
    scrypt: { n: 4096, p: 8, r: 8, dkLen: 64 },
    ...overrides,
  }
}

describe('identity/detailService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('validateIdentityPassword', () => {
    it('returns true when the encrypted key successfully decrypts with the password', async () => {
      const decrypt = vi.fn().mockReturnValue('decrypted')
      mocks.loadOntologySdk.mockResolvedValue({
        Crypto: {
          PrivateKey: class {
            decrypt = decrypt
            constructor(public encrypted: string) {}
          },
          Address: class {
            constructor(public addr: string) {}
          },
        },
      })
      mocks.formatScryptParams.mockReturnValue({ cost: 4096, blockSize: 8, parallel: 8, size: 64 })

      const result = await validateIdentityPassword(makeIdentity(), 'correct-password')

      expect(result).toBe(true)
      expect(decrypt).toHaveBeenCalled()
    })

    it('returns false when decryption throws (wrong password)', async () => {
      const decrypt = vi.fn(() => {
        throw new Error('wrong password')
      })
      mocks.loadOntologySdk.mockResolvedValue({
        Crypto: {
          PrivateKey: class {
            decrypt = decrypt
            constructor(public encrypted: string) {}
          },
          Address: class {
            constructor(public addr: string) {}
          },
        },
      })
      mocks.formatScryptParams.mockReturnValue({ cost: 4096, blockSize: 8, parallel: 8, size: 64 })

      const result = await validateIdentityPassword(makeIdentity(), 'wrong')

      expect(result).toBe(false)
    })

    it('returns false when the identity has no controls', async () => {
      const result = await validateIdentityPassword(makeIdentity({ controls: [] }), 'pw')

      expect(result).toBe(false)
      // SDK shouldn't even be loaded when there's nothing to decrypt
      expect(mocks.loadOntologySdk).not.toHaveBeenCalled()
    })
  })

  describe('buildIdentityKeystore', () => {
    it('serializes the first control into the OWallet keystore JSON shape', () => {
      const json = buildIdentityKeystore(makeIdentity())
      const parsed = JSON.parse(json as string)

      expect(parsed).toEqual({
        type: 'I',
        label: 'Alice',
        algorithm: 'ECDSA',
        scrypt: { n: 4096, p: 8, r: 8, dkLen: 64 },
        key: 'encrypted-key',
        salt: 'salt-hex',
        address: 'AAddress',
        parameters: { curve: 'secp256r1' },
      })
    })

    it('falls back to default scrypt params when the identity has none', () => {
      const json = buildIdentityKeystore(makeIdentity({ scrypt: undefined }))
      const parsed = JSON.parse(json as string)

      expect(parsed.scrypt).toEqual({ n: 4096, p: 8, r: 8, dkLen: 64 })
    })

    it('returns an empty string when the identity has no controls', () => {
      const json = buildIdentityKeystore(makeIdentity({ controls: [] }))

      expect(json).toBe('')
    })
  })
})
