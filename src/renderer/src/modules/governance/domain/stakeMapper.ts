import { createEmptyFromTemplate } from '../../../shared/lib/factory'
import { mapOffChainNodeRecord } from './nodeMapper'

const EMPTY_STAKE_DETAIL = {
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
}

export function createEmptyStakeDetail() {
  return createEmptyFromTemplate(EMPTY_STAKE_DETAIL)
}

export function mapStakeDetail(detail: Record<string, unknown> = {}) {
  if (!detail || typeof detail !== 'object') {
    return createEmptyStakeDetail()
  }

  const mappedNode = mapOffChainNodeRecord(detail)
  delete mappedNode.public_key
  delete mappedNode.publickey
  const normalizedStatus =
    detail.status === '' || detail.status === undefined || detail.status === null
      ? detail.status
      : Number(detail.status)
  const normalizedCommitmentQuantity =
    detail.commitmentQuantity === '' ||
    detail.commitmentQuantity === undefined ||
    detail.commitmentQuantity === null
      ? detail.commitmentquantity || 0
      : Number(detail.commitmentQuantity)

  return {
    ...mappedNode,
    ontid: detail.ontid || '',
    contract: detail.contract || '',
    stakeWalletAddress: detail.stakeWalletAddress || detail.stakewalletaddress || '',
    commitmentQuantity: Number.isNaN(normalizedCommitmentQuantity)
      ? detail.commitmentQuantity
      : normalizedCommitmentQuantity,
    transactionHash: detail.transactionHash || detail.transactionhash || '',
    status: Number.isNaN(normalizedStatus) ? detail.status : normalizedStatus,
  }
}
