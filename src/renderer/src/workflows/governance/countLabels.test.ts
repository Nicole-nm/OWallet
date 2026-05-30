import { describe, expect, it } from 'vitest'
import { getAuthorizationBlockUnitLabel, getCancelAuthorizationUnitLabel } from './countLabels'

const translate = (key: string) => key

describe('governance count labels', () => {
  it('uses singular block label only for one block', () => {
    expect(getAuthorizationBlockUnitLabel(translate, 1)).toBe('nodeMgmt.block')
  })

  it('uses plural block label for zero or multiple blocks', () => {
    expect(getAuthorizationBlockUnitLabel(translate, 0)).toBe('nodeMgmt.blocks')
    expect(getAuthorizationBlockUnitLabel(translate, 2)).toBe('nodeMgmt.blocks')
  })

  it('uses singular unit label only for one cancellation unit', () => {
    expect(getCancelAuthorizationUnitLabel(translate, 1)).toBe('nodeMgmt.cancelUnit')
  })

  it('uses plural unit label for zero or multiple cancellation units', () => {
    expect(getCancelAuthorizationUnitLabel(translate, 0)).toBe('nodeMgmt.cancelUnits')
    expect(getCancelAuthorizationUnitLabel(translate, 2)).toBe('nodeMgmt.cancelUnits')
  })
})
