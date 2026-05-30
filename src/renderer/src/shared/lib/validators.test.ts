import { describe, expect, it } from 'vitest'
import { isHexString, verifyOep4Value, verifyOngValue, verifyPositiveInt } from './validators'

describe('verifyPositiveInt', () => {
  it('accepts positive integers without leading zeros', () => {
    expect(verifyPositiveInt('1')).toBe(true)
    expect(verifyPositiveInt('1234')).toBe(true)
  })

  it('rejects zero, negatives, decimals and leading zeros', () => {
    expect(verifyPositiveInt('0')).toBe(false)
    expect(verifyPositiveInt('-1')).toBe(false)
    expect(verifyPositiveInt('1.5')).toBe(false)
    expect(verifyPositiveInt('01')).toBe(false)
    expect(verifyPositiveInt('abc')).toBe(false)
  })
})

describe('verifyOngValue', () => {
  it('accepts up to nine decimal places', () => {
    expect(verifyOngValue('10')).toBe(true)
    expect(verifyOngValue('10.123456789')).toBe(true)
  })

  it('rejects more than nine decimal places and non-numeric input', () => {
    expect(verifyOngValue('10.1234567890')).toBe(false)
    expect(verifyOngValue('abc')).toBe(false)
  })
})

describe('verifyOep4Value', () => {
  it('limits decimals to the token precision', () => {
    expect(verifyOep4Value('1.23', 2)).toBe(true)
    expect(verifyOep4Value('1.234', 2)).toBe(false)
  })

  it('falls back to positive-integer validation when decimal is zero', () => {
    expect(verifyOep4Value('5', 0)).toBe(true)
    expect(verifyOep4Value('5.1', 0)).toBe(false)
  })
})

describe('isHexString', () => {
  it('accepts even-length hexadecimal strings', () => {
    expect(isHexString('00ff')).toBe(true)
    expect(isHexString('AABB')).toBe(true)
  })

  it('rejects odd-length or non-hex input', () => {
    expect(isHexString('abc')).toBe(false)
    expect(isHexString('zz')).toBe(false)
  })
})
