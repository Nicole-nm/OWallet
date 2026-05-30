import { describe, expect, it } from 'vitest'
import { formatNumberForDisplay } from './numberFormat'

describe('formatNumberForDisplay', () => {
  it('groups integer digits with U+2009 thin spaces', () => {
    expect(formatNumberForDisplay(1000)).toBe('1\u2009000')
    expect(formatNumberForDisplay(1234567890)).toBe('1\u2009234\u2009567\u2009890')
  })

  it('preserves decimal precision while grouping the integer part', () => {
    expect(formatNumberForDisplay('1234567.8901')).toBe('1\u2009234\u2009567.8901')
  })

  it('normalizes existing grouped numeric strings to U+2009 thin spaces', () => {
    expect(formatNumberForDisplay('12,000')).toBe('12\u2009000')
    expect(formatNumberForDisplay('12\u2009000')).toBe('12\u2009000')
  })

  it('keeps empty nullable values empty', () => {
    expect(formatNumberForDisplay(null)).toBe('')
    expect(formatNumberForDisplay(undefined)).toBe('')
    expect(formatNumberForDisplay('')).toBe('')
  })
})
