import { describe, expect, it } from 'vitest'

import {
  validateReduceInitPosAmount,
  validateStakeAuthorizationUnit,
} from './nodeStakeValidationService'

describe('validateReduceInitPosAmount', () => {
  it('rejects empty or non-positive-int amounts', () => {
    expect(validateReduceInitPosAmount({ amount: '' })).toMatchObject({
      ok: false,
      errorKey: 'nodeMgmt.invalidInput',
    })
    expect(validateReduceInitPosAmount({ amount: 'abc' })).toMatchObject({
      ok: false,
      errorKey: 'nodeMgmt.invalidInput',
    })
  })

  it('rejects reducing below the commitment when totalPos is zero', () => {
    const result = validateReduceInitPosAmount({
      amount: '5',
      currentPeer: { totalPos: 0, initPos: 10 },
      detail: { commitmentQuantity: 8 },
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.notThanCommitment' })
  })

  it('rejects when remaining initPos cannot cover totalPos under the pos limit', () => {
    const result = validateReduceInitPosAmount({
      amount: '5',
      currentPeer: { totalPos: 100, initPos: 10 },
      posLimit: 1,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.notLessTotalPos' })
  })

  it('accepts a valid reduction', () => {
    const result = validateReduceInitPosAmount({
      amount: '1',
      currentPeer: { totalPos: 0, initPos: 10 },
      detail: { commitmentQuantity: 1 },
    })
    expect(result).toEqual({ ok: true })
  })
})

describe('validateStakeAuthorizationUnit', () => {
  it('rejects invalid units that are neither 0 nor a positive int', () => {
    expect(
      validateStakeAuthorizationUnit({ unit: 'x', unitVal: 1, currentPeer: { initPos: 10 } })
    ).toMatchObject({ ok: false, errorKey: 'nodeMgmt.invalidInput' })
  })

  it('accepts a unit of 0', () => {
    expect(
      validateStakeAuthorizationUnit({
        unit: '0',
        unitVal: 1,
        currentPeer: { initPos: 10 },
        posLimit: 1,
      })
    ).toEqual({ ok: true })
  })

  it('rejects units exceeding the maximum stake capacity', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '100',
      unitVal: 1,
      currentPeer: { initPos: 10 },
      posLimit: 1,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.notThanMax' })
  })

  it('accepts a unit within capacity', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '5',
      unitVal: 1,
      currentPeer: { initPos: 10 },
      posLimit: 1,
    })
    expect(result).toEqual({ ok: true })
  })
})
