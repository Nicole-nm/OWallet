import { vi } from 'vitest'
import type { SdkTransactionLike, SdkTxSignatureLike } from '../types'

/**
 * Build a multi-sig transaction fixture with a pre-populated `sigs[0]`
 * entry. Use for tests that exercise the shared-wallet append-signature path.
 */
export function createFakeMultiSigTransaction(opts: {
  threshold: number
  publicKeys: string[]
  existingSignatures?: string[]
  hash?: string
}): SdkTransactionLike {
  const sigEntry: SdkTxSignatureLike & { sigData: string[] } = {
    M: opts.threshold,
    pubKeys: opts.publicKeys.map((hex) => ({ serializeHex: () => hex })),
    sigData: opts.existingSignatures ?? [],
  }
  return {
    payer: undefined as unknown,
    gasPrice: {
      constructor: class {
        constructor(public val: string | number) {}
      },
    } as SdkTransactionLike['gasPrice'],
    sigs: [sigEntry],
    payload: {},
    serializeUnsignedData: vi.fn(() => new Uint8Array([1, 2, 3])),
    serialize: vi.fn(() => 'serialized'),
    getHash: vi.fn(() => opts.hash ?? 'tx-hash'),
  }
}
