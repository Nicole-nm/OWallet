import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  applyManagementContext: vi.fn(),
}))

vi.mock('./managementContextService', () => ({
  applyManagementContext: mocks.applyManagementContext,
}))

import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'
import { openAuthorizationLogin, openAuthorizationManagement } from './authorizationContextService'

function createNormalizedCurrentNode() {
  return {
    pk: 'node-public-key',
    peerPubkey: 'node-public-key',
    publicKey: 'node-public-key',
    nodePublicKey: 'node-public-key',
    public_key: 'node-public-key',
    publickey: 'node-public-key',
    name: 'Node A',
    nodeAddress: '',
    maxAuthorize: 0,
    maxAuthorizeStr: '0',
    totalPos: 0,
    totalPosStr: '0',
  }
}

describe('authorizationContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.applyManagementContext.mockReturnValue({
      ok: true,
      context: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: 'node-public-key',
        status: '',
        activeTab: 2,
      },
    })
  })

  it('builds authorization login state from the selected node context', () => {
    const currentNode = { publicKey: 'node-public-key', name: 'Node A' }
    const normalizedCurrentNode = createNormalizedCurrentNode()

    expect(
      openAuthorizationLogin({
        currentNode,
      })
    ).toEqual({
      ok: true,
      route: { name: ROUTE_NAMES.AUTHORIZE_LOGIN },
      authorizationContext: {
        currentNode: normalizedCurrentNode,
        stakeWallet: '',
      },
    })
  })

  it('builds authorization management state and normalized management context', () => {
    const currentNode = { publicKey: 'node-public-key', name: 'Node A' }
    const stakeWallet = { address: 'AQ123' }
    const normalizedCurrentNode = createNormalizedCurrentNode()

    expect(
      openAuthorizationManagement({
        currentNode,
        stakeWallet,
      })
    ).toEqual({
      ok: true,
      route: { name: ROUTE_NAMES.AUTHORIZATION_MGMT },
      authorizationContext: {
        currentNode: normalizedCurrentNode,
        stakeWallet,
      },
      managementContext: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: 'node-public-key',
        status: '',
        activeTab: 2,
      },
    })
    expect(mocks.applyManagementContext).toHaveBeenCalledWith({
      context: {
        stakeWallet,
        nodePublicKey: normalizedCurrentNode,
        activeTab: 2,
      },
    })
  })
})
