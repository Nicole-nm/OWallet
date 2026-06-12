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
      validateStakeAuthorizationUnit({ unit: 'x', currentPeer: { initPos: 10 } })
    ).toMatchObject({ ok: false, errorKey: 'nodeMgmt.invalidInput' })
  })

  it('accepts a unit of 0', () => {
    expect(
      validateStakeAuthorizationUnit({
        unit: '0',
        currentPeer: { initPos: 10 },
        posLimit: 1,
      })
    ).toEqual({ ok: true })
  })

  it('rejects units exceeding the maximum stake capacity', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '100',
      currentPeer: { initPos: 10 },
      posLimit: 1,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.notThanMax' })
  })

  it('accepts a unit within capacity', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '5',
      currentPeer: { initPos: 10 },
      posLimit: 1,
    })
    expect(result).toEqual({ ok: true })
  })

  it('rejects a unit below 1/10 of current total user stake', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '4',
      currentPeer: { initPos: 1000, totalPos: 50 },
      posLimit: 10,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'nodeMgmt.notLessTotalPosTenth' })
  })

  it('accepts a unit equal to 1/10 of current total user stake', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '5',
      currentPeer: { initPos: 1000, totalPos: 50 },
      posLimit: 10,
    })
    expect(result).toEqual({ ok: true })
  })

  it('skips lower-bound check when totalPos is 0', () => {
    const result = validateStakeAuthorizationUnit({
      unit: '1',
      currentPeer: { initPos: 1000, totalPos: 0 },
      posLimit: 10,
    })
    expect(result).toEqual({ ok: true })
  })
})
