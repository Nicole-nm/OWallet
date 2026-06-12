import { describe, expect, it } from 'vitest'
import { getAuthorizationBlockUnitLabel } from './countLabels'

const translate = (key: string) => key

describe('governance count labels', () => {
  it('uses singular block label only for one block', () => {
    expect(getAuthorizationBlockUnitLabel(translate, 1)).toBe('nodeMgmt.block')
  })

  it('uses plural block label for zero or multiple blocks', () => {
    expect(getAuthorizationBlockUnitLabel(translate, 0)).toBe('nodeMgmt.blocks')
    expect(getAuthorizationBlockUnitLabel(translate, 2)).toBe('nodeMgmt.blocks')
  })
})
