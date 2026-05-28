import { describe, expect, it } from 'vitest'

import { createEmptyFromTemplate } from './factory'

describe('createEmptyFromTemplate', () => {
  it('returns a fresh shallow copy of a template object', () => {
    const template = { address: '', amount: 0 }

    const first = createEmptyFromTemplate(template)
    const second = createEmptyFromTemplate(template)

    expect(first).toEqual(template)
    expect(first).not.toBe(template)
    expect(first).not.toBe(second)
  })
})
