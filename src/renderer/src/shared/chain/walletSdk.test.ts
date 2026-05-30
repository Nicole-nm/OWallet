import { beforeEach, describe, expect, it, vi } from 'vitest'

const loadOntologySdk = vi.hoisted(() => vi.fn())

vi.mock('./loadOntologySdk', () => ({ loadOntologySdk }))

import {
  createMultiSigWalletAddress,
  createSdkAddress,
  deriveAddressFromPublicKey,
  generateWalletKeyPair,
  validateWalletAddress,
} from './walletSdk'

class FakeAddress {
  constructor(public base58: string) {}
  serialize() {
    if (this.base58 === 'invalid') throw new Error('bad address')
    return 'serialized'
  }
  toBase58() {
    return this.base58
  }
  static fromPubKey() {
    return new FakeAddress('derived')
  }
  static fromMultiPubKeys(required: number, keys: unknown[]) {
    return new FakeAddress(`multi-${required}-${keys.length}`)
  }
}

class FakePublicKey {
  constructor(public hex: string) {}
  serializeHex() {
    return this.hex
  }
}

class FakePrivateKey {
  static random() {
    return new FakePrivateKey()
  }
  serializeWIF() {
    return 'wif'
  }
  getPublicKey() {
    return new FakePublicKey('pub')
  }
}

const Crypto = {
  Address: FakeAddress,
  PublicKey: FakePublicKey,
  PrivateKey: FakePrivateKey,
}

beforeEach(() => {
  loadOntologySdk.mockReset()
  loadOntologySdk.mockResolvedValue({ Crypto })
})

describe('walletSdk', () => {
  it('creates an SDK address from a base58 string', async () => {
    const address = await createSdkAddress('Abc')
    expect((address as unknown as FakeAddress).toBase58()).toBe('Abc')
  })

  it('derives a base58 address from a public key', async () => {
    expect(await deriveAddressFromPublicKey('pub')).toBe('derived')
  })

  it('returns true for a serializable address', async () => {
    expect(await validateWalletAddress('Abc')).toBe(true)
  })

  it('returns false when address serialization throws', async () => {
    expect(await validateWalletAddress('invalid')).toBe(false)
  })

  it('generates a key pair with wif, public key and address', async () => {
    const result = await generateWalletKeyPair()
    expect(result).toMatchObject({ wif: 'wif', publicKey: 'pub', address: 'derived' })
  })

  it('builds a multi-sig address from public keys', async () => {
    expect(await createMultiSigWalletAddress(2, ['a', 'b', 'c'])).toBe('multi-2-3')
  })
})
