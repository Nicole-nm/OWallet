import { describe, expect, it } from 'vitest'
import { asBoolean, asString, pick } from './coercion'

describe('asString', () => {
  it('returns empty string for null/undefined', () => {
    expect(asString(null)).toBe('')
    expect(asString(undefined)).toBe('')
  })

  it('stringifies other values', () => {
    expect(asString('hi')).toBe('hi')
    expect(asString(0)).toBe('0')
    expect(asString(42)).toBe('42')
    expect(asString(false)).toBe('false')
  })
})

describe('asBoolean', () => {
  it('passes through booleans', () => {
    expect(asBoolean(true)).toBe(true)
    expect(asBoolean(false)).toBe(false)
  })

  it('treats non-zero numbers as true', () => {
    expect(asBoolean(1)).toBe(true)
    expect(asBoolean(-1)).toBe(true)
    expect(asBoolean(0)).toBe(false)
  })

  it('parses truthy/falsy strings case- and whitespace-insensitively', () => {
    expect(asBoolean(' True ')).toBe(true)
    expect(asBoolean('1')).toBe(true)
    expect(asBoolean('YES')).toBe(true)
    expect(asBoolean('false')).toBe(false)
    expect(asBoolean('0')).toBe(false)
    expect(asBoolean('no')).toBe(false)
  })

  it('falls back to false for unknown values', () => {
    expect(asBoolean('maybe')).toBe(false)
    expect(asBoolean(null)).toBe(false)
    expect(asBoolean({})).toBe(false)
  })
})

describe('pick', () => {
  it('returns the first defined value among the keys', () => {
    expect(pick({ b: 'second' }, 'a', 'b')).toBe('second')
    expect(pick({ a: 'first', b: 'second' }, 'a', 'b')).toBe('first')
  })

  it('skips null and undefined', () => {
    expect(pick({ a: null, b: undefined, c: 'value' }, 'a', 'b', 'c')).toBe('value')
  })

  it('returns undefined when no key is defined', () => {
    expect(pick({}, 'a', 'b')).toBeUndefined()
  })

  it('treats falsy-but-defined values as present', () => {
    expect(pick({ a: 0 }, 'a', 'b')).toBe(0)
    expect(pick({ a: '' }, 'a', 'b')).toBe('')
  })
})
