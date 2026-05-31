import { describe, expect, it, vi } from 'vitest'

import {
  assertSdkTransactionLike,
  invokeSdkTransactionBuilder,
  isSdkTransactionLike,
} from './sdkBoundary'
import { createFakeTransaction } from './__fixtures__/fakeSdk'

describe('shared/chain/sdkBoundary', () => {
  it('recognizes SDK-like transaction values', () => {
    const tx = createFakeTransaction()

    expect(isSdkTransactionLike(tx)).toBe(true)
    expect(assertSdkTransactionLike(tx)).toBe(tx)
  })

  it('rejects malformed transaction values with a contextual error', () => {
    expect(isSdkTransactionLike({ serialize: vi.fn() })).toBe(false)
    expect(() => assertSdkTransactionLike({ serialize: vi.fn() }, 'makeTransferTx')).toThrow(
      '[OWallet] makeTransferTx returned an invalid SDK transaction'
    )
  })

  it('invokes dynamic SDK transaction builder methods through one checked boundary', () => {
    const tx = createFakeTransaction({ getHash: vi.fn(() => 'tx-hash') })
    const builder = {
      makeTx: vi.fn(() => tx),
    }

    expect(invokeSdkTransactionBuilder(builder, 'makeTx', ['arg-1'], 'makeTx')).toBe(tx)
    expect(builder.makeTx).toHaveBeenCalledWith('arg-1')
  })

  it('throws when a dynamic SDK builder method is missing', () => {
    expect(() => invokeSdkTransactionBuilder({}, 'makeMissingTx', [])).toThrow(
      '[OWallet] SDK transaction builder is missing method "makeMissingTx"'
    )
  })
})
