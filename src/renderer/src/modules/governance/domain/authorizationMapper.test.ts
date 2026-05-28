import { describe, expect, it } from 'vitest'

import { createEmptyAuthorizationNode, mapAuthorizationCurrentNode } from './authorizationMapper'

describe('authorizationMapper', () => {
  it('creates a stable empty authorization node shape', () => {
    expect(createEmptyAuthorizationNode()).toEqual({
      pk: '',
      peerPubkey: '',
      publicKey: '',
      nodePublicKey: '',
      public_key: '',
      publickey: '',
      name: '',
      nodeAddress: '',
      maxAuthorize: 0,
      maxAuthorizeStr: '0',
      totalPos: 0,
      totalPosStr: '0',
    })
  })

  it('maps current-node payloads to a canonical authorization view model', () => {
    const mapped = mapAuthorizationCurrentNode({
      public_key: 'authorization-public-key',
      address: 'Abc123',
      max_authorize: 12000,
      total_pos: 3456,
    })

    expect(mapped).toMatchObject({
      publicKey: 'authorization-public-key',
      nodePublicKey: 'authorization-public-key',
      pk: 'authorization-public-key',
      peerPubkey: 'authorization-public-key',
      public_key: 'authorization-public-key',
      publickey: 'authorization-public-key',
      nodeAddress: 'Abc123',
      maxAuthorize: 12000,
      maxAuthorizeStr: '12,000',
      totalPos: 3456,
      totalPosStr: '3,456',
      name: 'Node_author',
    })
  })
})
