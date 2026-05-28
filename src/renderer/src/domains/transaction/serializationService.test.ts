import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  logger: {
    error: vi.fn(),
  },
}))

vi.mock('../../shared/lib/logger', () => ({
  logger: mocks.logger,
}))

import { serializeTx, summarizeTx } from './serializationService'
import type { SdkTransactionLike } from '../../shared/chain/types'

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function makeTx(overrides: Partial<SdkTransactionLike> = {}): SdkTransactionLike {
  return {
    serialize: vi.fn(() => 'serialized-hex-data'),
    sigs: [],
    payload: { code: '' },
    serializeUnsignedData: vi.fn(() => new Uint8Array()),
    getHash: vi.fn(() => 'deadbeef'),
    ...overrides,
  }
}

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
    expect(mocks.logger.error).toHaveBeenCalledWith('test.malformed', expect.any(Object))
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

    const loggedSummary = mocks.logger.error.mock.calls[0]![1] as ReturnType<
      typeof import('./serializationService').summarizeTx
    >
    expect(loggedSummary.sigCount).toBe(2)
    expect(loggedSummary.hasPayload).toBe(true)
  })
})

// ---------------------------------------------------------------------------
// summarizeTx
// ---------------------------------------------------------------------------

describe('summarizeTx()', () => {
  it('returns a zeroed summary for null input', () => {
    const summary = summarizeTx(null)
    expect(summary.sigCount).toBe(0)
    expect(summary.hasPayload).toBe(false)
    expect(summary.sigs).toEqual([])
  })

  it('returns a zeroed summary for undefined input', () => {
    const summary = summarizeTx(undefined)
    expect(summary.sigCount).toBe(0)
    expect(summary.sigs).toEqual([])
  })

  it('correctly summarises a transaction with sigs', () => {
    const tx = makeTx({
      sigs: [
        {
          M: 1,
          pubKeys: [{ serializeHex: () => 'pub-hex-1' }, { serializeHex: () => 'pub-hex-2' }],
          sigData: ['sig-a', 'sig-b'],
        },
      ],
      payload: { code: 'some-code' },
    })

    const summary = summarizeTx(tx)

    expect(summary.hasPayload).toBe(true)
    expect(summary.sigCount).toBe(1)
    const sig0 = summary.sigs[0]!
    expect(sig0.m).toBe(1)
    expect(sig0.pubKeyCount).toBe(2)
    expect(sig0.pubKeys).toEqual(['pub-hex-1', 'pub-hex-2'])
    expect(sig0.sigDataCount).toBe(2)
    expect(sig0.sigData).toEqual(['sig-a', 'sig-b'])
  })

  it('handles sigs with pubKeys that throw during serializeHex gracefully', () => {
    const tx = makeTx({
      sigs: [
        {
          M: 1,
          pubKeys: [
            {
              serializeHex: () => {
                throw new Error('pk serialization failed')
              },
            },
          ],
          sigData: [],
        },
      ],
    })

    const summary = summarizeTx(tx)

    expect(summary.sigs[0]!.pubKeys).toEqual([''])
  })
})
