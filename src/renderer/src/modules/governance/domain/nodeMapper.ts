import { GOVERNANCE_STATUS } from '../../../shared/lib/constants'

export const PUBLIC_KEY_FIELD_ALIASES = [
  'pk',
  'peerPubkey',
  'publicKey',
  'nodePublicKey',
  'public_key',
  'publickey',
] as const

type NodeRecord = Record<string, unknown>

interface MappedNodeRecord extends NodeRecord {
  publicKey: string
  nodeAddress: string
  name: string
}

function toRecord(value: unknown): NodeRecord {
  return value && typeof value === 'object' ? (value as NodeRecord) : {}
}

export function normalizeNodePublicKey(nodeOrKey: unknown) {
  if (!nodeOrKey) {
    return ''
  }

  if (typeof nodeOrKey === 'string') {
    return nodeOrKey
  }

  const record = toRecord(nodeOrKey)
  for (const alias of PUBLIC_KEY_FIELD_ALIASES) {
    if (record[alias]) {
      return String(record[alias])
    }
  }

  return ''
}

function projectPublicKeyAliases(record: NodeRecord, publicKey: string) {
  const projection: Record<string, string> = {}
  for (const alias of PUBLIC_KEY_FIELD_ALIASES) {
    projection[alias] = String(record[alias] || publicKey)
  }
  return projection
}

export function mapOffChainNodeRecord(record: NodeRecord = {}): MappedNodeRecord {
  const publicKey = normalizeNodePublicKey(record)

  return {
    ...record,
    ...projectPublicKeyAliases(record, publicKey),
    publicKey,
    nodeAddress: String(record.nodeAddress || record.address || ''),
    name: String(record.name || (publicKey ? 'Node_' + publicKey.slice(0, 6) : '')),
  }
}

export function mapMyNodeCard({ wallet, offChainNode, peer }: NodeRecord) {
  const walletRecord = toRecord(wallet)
  const peerRecord = peer ? toRecord(peer) : null
  const node = mapOffChainNodeRecord(toRecord(offChainNode))

  return {
    publicKey: node.publicKey,
    stakeAddress: walletRecord.address,
    stakeWallet: walletRecord,
    name: node.name,
    stakeAmount: peerRecord
      ? Number(peerRecord.initPos || 0) + Number(peerRecord.totalPos || 0)
      : 0,
    status: peerRecord ? peerRecord.status : GOVERNANCE_STATUS.EXITED,
  }
}
