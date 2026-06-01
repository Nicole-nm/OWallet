import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  signingService: {
    sendTx: vi.fn(),
  },
}))

vi.mock('./signingService', () => ({
  sendTx: (...args: unknown[]) => mocks.signingService.sendTx(...args),
}))

vi.mock('./serializationService', () => ({
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/chain/sdkHex', () => ({
  reverseHex: (value: string) => `rev:${value}`,
}))

vi.mock('../../shared/chain/transactionSdk', () => ({
  signTransactionWithPrivateKey: vi.fn(),
  tryDecryptWallet: vi.fn(),
}))

vi.mock('./assetBuilder', () => ({
  buildClaimOng: vi.fn(),
  buildNativeTransfer: vi.fn(),
  buildOep4Transfer: vi.fn(),
}))

import {
  applyPrivateKeyTransactionSignature,
  createRedeemTransaction,
  createTransferTransaction,
  decryptWalletPrivateKey,
  getTransactionHash,
  sendTransaction,
  serializeTransaction,
} from './transactionDomainService'
import { buildClaimOng, buildNativeTransfer, buildOep4Transfer } from './assetBuilder'
import { signTransactionWithPrivateKey, tryDecryptWallet } from '../../shared/chain/transactionSdk'
import { serializeTx } from './serializationService'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'
import type { SdkTransactionLike } from '../../shared/chain/types'

function makeTx(id: string): SdkTransactionLike {
  return createFakeTransaction({ getHash: vi.fn(() => id) })
}

describe('transactionApplicationService.sendTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns ok with reversed tx hash on Error=0 response', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: 0, Result: 'ok' })

    await expect(sendTransaction(makeTx('abc'))).resolves.toEqual({
      ok: true,
      response: { Error: 0, Result: 'ok' },
      txHash: 'rev:abc',
    })
  })

  it('maps Error=-1 response to ongNoEnough error key', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: -1, Result: 'detail' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'detail',
    })
  })

  it('maps cover gas cost responses to ongNoEnough', async () => {
    mocks.signingService.sendTx.mockResolvedValue({
      Error: 1,
      Result: 'not enough to cover gas cost',
    })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'not enough to cover gas cost',
    })
  })

  it('maps balance insufficient responses to balanceInsufficient', async () => {
    mocks.signingService.sendTx.mockResolvedValue({
      Error: 2,
      Result: 'balance insufficient for this transfer',
    })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      errorKey: 'common.balanceInsufficient',
      detail: 'balance insufficient for this transfer',
    })
  })

  it('returns generic failure with the response detail when no known pattern matches', async () => {
    mocks.signingService.sendTx.mockResolvedValue({ Error: 99, Result: 'mystery' })

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'mystery',
      detail: 'mystery',
    })
  })

  it('catches thrown errors and returns the message in the failure result', async () => {
    mocks.signingService.sendTx.mockRejectedValue(new Error('boom'))

    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'boom',
    })
  })

  it('returns a generic failure when no response is returned', async () => {
    mocks.signingService.sendTx.mockResolvedValue(null)
    const result = await sendTransaction(makeTx('x'))
    expect(result).toMatchObject({ ok: false, message: null, detail: '' })
  })

  it('stringifies non-Error throwables in the failure message', async () => {
    mocks.signingService.sendTx.mockRejectedValue('plain rejection')
    await expect(sendTransaction(makeTx('x'))).resolves.toEqual({
      ok: false,
      message: 'plain rejection',
    })
  })
})

