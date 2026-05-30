import {
  buildAddInitPos,
  buildAuthorizeForPeer,
  buildChangeAuthorization,
  buildQuitNode,
  buildReduceInitPos,
  buildRegisterCandidate,
  buildSetFeePercentage,
  buildUnauthorizeForPeer,
  buildUnregisterCandidate,
  buildWithdraw,
  buildWithdrawFee,
  buildWithdrawPeerUnboundOng,
} from './transactionBuilder'

export async function createAuthorizationTransaction({
  stakeWalletAddress,
  nodePublicKey,
  amount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  amount: number | string
}) {
  return buildAuthorizeForPeer(stakeWalletAddress, [nodePublicKey], [amount])
}

export async function createUnauthorizationTransaction({
  stakeWalletAddress,
  nodePublicKey,
  amount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  amount: number | string
}) {
  return buildUnauthorizeForPeer(stakeWalletAddress, [nodePublicKey], [amount])
}

export async function createWithdrawAuthorizationTransaction({
  stakeWalletAddress,
  nodePublicKey,
  amount,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
  amount: number | string
}) {
  return buildWithdraw(stakeWalletAddress, [nodePublicKey], [amount])
}

export async function createRegisterCandidateTransaction({
  ontid,
  publicKey,
  initPos,
  stakeWalletAddress,
}: {
  ontid: string
  publicKey: string
  initPos: number | string
  stakeWalletAddress: string
}) {
  return buildRegisterCandidate(
    ontid,
    publicKey,
    1,
    stakeWalletAddress,
    initPos,
    stakeWalletAddress
  )
}

export async function createUnregisterCandidateTransaction({
  stakeWalletAddress,
  nodePublicKey,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
}) {
  return buildUnregisterCandidate(stakeWalletAddress, nodePublicKey)
}

export async function createQuitNodeTransaction({
  stakeWalletAddress,
  nodePublicKey,
}: {
  stakeWalletAddress: string
  nodePublicKey: string
}) {
  return buildQuitNode(stakeWalletAddress, nodePublicKey)
}

export async function createAddInitPosTransaction({
  nodePublicKey,
  stakeWalletAddress,
  amount,
}: {
  nodePublicKey: string
  stakeWalletAddress: string
  amount: number | string
}) {
  return buildAddInitPos(nodePublicKey, stakeWalletAddress, amount)
}

export async function createReduceInitPosTransaction({
  nodePublicKey,
  stakeWalletAddress,
  amount,
}: {
  nodePublicKey: string
  stakeWalletAddress: string
  amount: number | string
}) {
  return buildReduceInitPos(nodePublicKey, stakeWalletAddress, amount)
}

export async function createChangeAuthorizationTransaction({
  nodePublicKey,
  stakeWalletAddress,
  maxAuthorize,
}: {
  nodePublicKey: string
  stakeWalletAddress: string
  maxAuthorize: number | string
}) {
  return buildChangeAuthorization(nodePublicKey, stakeWalletAddress, maxAuthorize)
}

export async function createSetFeePercentageTransaction({
  nodePublicKey,
  stakeWalletAddress,
  peerCost,
  stakeCost,
}: {
  nodePublicKey: string
  stakeWalletAddress: string
  peerCost: number | string
  stakeCost: number | string
}) {
  return buildSetFeePercentage(
    nodePublicKey,
    stakeWalletAddress,
    peerCost,
    stakeCost,
    stakeWalletAddress
  )
}

export async function createWithdrawFeeTransaction({
  stakeWalletAddress,
}: {
  stakeWalletAddress: string
}) {
  return buildWithdrawFee(stakeWalletAddress)
}

export async function createWithdrawPeerUnboundOngTransaction({
  stakeWalletAddress,
}: {
  stakeWalletAddress: string
}) {
  return buildWithdrawPeerUnboundOng(stakeWalletAddress)
}
