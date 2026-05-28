import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  tryDecryptWallet: vi.fn(),
  loadOntologySdk: vi.fn(),
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
  serializeTx: vi.fn(),
  getRestClient: vi.fn(),
  GAS_PRICE: '500',
  LEDGER_GAS_PRICE: '2500',
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  tryDecryptWallet: (...args: any[]) => mocks.tryDecryptWallet(...args),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: any[]) =>
    mocks.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: any[]) => mocks.legacySignWithLedger(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: (...args: any[]) => mocks.serializeTx(...args),
}))

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: () => mocks.getRestClient(),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
  LEDGER_GAS_PRICE: '2500',
}))

import {
  signWithWallet,
  signMessageWithWallet,
  signWithLedger,
  signSharedTxWithLedger,
} from './signingService'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { WalletSigner } from '../../shared/lib/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(): SdkTransactionLike {
  return {
    payer: undefined as unknown,
    gasPrice: {
      constructor: class {
        constructor(public val: string | number) {}
      },
    },
    sigs: [],
    payload: {},
    serializeUnsignedData: vi.fn(() => new Uint8Array([1, 2, 3])),
    serialize: vi.fn(() => 'serialized'),
    getHash: vi.fn(() => 'deadbeef'),
  }
}

function makeWallet(overrides: Record<string, any> = {}): WalletSigner & Record<string, any> {
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
  } as WalletSigner & Record<string, any>
}

// ---------------------------------------------------------------------------
// signWithWallet
// ---------------------------------------------------------------------------

describe('signWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the signed transaction on the success path', async () => {
    const tx = makeTx()
    const wallet = makeWallet()

    const fakePrivateKey = {
      sign: vi.fn(() => ({ serializeHex: () => 'sig-hex-data' })),
      algorithm: { defaultSchema: 'SHA256withECDSA' },
      getPublicKey: vi.fn(() => ({ serializeHex: () => 'pubkey-hex' })),
    }

    mocks.tryDecryptWallet.mockResolvedValue(fakePrivateKey)

    class FakePublicKey {
      constructor(public hex: string) {}
      serializeHex() {
        return this.hex
      }
    }
    class FakeTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: { PublicKey: FakePublicKey },
      TxSignature: FakeTxSignature,
    })

    const result = await signWithWallet(tx, wallet, 'correct-password')

    expect(result).toBe(tx)
    expect(tx.sigs).toHaveLength(1)
    expect(mocks.tryDecryptWallet).toHaveBeenCalledWith(
      expect.objectContaining({ key: 'encrypted-key' }),
      'correct-password'
    )
  })

  it('returns undefined when password decryption fails (wrong password)', async () => {
    const tx = makeTx()
    const wallet = makeWallet()

    mocks.tryDecryptWallet.mockResolvedValue(null)
    // loadOntologySdk won't matter since tryDecryptWallet returns null early

    const result = await signWithWallet(tx, wallet, 'wrong-password')

    expect(result).toBeUndefined()
    expect(tx.sigs).toHaveLength(0)
  })

  it('throws when the private key produces an empty signature hex', async () => {
    const tx = makeTx()
    const wallet = makeWallet()

    const fakePrivateKey = {
      sign: vi.fn(() => ({ serializeHex: () => '' })), // empty signature
      algorithm: { defaultSchema: 'SHA256withECDSA' },
      getPublicKey: vi.fn(() => ({ serializeHex: () => 'pubkey-hex' })),
    }

    mocks.tryDecryptWallet.mockResolvedValue(fakePrivateKey)
    class FakePublicKey2 {
      constructor(public hex: string) {}
    }
    class FakeTxSignature2 {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: { PublicKey: FakePublicKey2 },
      TxSignature: FakeTxSignature2,
    })

    await expect(signWithWallet(tx, wallet, 'correct-password')).rejects.toThrow(
      'Transaction signature is empty'
    )
  })

  it('handles ledger-cancelled path: signWithLedger rejects when ledger check throws', async () => {
    // When checkPublicKeyIsInTheConnectedLedger throws, signWithLedger propagates the error.
    // This simulates the ledger being cancelled / wrong device.
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('Ledger cancelled'))
    class FakeLedgerPublicKey {
      constructor(public hex: string) {}
    }
    class FakeLedgerAddress {
      constructor(public addr: string) {}
    }
    class FakeLedgerTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: {
        PublicKey: FakeLedgerPublicKey,
        Address: FakeLedgerAddress,
      },
      TxSignature: FakeLedgerTxSignature,
    })

    const tx = makeTx()
    const wallet = makeWallet({ key: undefined, publicKey: 'ledger-pk', acct: 0, neo: undefined })

    await expect(signWithLedger(tx, wallet)).rejects.toThrow('Ledger cancelled')
  })

  it('overrides gas price for ledger-signed transactions', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('ledger-signature')

    class FakeLedgerPublicKey {
      constructor(public hex: string) {}
    }
    class FakeLedgerAddress {
      constructor(public addr: string) {}
    }
    class FakeLedgerTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: {
        PublicKey: FakeLedgerPublicKey,
        Address: FakeLedgerAddress,
      },
      TxSignature: FakeLedgerTxSignature,
    })

    const tx = makeTx()
    const wallet = makeWallet({ key: undefined, publicKey: 'ledger-pk', acct: 0, neo: false })

    const result = await signWithLedger(tx, wallet)

    expect(result).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
    expect(tx.sigs).toHaveLength(1)
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), false, 0)
  })
})

