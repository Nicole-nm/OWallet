import { describe, expect, it } from 'vitest'
import { formatVoteStatus, formatVoteTime, reverseVoteHash } from './useVoteFormatting'

describe('formatVoteTime', () => {
  it('formats a date into YYYY-MM-DD HH:mm:ss with zero padding', () => {
    const formatted = formatVoteTime(new Date(2023, 0, 5, 3, 7, 9))
    expect(formatted).toBe('2023-01-05 03:07:09')
  })
})

describe('formatVoteStatus', () => {
  it('maps the status text through the provided map', () => {
    const map = { open: 'Open', closed: 'Closed' }
    expect(formatVoteStatus({ statusText: 'open' }, map)).toBe('Open')
  })

  it('uses an empty key when statusText is missing', () => {
    expect(formatVoteStatus({}, { '': 'Unknown' })).toBe('Unknown')
  })
})

describe('reverseVoteHash', () => {
  it('reverses the byte order of a hex hash', () => {
    expect(reverseVoteHash('0102')).toBe('0201')
    expect(reverseVoteHash('aabbcc')).toBe('ccbbaa')
  })
})
