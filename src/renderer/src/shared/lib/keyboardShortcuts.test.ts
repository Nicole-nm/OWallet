import { describe, expect, it } from 'vitest'
import { isTextEntryTarget, isUnmodifiedKey } from './keyboardShortcuts'

describe('isTextEntryTarget', () => {
  it('returns false for a null target', () => {
    expect(isTextEntryTarget(null)).toBe(false)
  })

  it('returns false for a primitive target', () => {
    expect(isTextEntryTarget('input' as unknown as EventTarget)).toBe(false)
  })

  it('returns false for an object with no recognised tagName', () => {
    expect(isTextEntryTarget({ tagName: undefined })).toBe(false)
  })

  it('returns true for an INPUT element', () => {
    expect(isTextEntryTarget({ tagName: 'INPUT' })).toBe(true)
  })

  it('returns true for a TEXTAREA element', () => {
    expect(isTextEntryTarget({ tagName: 'TEXTAREA' })).toBe(true)
  })

  it('returns true for a SELECT element', () => {
    expect(isTextEntryTarget({ tagName: 'SELECT' })).toBe(true)
  })

  it('returns true for any contenteditable element regardless of tag', () => {
    expect(isTextEntryTarget({ tagName: 'DIV', isContentEditable: true })).toBe(true)
  })

  it('returns false for an element that is explicitly not contenteditable', () => {
    expect(isTextEntryTarget({ tagName: 'DIV', isContentEditable: false })).toBe(false)
  })

  it('returns false for a non-text-entry element like a BUTTON', () => {
    expect(isTextEntryTarget({ tagName: 'BUTTON' })).toBe(false)
  })
})

describe('isUnmodifiedKey', () => {
  function ev(overrides: { key: string } & Partial<KeyboardEvent>) {
    return { ctrlKey: false, metaKey: false, altKey: false, ...overrides }
  }

  it('returns true when the key matches and no modifier is held', () => {
    expect(isUnmodifiedKey(ev({ key: '/' }), '/')).toBe(true)
  })

  it('returns false when the key does not match', () => {
    expect(isUnmodifiedKey(ev({ key: 'a' }), '/')).toBe(false)
  })

  it('returns false when Ctrl is held', () => {
    expect(isUnmodifiedKey(ev({ key: '/', ctrlKey: true }), '/')).toBe(false)
  })

  it('returns false when Meta is held', () => {
    expect(isUnmodifiedKey(ev({ key: '/', metaKey: true }), '/')).toBe(false)
  })

  it('returns false when Alt is held', () => {
    expect(isUnmodifiedKey(ev({ key: '/', altKey: true }), '/')).toBe(false)
  })

  it('treats absent modifier flags as not held', () => {
    expect(isUnmodifiedKey({ key: '/' }, '/')).toBe(true)
  })

  it('matches other keys when passed as the target', () => {
    expect(isUnmodifiedKey(ev({ key: 'Escape' }), 'Escape')).toBe(true)
    expect(isUnmodifiedKey(ev({ key: 'Escape' }), '/')).toBe(false)
  })
})