describe('signSharedTxWithLedger()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates the ledger and overrides gas price for shared transactions', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.legacySignWithLedger.mockResolvedValue('shared-ledger-signature')

    class FakeLedgerPublicKey {
      constructor(public hex: string) {}
    }
    class FakeLedgerAddress {
      constructor(public addr: string) {}
    }
    class FakeLedgerTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: {
        PublicKey: FakeLedgerPublicKey,
        Address: FakeLedgerAddress,
      },
      TxSignature: FakeLedgerTxSignature,
    })

    const tx = makeTx()
    const wallet = makeWallet({
      key: undefined,
      sharedWalletAddress: 'ASharedWalletAddress',
      publicKey: 'ledger-pk',
      acct: 3,
      neo: true,
    })

    const result = await signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, true)

    expect(result).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
    expect(tx.sigs || []).toHaveLength(1)
    expect(tx.sigs?.[0]).toMatchObject({ M: 2, sigData: ['01shared-ledger-signature'] })
    expect(mocks.checkPublicKeyIsInTheConnectedLedger).toHaveBeenCalledWith(3, true, 'ledger-pk')
    expect(mocks.legacySignWithLedger).toHaveBeenCalledWith(tx.serializeUnsignedData(), true, 3)
  })

  it('does not append a shared ledger signature when device validation fails', async () => {
    mocks.checkPublicKeyIsInTheConnectedLedger.mockRejectedValue(new Error('wrong ledger'))

    class FakeLedgerPublicKey {
      constructor(public hex: string) {}
    }
    class FakeLedgerAddress {
      constructor(public addr: string) {}
    }
    class FakeLedgerTxSignature {
      M = 0
      pubKeys: any[] = []
      sigData: string[] = []
    }
    mocks.loadOntologySdk.mockResolvedValue({
      Crypto: {
        PublicKey: FakeLedgerPublicKey,
        Address: FakeLedgerAddress,
      },
      TxSignature: FakeLedgerTxSignature,
    })

    const tx = makeTx()
    const wallet = makeWallet({ key: undefined, publicKey: 'ledger-pk', acct: 1, neo: false })

    await expect(signSharedTxWithLedger(tx, 2, ['pk-1', 'pk-2'], wallet, true)).rejects.toThrow(
      'wrong ledger'
    )
    expect(tx.sigs).toHaveLength(0)
    expect(mocks.legacySignWithLedger).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// signMessageWithWallet
// ---------------------------------------------------------------------------

describe('signMessageWithWallet()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a signature object for valid credentials', async () => {
    const fakeSignResult = { serializeHex: () => 'message-sig-hex' }
    const fakePrivateKey = {
      sign: vi.fn(() => fakeSignResult),
    }

    mocks.tryDecryptWallet.mockResolvedValue(fakePrivateKey)

    const wallet = makeWallet()
    const result = await signMessageWithWallet('hello world', wallet, 'correct-password')

    expect(result).toBe(fakeSignResult)
    expect(fakePrivateKey.sign).toHaveBeenCalledWith('hello world')
  })

  it('returns undefined when the password is wrong', async () => {
    mocks.tryDecryptWallet.mockResolvedValue(null)

    const wallet = makeWallet()
    const result = await signMessageWithWallet('hello world', wallet, 'bad-password')

    expect(result).toBeUndefined()
  })
})