describe('transactionDomainService.createTransferTransaction', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('routes ONT transfers through buildNativeTransfer', async () => {
    vi.mocked(buildNativeTransfer).mockResolvedValue({ id: 'ont' } as never)
    await createTransferTransaction({
      transfer: {
        asset: 'ONT',
        to: 'ATo',
        amount: '5',
        gasPrice: '500',
        gasLimit: '20000',
      } as never,
      fromAddress: 'AFrom',
    })

    expect(buildNativeTransfer).toHaveBeenCalledWith(
      'ONT',
      'AFrom',
      'ATo',
      '5',
      'AFrom',
      '500',
      '20000'
    )
  })

  it('routes ONG transfers through buildNativeTransfer', async () => {
    vi.mocked(buildNativeTransfer).mockResolvedValue({ id: 'ong' } as never)
    await createTransferTransaction({
      transfer: {
        asset: 'ONG',
        to: 'ATo',
        amount: '1',
        gasPrice: 500,
        gasLimit: 20000,
      } as never,
      fromAddress: 'AFrom',
    })
    expect(buildNativeTransfer).toHaveBeenCalled()
  })

  it('routes other assets through buildOep4Transfer and falls back to scriptHash="" and decimal=0', async () => {
    vi.mocked(buildOep4Transfer).mockResolvedValue({ id: 'oep4' } as never)
    await createTransferTransaction({
      transfer: {
        asset: 'WING',
        to: 'ATo',
        amount: '2',
        gasPrice: '500',
        gasLimit: '20000',
      } as never,
      fromAddress: 'AFrom',
    })

    expect(buildOep4Transfer).toHaveBeenCalledWith(
      '',
      'AFrom',
      'ATo',
      '2',
      0,
      'AFrom',
      '500',
      '20000'
    )
  })

  it('forwards the scriptHash and decimal for OEP4 transfers when supplied', async () => {
    vi.mocked(buildOep4Transfer).mockResolvedValue({ id: 'oep4-decimal' } as never)
    await createTransferTransaction({
      transfer: {
        asset: 'WING',
        scriptHash: 'abc',
        decimal: 9,
        to: 'ATo',
        amount: '3',
        gasPrice: '500',
        gasLimit: '20000',
      } as never,
      fromAddress: 'AFrom',
    })

    expect(buildOep4Transfer).toHaveBeenCalledWith(
      'abc',
      'AFrom',
      'ATo',
      '3',
      9,
      'AFrom',
      '500',
      '20000'
    )
  })
})

describe('transactionDomainService misc helpers', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('createRedeemTransaction delegates to buildClaimOng with stringified gas values', async () => {
    vi.mocked(buildClaimOng).mockResolvedValue({ id: 'redeem' } as never)
    await createRedeemTransaction({
      address: 'AAddr',
      claimableOng: 1.5,
      gasPrice: 500,
      gasLimit: 20000,
    })
    expect(buildClaimOng).toHaveBeenCalledWith('AAddr', 1.5, '500', '20000')
  })

  it('decryptWalletPrivateKey delegates to tryDecryptWallet', () => {
    vi.mocked(tryDecryptWallet).mockReturnValue({ key: 'pk' } as never)
    const result = decryptWalletPrivateKey({
      wallet: { key: 'enc', address: 'A1', salt: 'salt' } as never,
      password: 'pwd',
      scrypt: { cost: 1 } as never,
    })
    expect(result).toEqual({ key: 'pk' })
    expect(tryDecryptWallet).toHaveBeenCalled()
  })

  it('applyPrivateKeyTransactionSignature signs and returns the transaction', async () => {
    const tx = createFakeTransaction({ getHash: vi.fn(() => 'hash') })
    const result = await applyPrivateKeyTransactionSignature({ tx, privateKey: { pk: true } })
    expect(result).toBe(tx)
    expect(signTransactionWithPrivateKey).toHaveBeenCalledWith(tx, { pk: true })
  })

  it('getTransactionHash returns the reversed hex form of the tx hash', () => {
    expect(getTransactionHash(createFakeTransaction({ getHash: vi.fn(() => 'abc') }))).toBe(
      'rev:abc'
    )
  })

  it('serializeTransaction delegates to serializeTx with a domain trace tag', () => {
    vi.mocked(serializeTx).mockReturnValue('serialized')
    const tx = createFakeTransaction({ getHash: vi.fn(() => 'h') })
    expect(serializeTransaction(tx)).toBe('serialized')
    expect(serializeTx).toHaveBeenCalledWith(tx, 'transaction.serializeTransaction')
  })
})
