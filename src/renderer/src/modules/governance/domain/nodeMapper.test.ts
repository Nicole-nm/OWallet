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

  it('returns the input string for normalizeNodePublicKey when given a raw string', () => {
    expect(normalizeNodePublicKey('hex-key')).toBe('hex-key')
  })

  it('returns an empty string for normalizeNodePublicKey when given null/undefined or no matching alias', () => {
    expect(normalizeNodePublicKey(null)).toBe('')
    expect(normalizeNodePublicKey(undefined)).toBe('')
    expect(normalizeNodePublicKey({ unrelated: 'value' })).toBe('')
  })

  it('mapOffChainNodeRecord defaults to an empty record and produces empty name when no key is present', () => {
    const mapped = mapOffChainNodeRecord()
    expect(mapped.publicKey).toBe('')
    expect(mapped.nodeAddress).toBe('')
    expect(mapped.name).toBe('')
  })

  it('mapOffChainNodeRecord preserves an explicit name and falls back to nodeAddress over address', () => {
    const mapped = mapOffChainNodeRecord({
      publicKey: 'abcdef',
      nodeAddress: 'AExplicit',
      address: 'AFallback',
      name: 'Custom',
    })
    expect(mapped.name).toBe('Custom')
    expect(mapped.nodeAddress).toBe('AExplicit')
  })

  it('mapMyNodeCard defaults stakeAmount to 0 and status to EXITED when peer is missing', () => {
    const result = mapMyNodeCard({
      wallet: { address: 'wallet-address' },
      offChainNode: { peerPubkey: 'peer-public-key' },
    })
    expect(result.stakeAmount).toBe(0)
    expect(result.status).toBe(6)
  })

  it('mapMyNodeCard handles missing initPos and totalPos as 0', () => {
    const result = mapMyNodeCard({
      wallet: {},
      offChainNode: { peerPubkey: 'pk' },
      peer: { status: 2 },
    })
    expect(result.stakeAmount).toBe(0)
    expect(result.status).toBe(2)
  })
})
