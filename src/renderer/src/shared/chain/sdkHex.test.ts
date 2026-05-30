import { describe, expect, it } from 'vitest'
import { reverseHex, str2hexstr } from './sdkHex'

describe('reverseHex', () => {
  it('reverses byte pairs of a hex string', () => {
    expect(reverseHex('0102')).toBe('0201')
    expect(reverseHex('aabbcc')).toBe('ccbbaa')
  })

  it('returns an empty string for empty or undefined input', () => {
    expect(reverseHex('')).toBe('')
    expect(reverseHex()).toBe('')
  })

  it('keeps a trailing single character as its own group', () => {
    expect(reverseHex('abc')).toBe('cab')
  })
})

describe('str2hexstr', () => {
  it('encodes UTF-8 text as a hex string', () => {
    expect(str2hexstr('A')).toBe('41')
    expect(str2hexstr('hi')).toBe('6869')
  })

  it('returns an empty string for empty or undefined input', () => {
    expect(str2hexstr('')).toBe('')
    expect(str2hexstr()).toBe('')
  })
})
