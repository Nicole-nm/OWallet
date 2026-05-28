import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  loadOntologySdk: vi.fn(),
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
  GAS_LIMIT_HIGH: '200000',
  DEFAULT_SCRYPT: {
    cost: 16384,
    blockSize: 8,
    parallel: 8,
    size: 64,
  },
  LEDGER_GAS_PRICE: '2500',
  NETWORKS: {
    TEST_NET: 'TEST_NET',
    MAIN_NET: 'MAIN_NET',
  },
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: any[]) =>
    mocks.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: any[]) => mocks.legacySignWithLedger(...args),
}))

import { handleSignTx } from './voteTransactionBuilder'

function makeTx() {
  return {
    gasPrice: {
      constructor: class {
        constructor(public val: string) {}
      },
    },
    sigs: [] as unknown[],
    serializeUnsignedData: vi.fn(() => 'vote-unsigned-data'),
  }
}

describe('voteTransactionBuilder.handleSignTx()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('uses the ledger gas price override for vote transactions signed by ledger', async () => {
    class FakePublicKey {
      constructor(public hex: string) {}
    }
    class FakeAddress {
      constructor(public value: string) {}
    }
    class FakeTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }

    mocks.loadOntologySdk.mockResolvedValue({
      TransactionBuilder: {
        signTransaction: vi.fn(),
      },
      Crypto: {
        PublicKey: FakePublicKey,
        Address: FakeAddress,
        PrivateKey: class {},
      },
      TxSignature: FakeTxSignature,
    })
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-vote-signature')

    const tx = makeTx()
    const result = await handleSignTx(
      tx as unknown,
      {
        address: 'AQ1234567890',
        publicKey: 'ledger-public-key',
        acct: 4,
        neo: true,
      },
      undefined,
      'ledgerWallet'
    )

    expect(result).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
    expect(tx.sigs).toHaveLength(1)
    expect(tx.sigs[0]).toMatchObject({ M: 1, sigData: ['01ledger-vote-signature'] })
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(
      4,
      true,
      'ledger-public-key'
    )
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith('vote-unsigned-data', true, 4)
  })

  it('does not append a vote ledger signature when device validation fails', async () => {
    class FakePublicKey {
      constructor(public hex: string) {}
    }
    class FakeAddress {
      constructor(public value: string) {}
    }
    class FakeTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }

    mocks.loadOntologySdk.mockResolvedValue({
      TransactionBuilder: {
        signTransaction: vi.fn(),
      },
      Crypto: {
        PublicKey: FakePublicKey,
        Address: FakeAddress,
        PrivateKey: class {},
      },
      TxSignature: FakeTxSignature,
    })
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('wrong ledger'))

    const tx = makeTx()

    await expect(
      handleSignTx(
        tx as unknown,
        {
          address: 'AQ1234567890',
          publicKey: 'ledger-public-key',
          acct: 2,
          neo: false,
        },
        undefined,
        'ledgerWallet'
      )
    ).rejects.toThrow('wrong ledger')

    expect(tx.sigs).toHaveLength(0)
    expect(mocks.legacySignWithLedger).not.toHaveBeenCalled()
  })
})
