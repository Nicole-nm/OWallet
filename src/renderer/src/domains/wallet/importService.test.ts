import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ decryptThrows: false }))

const sdk = vi.hoisted(() => {
  class FakePrivateKey {
    constructor(public key: string) {}
    static deserializeWIF = vi.fn((wif: string) => ({ wif }))
    decrypt() {
      if (state.decryptThrows) {
        throw new Error('bad password')
      }
      return { decrypted: true }
    }
  }
  class FakeAddress {
    constructor(public value: string) {}
  }
  return {
    loaded: {
      Crypto: { PrivateKey: FakePrivateKey, Address: FakeAddress },
      Account: {
        importWithMnemonic: vi.fn(() => ({ toJsonObj: () => ({ from: 'mnemonic' }) })),
        create: vi.fn(() => ({ toJsonObj: () => ({ from: 'privateKey' }) })),
      },
    },
  }
})

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: vi.fn(async () => sdk.loaded),
}))

import {
  createPrivateKeyFromHexString,
  createPrivateKeyFromWifString,
  createWalletAccountFromPrivateKey,
  decryptImportedWallet,
  importWalletAccountFromMnemonic,
} from './importService'

const scrypt = { n: 16384, r: 8, p: 8, dkLen: 64 }

beforeEach(() => {
  vi.clearAllMocks()
  state.decryptThrows = false
})

describe('importService', () => {
  it('creates a private key from a hex string', async () => {
    const pk = (await createPrivateKeyFromHexString('deadbeef')) as unknown as { key: string }
    expect(pk.key).toBe('deadbeef')
  })

  it('creates a private key from a WIF string', async () => {
    const pk = (await createPrivateKeyFromWifString('Kxxxx')) as unknown as { wif: string }
    expect(pk.wif).toBe('Kxxxx')
  })

  it('imports a wallet account from a mnemonic', async () => {
    const json = await importWalletAccountFromMnemonic('label', 'word word', 'pwd', scrypt)
    expect(json).toEqual({ from: 'mnemonic' })
  })

  it('decrypts an imported wallet and returns the key', async () => {
    const result = await decryptImportedWallet(
      { key: 'k', address: 'a', salt: 's' } as never,
      'pwd',
      scrypt
    )
    expect(result).toEqual({ decrypted: true })
  })

  it('returns null when decryption of an imported wallet fails', async () => {
    state.decryptThrows = true
    const result = await decryptImportedWallet(
      { key: 'k', address: 'a', salt: 's' } as never,
      'wrong',
      scrypt
    )
    expect(result).toBeNull()
  })

  it('creates a wallet account from a private key', async () => {
    const json = await createWalletAccountFromPrivateKey({}, 'pwd', 'label', scrypt)
    expect(json).toEqual({ from: 'privateKey' })
  })
})
