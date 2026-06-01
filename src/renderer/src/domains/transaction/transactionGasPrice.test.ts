import { describe, expect, it } from 'vitest'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'
import { setUnsignedTransactionGasPrice } from './transactionGasPrice'

describe('setUnsignedTransactionGasPrice', () => {
  it('sets the gas price before signing', () => {
    const tx = createFakeTransaction()

    expect(setUnsignedTransactionGasPrice(tx, '2500')).toBe(tx)
    expect((tx.gasPrice as unknown as { val: string }).val).toBe('2500')
  })

  it('rejects missing gas prices and signed transactions', () => {
    expect(() =>
      setUnsignedTransactionGasPrice(createFakeTransaction({ gasPrice: undefined }), '2500')
    ).toThrow('Transaction gas price is unavailable')
    expect(() =>
      setUnsignedTransactionGasPrice(
        createFakeTransaction({ sigs: [{ sigData: ['01signature'] }] }),
        '2500'
      )
    ).toThrow('Cannot change gas price after transaction signing')
  })
})
