import { beforeEach, describe, expect, it, vi } from 'vitest'

const openExternal = vi.hoisted(() => vi.fn(async () => {}))
const warn = vi.hoisted(() => vi.fn())

vi.mock('./bridge', () => ({ openExternal }))
vi.mock('../lib/logger', () => ({ logger: { warn } }))

import { open } from './urlOpener'

beforeEach(() => {
  openExternal.mockClear()
  warn.mockClear()
})

describe('urlOpener.open', () => {
  it('opens https urls externally', () => {
    open('https://example.test')
    expect(openExternal).toHaveBeenCalledWith('https://example.test')
  })

  it('blocks non-https urls and logs a warning', () => {
    const result = open('http://example.test')
    expect(result).toBeUndefined()
    expect(openExternal).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalled()
  })

  it('blocks non-string input', () => {
    open(undefined)
    open(42)
    expect(openExternal).not.toHaveBeenCalled()
    expect(warn).toHaveBeenCalledTimes(2)
  })
})
