import { createEmptyFromTemplate } from '../../shared/lib/factory'
import { mapOffChainNodeRecord } from './nodeMapper'
import type { StakeDetail } from '../../shared/types'

const EMPTY_STAKE_DETAIL: StakeDetail = {
  pk: '',
  peerPubkey: '',
  publicKey: '',
  nodePublicKey: '',
  name: '',
  nodeAddress: '',
  ontid: '',
  stakeWalletAddress: '',
  commitmentQuantity: 0,
  transactionHash: '',
  status: 0,
}

export function createEmptyStakeDetail() {
  return createEmptyFromTemplate(EMPTY_STAKE_DETAIL)
}

function toText(value: unknown): string {
  if (typeof value === 'string') return value
  if (value === null || value === undefined) return ''
  return String(value)
}

function toAmount(value: unknown, fallback: unknown = 0): number {
  const candidate = value === '' || value === undefined || value === null ? fallback : value
  const amount = Number(candidate)
  return Number.isNaN(amount) ? 0 : amount
}

export function mapStakeDetail(detail: Record<string, unknown> = {}): StakeDetail {
  if (!detail || typeof detail !== 'object') {
    return createEmptyStakeDetail()
  }

  const mappedNode = mapOffChainNodeRecord(detail)

  return {
    pk: toText(mappedNode.pk),
    peerPubkey: toText(mappedNode.peerPubkey),
    publicKey: mappedNode.publicKey,
    nodePublicKey: toText(mappedNode.nodePublicKey),
    name: mappedNode.name,
    nodeAddress: mappedNode.nodeAddress,
    ontid: toText(detail.ontid),
    stakeWalletAddress: toText(detail.stakeWalletAddress || detail.stakewalletaddress),
    commitmentQuantity: toAmount(detail.commitmentQuantity, detail.commitmentquantity),
    transactionHash: toText(detail.transactionHash || detail.transactionhash),
    status: toAmount(detail.status),
  }
}
