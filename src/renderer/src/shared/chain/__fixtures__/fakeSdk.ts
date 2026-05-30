import { vi } from 'vitest'
import type { CommonWallet } from '../../lib/types'
import type { SdkTransactionLike } from '../types'

export class FakePublicKey {
  constructor(public hex: string) {}
  serializeHex() {
    return this.hex
  }
}

export class FakeAddress {
  constructor(public addr: string) {}
  serialize() {
    return this.addr
  }
}

export class FakeTxSignature {
  M = 0
  pubKeys: FakePublicKey[] = []
  sigData: string[] = []
}

export interface FakePrivateKey {
  sign: ReturnType<typeof vi.fn>
  algorithm: { defaultSchema: string }
  getPublicKey: ReturnType<typeof vi.fn>
}

export function createFakePrivateKey(
  opts: { signatureHex?: string; publicKeyHex?: string } = {}
): FakePrivateKey {
  const signatureHex = opts.signatureHex ?? 'sig-hex-data'
  const publicKeyHex = opts.publicKeyHex ?? 'pubkey-hex'
  return {
    sign: vi.fn(() => ({ serializeHex: () => signatureHex })),
    algorithm: { defaultSchema: 'SHA256withECDSA' },
    getPublicKey: vi.fn(() => ({ serializeHex: () => publicKeyHex })),
  }
}

export function createFakeOntologySdk() {
  return {
    Crypto: {
      PublicKey: FakePublicKey,
      Address: FakeAddress,
    },
    TxSignature: FakeTxSignature,
    TransactionBuilder: {
      signTx: vi.fn(),
    },
  }
}

export function createFakeTransaction(
  overrides: Partial<SdkTransactionLike> = {}
): SdkTransactionLike {
  return {
    payer: undefined as unknown,
    gasPrice: {
      constructor: class {
        constructor(public val: string | number) {}
      },
    } as SdkTransactionLike['gasPrice'],
    sigs: [],
    payload: {},
    serializeUnsignedData: vi.fn(() => new Uint8Array([1, 2, 3])),
    serialize: vi.fn(() => 'serialized'),
    getHash: vi.fn(() => 'deadbeef'),
    ...overrides,
  }
}

export function createFakeEncryptedWallet(overrides: Partial<CommonWallet> = {}): CommonWallet {
  return {
    address: 'AQ1234567890',
    label: 'Wallet',
    publicKey: 'pubkey-hex',
    key: 'encrypted-key',
    salt: 'salt-hex',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: {},
    ...overrides,
  }
}
