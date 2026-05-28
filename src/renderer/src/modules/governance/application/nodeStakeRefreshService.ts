import {
  refreshAuthorizationNodeSettings,
  refreshAuthorizationStakeInfo,
} from './authorizationQueryApplicationService'
import { loadStakeDetail } from './nodeStakeApplicationService'
import { normalizeNodePublicKey } from '../domain/nodeMapper'
import type { NetworkId } from '../../../shared/lib/types'

export async function refreshNodeStakeManagementDetails({
  network,
  stakeWalletAddress,
  nodePublicKey,
}: {
  network: NetworkId
  stakeWalletAddress: string
  nodePublicKey: string
}) {
  if (!stakeWalletAddress || !nodePublicKey) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  const [stakeResult, authorizationResult] = await Promise.all([
    loadStakeDetail({
      network,
      payload: {
        address: stakeWalletAddress,
        publicKey: nodePublicKey,
      },
    }),
    refreshAuthorizationStakeInfo({
      pk: nodePublicKey,
      address: stakeWalletAddress,
    }),
  ])

  if (!stakeResult.ok) {
    return stakeResult
  }

  if (!authorizationResult.ok) {
    return authorizationResult
  }

  return {
    ok: true,
    detail: stakeResult.detail,
    stakeStatus: stakeResult.stakeStatus,
    currentPeer: authorizationResult.currentPeer,
    posLimit: authorizationResult.posLimit,
    authorizationInfo: authorizationResult.authorizationInfo,
  }
}

export async function refreshNodeStakeAuthorizationDetails({
  stakeDetail,
  stakeWalletAddress,
}: {
  stakeDetail?: Record<string, unknown>
  stakeWalletAddress: string
}) {
  const nodePublicKey = normalizeNodePublicKey(stakeDetail)

  if (!nodePublicKey) {
    return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
  }

  return refreshAuthorizationNodeSettings({
    pk: nodePublicKey,
    address: stakeWalletAddress,
  })
}
