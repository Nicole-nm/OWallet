import { describe, expect, it } from 'vitest'

import { createEmptyStakeDetail, mapStakeDetail } from './stakeMapper'

describe('stakeMapper', () => {
  it('creates a stable empty stake detail shape', () => {
    expect(createEmptyStakeDetail()).toEqual({
      pk: '',
      peerPubkey: '',
      publicKey: '',
      nodePublicKey: '',
      name: '',
      nodeAddress: '',
      ontid: '',
      contract: '',
      stakeWalletAddress: '',
      commitmentQuantity: 0,
      transactionHash: '',
      status: 0,
    })
  })

  it('maps stake detail payloads to a canonical node shape', () => {
    const mapped = mapStakeDetail({
      publickey: 'stake-public-key',
      address: 'AQStake001',
      status: 8,
    })

    expect(mapped).toMatchObject({
      publicKey: 'stake-public-key',
      nodePublicKey: 'stake-public-key',
      pk: 'stake-public-key',
      peerPubkey: 'stake-public-key',
      nodeAddress: 'AQStake001',
      status: 8,
      name: 'Node_stake-',
    })
    expect(mapped).not.toHaveProperty('public_key')
    expect(mapped).not.toHaveProperty('publickey')
  })
})
