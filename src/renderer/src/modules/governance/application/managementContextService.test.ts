import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  normalizeNodePublicKey: vi.fn(),
}))

vi.mock('../domain/nodeMapper', () => ({
  normalizeNodePublicKey: mocks.normalizeNodePublicKey,
}))

import { ROUTE_NAMES } from '../../../shared/navigation/routeNames'
import {
  applyManagementContext,
  openNodeManagement,
  syncManagementContextFromSession,
} from './managementContextService'

function createNodeSessionStore() {
  return {
    selectedStakeWallet: null,
    selectedNodePublicKey: '',
    selectedStatus: '',
    activeManagementTab: 1,
  }
}

describe('managementContextService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.normalizeNodePublicKey.mockImplementation((value) => {
      if (typeof value === 'string') {
        return value
      }
      return value?.publicKey || value?.nodePublicKey || value?.pk || ''
    })
  })

  it('returns normalized management context without mutating stores', () => {
    const stakeWallet = { address: 'AQ123' }

    const result = applyManagementContext({
      context: {
        stakeWallet,
        nodePublicKey: { publicKey: 'public-key-1' },
        status: 8,
        activeTab: 3,
      },
    })

    expect(result).toEqual({
      ok: true,
      context: {
        stakeWallet,
        nodePublicKey: 'public-key-1',
        status: 8,
        activeTab: 3,
      },
    })
  })

  it('prefers session context when the session store is populated', () => {
    const result = syncManagementContextFromSession({
      sessionContext: {
        stakeWallet: { address: 'AQ999' },
        nodePublicKey: 'session-public-key',
        status: 5,
        activeTab: 2,
      },
      fallbackContext: {
        stakeWallet: null,
        nodePublicKey: '',
        status: '',
        activeTab: 1,
      },
    })

    expect(result).toEqual({
      ok: true,
      context: {
        stakeWallet: { address: 'AQ999' },
        nodePublicKey: 'session-public-key',
        status: 5,
        activeTab: 2,
      },
    })
  })

  it('falls back to legacy store state when session context is absent', () => {
    const result = syncManagementContextFromSession({
      sessionContext: createNodeSessionStore(),
      fallbackContext: {
        stakeWallet: { address: 'AQ111' },
        nodePublicKey: 'legacy-public-key',
        status: 9,
        activeTab: 1,
      },
    })

    expect(result).toEqual({
      ok: true,
      context: {
        stakeWallet: { address: 'AQ111' },
        nodePublicKey: 'legacy-public-key',
        status: 9,
        activeTab: 1,
      },
    })
  })

  it('builds navigation payloads for node management', () => {
    const result = openNodeManagement({
      context: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: { publicKey: 'public-key-1' },
        status: 8,
        activeTab: 3,
      },
    })

    expect(result).toEqual({
      ok: true,
      route: { name: ROUTE_NAMES.NODE_STAKE_MANAGEMENT },
      context: {
        stakeWallet: { address: 'AQ123' },
        nodePublicKey: 'public-key-1',
        status: 8,
        activeTab: 3,
      },
    })
  })
})
