import i18n from '../../../../lang'
import {
  createStakeInfo,
  fetchNodeInfo as fetchNodeInfoFromService,
  fetchStakeDetail as fetchStakeDetailFromService,
  serializeNodeStakeInfo,
  updateLedgerNodeInfo as updateLedgerNodeInfoFromService,
  updateNodeInfo as updateNodeInfoFromService,
} from '../../../../domains/governance/nodeStakeDomainService'
import { createLogger } from '../../../../shared/lib/logger'
import { normalizeMutationResult, tryCatch } from '../../../../shared/lib/result'
import { createEmptyStakeDetail, mapStakeDetail } from '../../domain/stakeMapper'
import { NetworkId } from '../../../../shared/lib/types'

const logger = createLogger('nodeStakeApplicationService')
const NETWORK_ERROR_KEY = 'common.networkErr'
const UPDATE_NODE_INFO_ERROR_KEY = 'nodeInfo.updateFailed'
type NodeStakeRecord = Record<string, unknown>
type SerializedNodeInfo = string | NodeStakeRecord
const EMPTY_NODE_STAKE_PROFILE = {
  name: '',
  logoUrl: '',
  region: '',
  ip: '',
  introduction: '',
  website: '',
  telegram: '',
  twitter: '',
  facebook: '',
  contactEmail: '',
  publicEmail: '',
  isPublic: false,
}

export function createEmptyNodeStakeProfile() {
  return { ...EMPTY_NODE_STAKE_PROFILE }
}

export function createEmptyStakeStatus() {
  return {
    status1: '',
    status2: '',
    status3: '',
    current: 0,
    statusTip: '',
    btnText: '',
  }
}

export function mapNodeStakeProfile(info: NodeStakeRecord = {}) {
  return {
    ...createEmptyNodeStakeProfile(),
    name: info.name || '',
    logoUrl: info.logoUrl || info.logo_url || '',
    region: info.region || '',
    ip: info.ip || '',
    introduction: info.introduction || '',
    website: info.website || '',
    telegram: info.telegram || '',
    twitter: info.twitter || '',
    facebook: info.facebook || '',
    contactEmail: info.contactEmail || info.contact_mail || '',
    publicEmail: info.publicEmail || info.open_mail || '',
    isPublic: Boolean(info.isPublic ?? info.open_flag),
  }
}

function serializeNodeStakeProfile(info: NodeStakeRecord = {}) {
  const profile = mapNodeStakeProfile(info)

  return {
    name: profile.name,
    logo_url: profile.logoUrl,
    region: profile.region,
    ip: profile.ip,
    introduction: profile.introduction,
    website: profile.website,
    telegram: profile.telegram,
    twitter: profile.twitter,
    facebook: profile.facebook,
    contact_mail: profile.contactEmail,
    open_mail: profile.publicEmail,
    open_flag: profile.isPublic,
  }
}

function serializePendingNodeStakeInfo(info: NodeStakeRecord = {}) {
  const { publicKey, public_key: legacyPublicKey, ...rest } = info

  return {
    ...rest,
    public_key: publicKey || legacyPublicKey || '',
  }
}

export function createNodeStakeProfileDraft({
  info,
  nodePublicKey,
  address,
}: {
  info?: NodeStakeRecord
  nodePublicKey?: string
  address?: string
}) {
  const payload = {
    ...serializeNodeStakeProfile(info),
    public_key: nodePublicKey || '',
    address: address || '',
  }
  const nodeInfo = serializeNodeStakeInfo(payload)

  return {
    ok: true,
    nodeInfo,
    tx: nodeInfo,
    payload,
  }
}

function translateStakeStatus(key: string) {
  return i18n.global.t('nodeStakeStatus.' + key)
}

interface StakeStatusEntry {
  keys: [string, string, string]
  current?: number
  tip?: string
}

