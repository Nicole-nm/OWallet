import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionSdk: {
    makeDummyTransferTx: vi.fn(),
    createSdkPublicKey: vi.fn(),
    createSdkTxSignature: vi.fn(),
    addTransactionSign: vi.fn(),
    tryDecryptWallet: vi.fn(),
  },
  walletSdk: {
    createSdkAddress: vi.fn(),
  },
  ledgerSigner: {
    checkPublicKeyIsInTheConnectedLedger: vi.fn(),
    legacySignWithLedger: vi.fn(),
  },
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  makeDummyTransferTx: (...args: any[]) => mocks.transactionSdk.makeDummyTransferTx(...args),
  createSdkPublicKey: (...args: any[]) => mocks.transactionSdk.createSdkPublicKey(...args),
  createSdkTxSignature: (...args: any[]) => mocks.transactionSdk.createSdkTxSignature(...args),
  addTransactionSign: (...args: any[]) => mocks.transactionSdk.addTransactionSign(...args),
  tryDecryptWallet: (...args: any[]) => mocks.transactionSdk.tryDecryptWallet(...args),
}))

vi.mock('../../shared/chain/walletSdk', () => ({
  createSdkAddress: (...args: any[]) => mocks.walletSdk.createSdkAddress(...args),
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: (...args: any[]) =>
    mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger(...args),
  legacySignWithLedger: (...args: any[]) => mocks.ledgerSigner.legacySignWithLedger(...args),
}))

vi.mock('../../shared/lib/constants', () => ({
  LEDGER_GAS_PRICE: '2500',
}))

import { addLedgerSignature } from './walletSigningOrchestrator'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { HardwareWalletSigner } from '../../shared/lib/types'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'

const makeTx = (): SdkTransactionLike =>
  createFakeTransaction({ serializeUnsignedData: vi.fn(() => 'unsigned-data') })

describe('walletSigningOrchestrator.addLedgerSignature()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('applies the ledger gas price override before appending a signature', async () => {
    const tx = makeTx()
    const wallet: HardwareWalletSigner & Record<string, any> = {
      address: 'AQ1234567890',
      publicKey: 'ledger-public-key',
      acct: 1,
      neo: false,
    }

    const payer = { value: 'sdk-address' }
    const sdkPublicKey = { value: 'sdk-pk' }
    const sdkTxSignature = { M: 1, sigData: ['01ledger-signature'] }

    mocks.ledgerSigner.checkPublicKeyIsInTheConnectedLedger.mockResolvedValue(true)
    mocks.walletSdk.createSdkAddress.mockResolvedValue(payer)
    mocks.ledgerSigner.legacySignWithLedger.mockResolvedValue('ledger-signature')
    mocks.transactionSdk.createSdkPublicKey.mockResolvedValue(sdkPublicKey)
    mocks.transactionSdk.createSdkTxSignature.mockResolvedValue(sdkTxSignature)

    const result = await addLedgerSignature({
      tx,
      wallet,
    })

    expect(result).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
    expect(tx.payer).toBe(payer)
    expect(tx.sigs).toEqual([sdkTxSignature])
    expect(mocks.ledgerSigner.legacySignWithLedger).toHaveBeenCalledWith('unsigned-data', false, 1)
  })
})
