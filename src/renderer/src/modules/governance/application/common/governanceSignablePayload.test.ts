import { describe, expect, it, vi } from 'vitest'

import { isSdkTransactionLike } from './governanceSignablePayload'

describe('governanceSignablePayload', () => {
  it('recognizes SDK-like transaction payloads', () => {
    expect(
      isSdkTransactionLike({
        serializeUnsignedData: vi.fn(),
        serialize: vi.fn(),
        getHash: vi.fn(),
      })
    ).toBe(true)
  })

  it('rejects strings, nullish values, and partial transaction shapes', () => {
    expect(isSdkTransactionLike('payload')).toBe(false)
    expect(isSdkTransactionLike(null)).toBe(false)
    expect(
      isSdkTransactionLike({
        serializeUnsignedData: vi.fn(),
        serialize: vi.fn(),
      })
    ).toBe(false)
  })
})
