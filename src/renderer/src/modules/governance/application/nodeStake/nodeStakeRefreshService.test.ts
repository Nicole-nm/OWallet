import { beforeEach, describe, expect, it, vi } from 'vitest'

const auth = vi.hoisted(() => ({
  refreshAuthorizationNodeSettings: vi.fn(),
  refreshAuthorizationStakeInfo: vi.fn(),
}))
const stake = vi.hoisted(() => ({ loadStakeDetail: vi.fn() }))
const mapper = vi.hoisted(() => ({ normalizeNodePublicKey: vi.fn() }))

vi.mock('../authorization/authorizationQueryApplicationService', () => auth)
vi.mock('./nodeStakeApplicationService', () => stake)
vi.mock('../../domain/nodeMapper', () => mapper)

import {
  refreshNodeStakeAuthorizationDetails,
  refreshNodeStakeManagementDetails,
} from './nodeStakeRefreshService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('refreshNodeStakeManagementDetails', () => {
  it('rejects when address or public key is missing', async () => {
    expect(
      await refreshNodeStakeManagementDetails({
        network: 'MAIN_NET' as never,
        stakeWalletAddress: '',
        nodePublicKey: 'pk',
      })
    ).toMatchObject({ ok: false, errorKey: 'common.networkErr' })
  })

  it('returns the stake failure when stake detail fails', async () => {
    stake.loadStakeDetail.mockResolvedValue({ ok: false, errorKey: 'stakeErr' })
    auth.refreshAuthorizationStakeInfo.mockResolvedValue({ ok: true })
    const result = await refreshNodeStakeManagementDetails({
      network: 'MAIN_NET' as never,
      stakeWalletAddress: 'addr',
      nodePublicKey: 'pk',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'stakeErr' })
  })

  it('returns the authorization failure when authorization fails', async () => {
    stake.loadStakeDetail.mockResolvedValue({ ok: true, detail: {}, stakeStatus: 1 })
    auth.refreshAuthorizationStakeInfo.mockResolvedValue({ ok: false, errorKey: 'authErr' })
    const result = await refreshNodeStakeManagementDetails({
      network: 'MAIN_NET' as never,
      stakeWalletAddress: 'addr',
      nodePublicKey: 'pk',
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'authErr' })
  })

  it('merges stake and authorization data on success', async () => {
    stake.loadStakeDetail.mockResolvedValue({ ok: true, detail: { d: 1 }, stakeStatus: 2 })
    auth.refreshAuthorizationStakeInfo.mockResolvedValue({
      ok: true,
      currentPeer: { p: 1 },
      posLimit: 10,
      authorizationInfo: { a: 1 },
    })
    const result = await refreshNodeStakeManagementDetails({
      network: 'MAIN_NET' as never,
      stakeWalletAddress: 'addr',
      nodePublicKey: 'pk',
    })
    expect(result).toMatchObject({
      ok: true,
      detail: { d: 1 },
      stakeStatus: 2,
      currentPeer: { p: 1 },
      posLimit: 10,
      authorizationInfo: { a: 1 },
    })
  })
})

describe('refreshNodeStakeAuthorizationDetails', () => {
  it('rejects when the node public key cannot be derived', async () => {
    mapper.normalizeNodePublicKey.mockReturnValue('')
    const result = await refreshNodeStakeAuthorizationDetails({ stakeWalletAddress: 'addr' })
    expect(result).toMatchObject({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })

  it('delegates to refreshAuthorizationNodeSettings with the derived key', async () => {
    mapper.normalizeNodePublicKey.mockReturnValue('pk')
    auth.refreshAuthorizationNodeSettings.mockResolvedValue({ ok: true })
    const result = await refreshNodeStakeAuthorizationDetails({
      stakeDetail: {},
      stakeWalletAddress: 'addr',
    })
    expect(auth.refreshAuthorizationNodeSettings).toHaveBeenCalledWith({
      pk: 'pk',
      address: 'addr',
    })
    expect(result).toMatchObject({ ok: true })
  })
})
