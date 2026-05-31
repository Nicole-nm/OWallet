import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadOntologySdk: vi.fn(),
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
  GAS_LIMIT_HIGH: '200000',
  DEFAULT_SCRYPT: { cost: 16384, blockSize: 8, parallel: 8, size: 64 },
  LEDGER_GAS_PRICE: '2500',
  NETWORKS: { TEST_NET: 'TEST_NET', MAIN_NET: 'MAIN_NET' },
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: unknown[]) =>
    mocks.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: unknown[]) => mocks.legacySignWithLedger(...args),
}))

import {
  buildCancelTopicTx,
  buildCreateTopicTx,
  buildVoteTx,
  getContractHashFallback,
  getOldContractHash,
  handleSignTx,
} from './voteTransactionBuilder'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'

class FakeAddress {
  constructor(public value: string) {}
}
class FakePublicKey {
  constructor(public hex: string) {}
}
class FakeParameter {
  constructor(
    public name: string,
    public type: unknown,
    public value: unknown
  ) {}
}

function fakeBuilderSdk(extra: Record<string, unknown> = {}) {
  return {
    TransactionBuilder: {
      signTransaction: vi.fn(),
      makeWasmVmInvokeTransaction: vi.fn(
        (
          fn: string,
          params: unknown[],
          contract: unknown,
          gp: string,
          gl: string,
          payer: unknown
        ) =>
          createFakeTransaction({
            fn,
            params,
            contract,
            gp,
            gl,
            payer,
          })
      ),
    },
    Crypto: { Address: FakeAddress, PublicKey: FakePublicKey, PrivateKey: class {} },
    utils: { reverseHex: (h: string) => `rev:${h}` },
    Parameter: FakeParameter,
    ParameterType: {
      H256: 'H256',
      Address: 'Address',
      Boolean: 'Boolean',
      String: 'String',
      Integer: 'Integer',
    },
    TxSignature: class {
      M = 0
      pubKeys: unknown[] = []
      sigData: string[] = []
    },
    ...extra,
  }
}

describe('voteTransactionBuilder contract-hash getters', () => {
  it('returns the new mainnet hash and empty for unknown networks', () => {
    expect(getContractHashFallback('MAIN_NET')).toBe('c0df752ca786a99755b2e8950060ade9fa3d4e1b')
    expect(getContractHashFallback('UNKNOWN')).toBe('')
  })

  it('returns the old testnet hash and empty for unknown networks', () => {
    expect(getOldContractHash('TEST_NET')).toBe('a088ae3b508794e666ab649d890213e66e0c3a2e')
    expect(getOldContractHash('UNKNOWN')).toBe('')
  })
})

describe('voteTransactionBuilder.handleSignTx() software path', () => {
  beforeEach(() => vi.clearAllMocks())

  it('decrypts the key and signs for a common wallet', async () => {
    const decrypt = vi.fn(() => 'decrypted-pri')
    const signTransaction = vi.fn()
    mocks.loadOntologySdk.mockResolvedValue({
      TransactionBuilder: { signTransaction },
      Crypto: {
        PrivateKey: class {
          constructor(public key: string) {}
          decrypt = decrypt
        },
        Address: FakeAddress,
        PublicKey: FakePublicKey,
      },
      TxSignature: class {},
    })

    const tx = createFakeTransaction({})
    const result = await handleSignTx(
      tx as unknown,
      { address: 'AQ', key: 'enc-key', salt: 'salt' },
      'pwd'
    )

    expect(result).toBe(tx)
    expect(decrypt).toHaveBeenCalled()
    expect(signTransaction).toHaveBeenCalledWith(tx, 'decrypted-pri')
  })

  it('throws when the ledger public key is missing', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    await expect(
      handleSignTx(
        createFakeTransaction({}) as unknown,
        { address: 'AQ' },
        undefined,
        'ledgerWallet'
      )
    ).rejects.toThrow('Ledger public key is unavailable')
  })

  it('throws when the ledger account index is invalid', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    await expect(
      handleSignTx(
        createFakeTransaction({}) as unknown,
        { address: 'AQ', publicKey: 'pk', acct: -1 },
        undefined,
        'ledgerWallet'
      )
    ).rejects.toThrow('Ledger account index is invalid')
  })

  it('throws when the transaction gas price is unavailable', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    const tx = createFakeTransaction({ serializeUnsignedData: vi.fn(() => 'data') })
    ;(tx as unknown as { gasPrice?: unknown }).gasPrice = undefined
    await expect(
      handleSignTx(
        tx as unknown,
        { address: 'AQ', publicKey: 'pk', acct: 0, neo: 1 },
        undefined,
        'ledgerWallet'
      )
    ).rejects.toThrow('Transaction gas price is unavailable')
  })
})

describe('voteTransactionBuilder build* functions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('builds a voteTopic transaction with reversed contract hash and params', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    const tx = (await buildVoteTx('hash', 'topic', 'AQ', true)) as unknown as {
      fn: string
      params: unknown[]
      contract: FakeAddress
    }
    expect(tx.fn).toBe('voteTopic')
    expect(tx.contract.value).toBe('rev:hash')
    expect(tx.params).toHaveLength(3)
  })

  it('builds a cancelTopic transaction', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    const tx = (await buildCancelTopicTx('hash', 'topic', 'AQ')) as unknown as {
      fn: string
      params: unknown[]
    }
    expect(tx.fn).toBe('cancelTopic')
    expect(tx.params).toHaveLength(1)
  })

  it('builds a createTopic transaction with all vote fields', async () => {
    mocks.loadOntologySdk.mockResolvedValue(fakeBuilderSdk())
    const tx = (await buildCreateTopicTx('hash', 'AQ', {
      title: 't',
      content: 'c',
      startTime: 1,
      endTime: 2,
    })) as unknown as { fn: string; params: unknown[] }
    expect(tx.fn).toBe('createTopic')
    expect(tx.params).toHaveLength(5)
  })
})
