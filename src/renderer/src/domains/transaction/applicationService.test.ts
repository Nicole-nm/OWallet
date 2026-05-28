import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signingService: {
    sendTx: vi.fn(),
    signMessageWithWallet: vi.fn(),
    signWithLedger: vi.fn(),
    signWithWallet: vi.fn(),
  },
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('./assetBuilder', () => ({
  buildClaimOng: vi.fn(),
  buildNativeTransfer: vi.fn(),
  buildOep4Transfer: vi.fn(),
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  addTransactionSign: vi.fn(),
  createSdkPublicKey: vi.fn(),
  createSdkTxSignature: vi.fn(),
  makeDummyTransferTx: vi.fn(),
  signTransactionWithPrivateKey: vi.fn(),
  tryDecryptWallet: vi.fn(),
}))

vi.mock('../../shared/chain/walletSdk', () => ({
  createSdkAddress: vi.fn(),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: vi.fn((value) => value),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
}))

vi.mock('../../shared/chain/ledgerSigner', () => ({
  checkPublicKeyIsInTheConnectedLedger: vi.fn(),
  legacySignWithLedger: vi.fn(),
}))

vi.mock('../../shared/lib/logger', () => ({
  createLogger: () => mocks.logger,
}))

vi.mock('./signingService', () => ({
  sendTx: (...args: any[]) => mocks.signingService.sendTx(...args),
  signMessageWithWallet: (...args: any[]) => mocks.signingService.signMessageWithWallet(...args),
  signWithLedger: (...args: any[]) => mocks.signingService.signWithLedger(...args),
  signWithWallet: (...args: any[]) => mocks.signingService.signWithWallet(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: vi.fn(),
}))

import { signAndSendTransaction } from './applicationService'

function makeTx(id: string) {
  return {
    id,
    serializeUnsignedData: vi.fn(() => 'unsigned'),
    serialize: vi.fn(() => 'serialized'),
    getHash: vi.fn(() => id),
  }
}

describe('transactionApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps missing common-wallet signatures to a password error', async () => {
    mocks.signingService.signWithWallet.mockResolvedValue(undefined)

    await expect(
      signAndSendTransaction({
        tx: makeTx('tx-1'),
        wallet: { key: 'encrypted', address: 'AQ123' },
        password: 'wrong-password',
      })
    ).resolves.toEqual({
      ok: false,
      messageKey: 'common.pwdErr',
    })

    expect(mocks.signingService.sendTx).not.toHaveBeenCalled()
  })

  it('keeps ledger signing aborts as cancelled results', async () => {
    mocks.signingService.signWithLedger.mockResolvedValue(undefined)

    await expect(
      signAndSendTransaction({
        tx: makeTx('tx-1'),
        wallet: { address: 'AQ123', publicKey: 'pk-1' },
      })
    ).resolves.toEqual({
      ok: false,
      cancelled: true,
    })
  })
})