const STAKE_STATUS_TABLE: Record<number, StakeStatusEntry> = {
  0: { keys: ['transfering', 'audit', 'stake'], tip: 'transferNeedTime' },
  1: { keys: ['transferFailed', 'audit', 'stake'] },
  2: { keys: ['transfered', 'auditing', 'stake'], current: 1, tip: 'auditNeedTime' },
  3: { keys: ['transfered', 'auditFailed', 'stake'], current: 1 },
  4: { keys: ['nodeExited', 'refund', 'quitStake'], tip: 'unfrozenToRefund' },
  5: { keys: ['nodeExited', 'refunding', 'quitStake'], current: 1, tip: 'refundNeedTime' },
  6: { keys: ['nodeExited', 'refunded', 'stakeExited'], current: 2 },
  7: { keys: ['nodeExited', 'refundFailed', 'stakeExited'], current: 1 },
  8: { keys: ['transfered', 'audited', 'staked'], current: 2 },
  9: { keys: ['nodeExited', 'refund', 'quitStake'] },
  10: { keys: ['nodeExited', 'refund', 'quitStake'] },
}

export function describeStakeStatus(status: number) {
  const entry = STAKE_STATUS_TABLE[status]
  if (!entry) {
    return { status1: '', status2: '', status3: '', current: 0, statusTip: '' }
  }

  return {
    status1: translateStakeStatus(entry.keys[0]),
    status2: translateStakeStatus(entry.keys[1]),
    status3: translateStakeStatus(entry.keys[2]),
    current: entry.current ?? 0,
    statusTip: entry.tip ? translateStakeStatus(entry.tip) : '',
  }
}

export async function loadStakeDetail({
  network,
  payload = {},
}: {
  network: NetworkId
  payload?: NodeStakeRecord
}) {
  return tryCatch(
    async () => {
      const response = (await fetchStakeDetailFromService(network, payload)) as Record<
        string,
        unknown
      >
      const detail = mapStakeDetail(response)
      return { detail, stakeStatus: describeStakeStatus(Number(detail.status)) }
    },
    {
      context: 'loadStakeDetail',
      errorKey: NETWORK_ERROR_KEY,
      logger,
      onFailure: () => ({
        detail: createEmptyStakeDetail(),
        stakeStatus: createEmptyStakeStatus(),
      }),
    }
  )
}

export async function loadNodeStakeProfile({
  network,
  publicKey,
}: {
  network: NetworkId
  publicKey: string
}) {
  return tryCatch(
    async () => ({
      info: mapNodeStakeProfile(
        (await fetchNodeInfoFromService(network, publicKey)) as NodeStakeRecord
      ),
    }),
    {
      context: 'loadNodeStakeProfile',
      errorKey: NETWORK_ERROR_KEY,
      logger,
      onFailure: () => ({ info: createEmptyNodeStakeProfile() }),
    }
  )
}

export async function saveNodeStakeProfile({
  network,
  nodeInfo,
  walletPublicKey,
  address,
  signature,
}: {
  network: NetworkId
  nodeInfo: SerializedNodeInfo
  walletPublicKey: string
  address: string
  signature: string
}) {
  return tryCatch(
    async () =>
      normalizeMutationResult(
        await updateNodeInfoFromService(network, {
          node_info: nodeInfo,
          public_key: walletPublicKey,
          address,
          signature,
        }),
        UPDATE_NODE_INFO_ERROR_KEY
      ),
    { context: 'saveNodeStakeProfile', errorKey: NETWORK_ERROR_KEY, logger }
  )
}

export async function saveLedgerNodeStakeProfile({
  network,
  nodeInfo,
  walletPublicKey,
}: {
  network: NetworkId
  nodeInfo: SerializedNodeInfo
  walletPublicKey: string
}) {
  return tryCatch(
    async () =>
      normalizeMutationResult(
        await updateLedgerNodeInfoFromService(network, {
          node_info: nodeInfo,
          public_key: walletPublicKey,
        }),
        UPDATE_NODE_INFO_ERROR_KEY
      ),
    { context: 'saveLedgerNodeStakeProfile', errorKey: NETWORK_ERROR_KEY, logger }
  )
}

export async function createPendingNodeStakeInfo({
  network,
  info,
}: {
  network: NetworkId
  info: NodeStakeRecord
}) {
  return tryCatch(
    async () =>
      normalizeMutationResult(
        await createStakeInfo(network, serializePendingNodeStakeInfo(info)),
        NETWORK_ERROR_KEY
      ),
    { context: 'createPendingNodeStakeInfo', errorKey: NETWORK_ERROR_KEY, logger }
  )
}
