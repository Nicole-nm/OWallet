import { describe, expect, it } from 'vitest'
import { matchesSearchQuery } from './searchQuery'

describe('matchesSearchQuery', () => {
  it('returns true for an empty query', () => {
    expect(matchesSearchQuery('', 'Anything', 'AN5fA…')).toBe(true)
  })

  it('returns true for a whitespace-only query', () => {
    expect(matchesSearchQuery('   ', 'Anything', 'AN5fA…')).toBe(true)
  })

  it('matches a case-insensitive substring of the name', () => {
    expect(matchesSearchQuery('main', 'My Main Wallet', 'AN5fA1Bc')).toBe(true)
    expect(matchesSearchQuery('MAIN', 'My main wallet', 'AN5fA1Bc')).toBe(true)
  })

  it('matches a case-insensitive substring of the address', () => {
    expect(matchesSearchQuery('an5', 'Cold Storage', 'AN5fA1BcD2eF')).toBe(true)
    expect(matchesSearchQuery('A1BC', 'Cold Storage', 'AN5fA1BcD2eF')).toBe(true)
  })

  it('returns false when no field contains the query', () => {
    expect(matchesSearchQuery('xyz', 'Cold Storage', 'AN5fA1BcD2eF')).toBe(false)
  })

  it('trims the query before matching', () => {
    expect(matchesSearchQuery('  cold  ', 'Cold Storage', 'AN5fA1BcD2eF')).toBe(true)
  })

  it('safely skips undefined and null fields', () => {
    expect(matchesSearchQuery('cold', undefined, null, 'Cold Storage')).toBe(true)
    expect(matchesSearchQuery('cold', undefined, null)).toBe(false)
  })

  it('returns false when called with no fields and a non-empty query', () => {
    expect(matchesSearchQuery('cold')).toBe(false)
  })
})
