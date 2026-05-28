import { describe, expect, it } from 'vitest'

import { mapMyNodeCard, mapOffChainNodeRecord, normalizeNodePublicKey } from './nodeMapper'

describe('nodeMapper', () => {
  it('normalizes public key from supported field names', () => {
    expect(normalizeNodePublicKey({ pk: 'pk-value' })).toBe('pk-value')
    expect(normalizeNodePublicKey({ peerPubkey: 'peer-value' })).toBe('peer-value')
    expect(normalizeNodePublicKey({ publicKey: 'camel-value' })).toBe('camel-value')
    expect(normalizeNodePublicKey({ nodePublicKey: 'node-value' })).toBe('node-value')
    expect(normalizeNodePublicKey({ public_key: 'snake-value' })).toBe('snake-value')
    expect(normalizeNodePublicKey({ publickey: 'legacy-value' })).toBe('legacy-value')
  })

  it('maps off-chain records to a canonical governance view model', () => {
    const mapped = mapOffChainNodeRecord({
      public_key: 'abcdef123456',
      address: 'AQm123',
    })

    expect(mapped.publicKey).toBe('abcdef123456')
    expect(mapped.nodePublicKey).toBe('abcdef123456')
    expect(mapped.pk).toBe('abcdef123456')
    expect(mapped.publickey).toBe('abcdef123456')
    expect(mapped.peerPubkey).toBe('abcdef123456')
    expect(mapped.nodeAddress).toBe('AQm123')
    expect(mapped.name).toBe('Node_abcdef')
  })

  it('builds my-node cards with normalized metadata', () => {
    const result = mapMyNodeCard({
      wallet: { address: 'wallet-address' },
      offChainNode: { peerPubkey: 'peer-public-key', name: 'Validator A' },
      peer: { initPos: 10, totalPos: 20, status: 1 },
    })

    expect(result).toEqual({
      publicKey: 'peer-public-key',
      stakeAddress: 'wallet-address',
      stakeWallet: { address: 'wallet-address' },
      name: 'Validator A',
      stakeAmount: 30,
      status: 1,
    })
  })
})
