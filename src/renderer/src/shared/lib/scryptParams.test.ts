import { describe, expect, it } from 'vitest'
import { convertScryptParams, formatScryptParams } from './scryptParams'

describe('convertScryptParams', () => {
  it('renames scrypt fields without coercing values', () => {
    expect(convertScryptParams({ n: 16384, r: 8, p: 8, dkLen: 64 })).toEqual({
      cost: 16384,
      blockSize: 8,
      parallel: 8,
      size: 64,
    })
  })
})

describe('formatScryptParams', () => {
  it('coerces numeric strings', () => {
    expect(formatScryptParams({ n: '1024', r: '4', p: '2', dkLen: '32' })).toEqual({
      cost: 1024,
      blockSize: 4,
      parallel: 2,
      size: 32,
    })
  })

  it('falls back to defaults for missing or invalid values', () => {
    expect(formatScryptParams({})).toEqual({
      cost: 16384,
      blockSize: 8,
      parallel: 8,
      size: 64,
    })
  })
})
