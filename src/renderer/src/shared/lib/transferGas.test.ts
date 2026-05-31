import { describe, expect, it } from 'vitest'
import { convertTransferFeeToGasPrice, convertTransferGasPriceToFee } from './transferGas'

describe('convertTransferFeeToGasPrice', () => {
  it('converts a string fee to gas price using the default gas limit', () => {
    expect(convertTransferFeeToGasPrice('1')).toBe('50000')
  })

  it('converts a numeric fee to gas price using the default gas limit', () => {
    expect(convertTransferFeeToGasPrice(2)).toBe('100000')
  })

  it('accepts an explicit custom gas limit', () => {
    expect(convertTransferFeeToGasPrice('1', '40000')).toBe('25000')
  })

  it('returns zero for a zero fee', () => {
    expect(convertTransferFeeToGasPrice(0)).toBe('0')
  })
})

describe('convertTransferGasPriceToFee', () => {
  it('converts a string gas price to fee using the default gas limit', () => {
    expect(convertTransferGasPriceToFee('500')).toBe('0.01')
  })

  it('converts a numeric gas price to fee using the default gas limit', () => {
    expect(convertTransferGasPriceToFee(2500)).toBe('0.05')
  })

  it('accepts an explicit custom gas limit', () => {
    expect(convertTransferGasPriceToFee('500', '40000')).toBe('0.02')
  })

  it('returns zero for a zero gas price', () => {
    expect(convertTransferGasPriceToFee(0)).toBe('0')
  })

  it('round-trips through convertTransferFeeToGasPrice', () => {
    const fee = '7'
    expect(convertTransferGasPriceToFee(convertTransferFeeToGasPrice(fee))).toBe(fee)
  })
})
