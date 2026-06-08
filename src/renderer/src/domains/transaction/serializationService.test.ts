import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('../../shared/lib/logger', () => ({
  logger: mocks.logger,
}))

import { serializeTx } from './serializationService'
import type { SdkTransactionLike } from '../../shared/chain/types'

type TxSummary = {
  hasPayload: boolean
  sigCount: number
  sigs: Array<{
    m?: number
    pubKeyCount: number
    pubKeys: string[]
    sigDataCount: number
    sigData: string[]
  }>
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'

const makeTx = (overrides: Partial<SdkTransactionLike> = {}): SdkTransactionLike =>
  createFakeTransaction({ serialize: vi.fn(() => 'serialized-hex-data'), ...overrides })

// ---------------------------------------------------------------------------
// serializeTx
// ---------------------------------------------------------------------------

describe('serializeTx()', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns the serialized hex string on the success path', () => {
    const tx = makeTx()
    const result = serializeTx(tx, 'test.context')

    expect(result).toBe('serialized-hex-data')
    expect(tx.serialize).toHaveBeenCalledOnce()
    expect(mocks.logger.error).not.toHaveBeenCalled()
  })

  it('uses the default context string when none is provided', () => {
    const tx = makeTx()
    expect(() => serializeTx(tx)).not.toThrow()
    expect(tx.serialize).toHaveBeenCalledOnce()
  })

  it('logs an error and rethrows when serialize() throws (malformed tx)', () => {
    const badTx = makeTx({
      serialize: vi.fn(() => {
        throw new Error('malformed hash: invalid payload')
      }),
      sigs: [
        {
          M: 1,
          pubKeys: [{ serializeHex: () => 'pub-key-hex' }],
          sigData: ['sig-data-hex'],
        },
      ],
    })

    expect(() => serializeTx(badTx, 'test.malformed')).toThrow('malformed hash: invalid payload')
    expect(mocks.logger.error).toHaveBeenCalledWith('test.malformed', expect.any(String))
  })

  it('logs tx summary including sig count when serialize fails', () => {
    const badTx = makeTx({
      serialize: vi.fn(() => {
        throw new Error('bad hash')
      }),
      sigs: [
        { M: 2, pubKeys: [], sigData: ['a', 'b'] },
        { M: 1, pubKeys: [{ serializeHex: () => 'pk' }], sigData: ['c'] },
      ],
    })

    expect(() => serializeTx(badTx, 'ctx')).toThrow('bad hash')

    const loggedSummary = JSON.parse(mocks.logger.error.mock.calls[0]![1] as string) as TxSummary
    expect(loggedSummary.sigCount).toBe(2)
    expect(loggedSummary.hasPayload).toBe(true)
  })
})
