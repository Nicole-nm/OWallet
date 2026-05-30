import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ decryptThrows: false }))

const sdk = vi.hoisted(() => {
  class FakePrivateKey {
    constructor(public key: string) {}
    decrypt() {
      if (state.decryptThrows) {
        throw new Error('bad password')
      }
      return { key: 'decrypted' }
    }
  }
  class FakePublicKey {
    constructor(public key: string) {}
  }
  class FakeAddress {
    constructor(public value: string) {}
  }
  class FakeParameter {
    constructor(
      public name: string,
      public type: string,
      public value: unknown
    ) {}
  }
  class FakeTxSignature {
    M = 0
    pubKeys: unknown
    sigData: unknown
  }
  return {
    Crypto: { PrivateKey: FakePrivateKey, PublicKey: FakePublicKey, Address: FakeAddress },
    Parameter: FakeParameter,
    TxSignature: FakeTxSignature,
    Transaction: { deserialize: vi.fn((hex: string) => ({ hex })) },
    TransactionBuilder: {
      signTransaction: vi.fn(),
      addSign: vi.fn(),
      signTx: vi.fn(),
      makeInvokeTransaction: vi.fn(() => ({ tx: 'invoke' })),
    },
    OntAssetTxBuilder: { makeTransferTx: vi.fn(() => ({ tx: 'transfer' })) },
  }
})

vi.mock('./loadOntologySdk', () => ({
  loadOntologySdk: vi.fn(async () => sdk),
}))

import {
  addTransactionSign,
  createInvokeTransaction,
  createSdkParameter,
  createSdkPublicKey,
  createSdkTxSignature,
  deserializeTransaction,
  makeDummyTransferTx,
  signTransactionMultiSig,
  signTransactionWithPrivateKey,
  tryDecryptWallet,
} from './transactionSdk'

beforeEach(() => {
  vi.clearAllMocks()
  state.decryptThrows = false
})

describe('transactionSdk', () => {
  it('decrypts a wallet and returns the decrypted key', async () => {
    const result = await tryDecryptWallet({ key: 'k', address: 'a', salt: 's' }, 'pwd')
    expect(result).toEqual({ key: 'decrypted' })
  })

  it('returns null when decryption throws', async () => {
    state.decryptThrows = true
    const result = await tryDecryptWallet({ key: 'k', address: 'a', salt: 's' }, 'wrong')
    expect(result).toBeNull()
  })

  it('deserializes a transaction hex', async () => {
    expect(await deserializeTransaction('aabb')).toEqual({ hex: 'aabb' })
    expect(sdk.Transaction.deserialize).toHaveBeenCalledWith('aabb')
  })

  it('signs a transaction with a private key', async () => {
    await signTransactionWithPrivateKey({} as never, 'pk')
    expect(sdk.TransactionBuilder.signTransaction).toHaveBeenCalled()
  })

  it('adds a signature to a transaction', async () => {
    await addTransactionSign({} as never, 'pk')
    expect(sdk.TransactionBuilder.addSign).toHaveBeenCalled()
  })

  it('signs a multi-sig transaction normalizing string public keys', async () => {
    await signTransactionMultiSig({} as never, 2, ['pubKeyHex'], 'pk')
    const passedKeys = sdk.TransactionBuilder.signTx.mock.calls[0]?.[2] as unknown[]
    expect(passedKeys).toHaveLength(1)
    expect((passedKeys[0] as { key: string }).key).toBe('pubKeyHex')
  })

  it('creates an invoke transaction', async () => {
    const tx = await createInvokeTransaction('m', [], {} as never, 0, 0, {} as never)
    expect(tx).toEqual({ tx: 'invoke' })
  })

  it('creates an SDK parameter', async () => {
    const param = await createSdkParameter('n', 'String', 'v')
    expect(param).toMatchObject({ name: 'n', type: 'String', value: 'v' })
  })

  it('creates an SDK public key', async () => {
    const pk = await createSdkPublicKey('hex')
    expect((pk as { key: string }).key).toBe('hex')
  })

  it('creates a tx signature with normalized keys', async () => {
    const sig = await createSdkTxSignature(2, ['k1'], ['sig1'])
    expect(sig.M).toBe(2)
    expect(sig.sigData).toEqual(['sig1'])
  })

  it('builds a dummy transfer transaction', async () => {
    const tx = await makeDummyTransferTx({} as never, {} as never, 'ONT', 1)
    expect(tx).toEqual({ tx: 'transfer' })
  })
})
