import i18n from '../../../lang'
import {
  createStakeInfo,
  fetchNodeInfo as fetchNodeInfoFromService,
  fetchStakeDetail as fetchStakeDetailFromService,
  serializeNodeStakeInfo,
  updateLedgerNodeInfo as updateLedgerNodeInfoFromService,
  updateNodeInfo as updateNodeInfoFromService,
} from '../../../domains/nodeStake/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { normalizeMutationResult, tryCatch } from '../../../shared/lib/result'
import { createEmptyStakeDetail, mapStakeDetail } from '../domain/stakeMapper'
import { NetworkId } from '../../../shared/lib/types'

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

export function describeStakeStatus(status: number) {
  let status1 = ''
  let status2 = ''
  let status3 = ''
  let current = 0
  let statusTip = ''

  switch (status) {
    case 0:
      status1 = translateStakeStatus('transfering')
      status2 = translateStakeStatus('audit')
      status3 = translateStakeStatus('stake')
      statusTip = translateStakeStatus('transferNeedTime')
      break
    case 1:
      status1 = translateStakeStatus('transferFailed')
      status2 = translateStakeStatus('audit')
      status3 = translateStakeStatus('stake')
      break
    case 2:
      status1 = translateStakeStatus('transfered')
      status2 = translateStakeStatus('auditing')
      status3 = translateStakeStatus('stake')
      statusTip = translateStakeStatus('auditNeedTime')
      current = 1
      break
    case 3:
      status1 = translateStakeStatus('transfered')
      status2 = translateStakeStatus('auditFailed')
      status3 = translateStakeStatus('stake')
      current = 1
      break
    case 4:
      status1 = translateStakeStatus('nodeExited')
      status2 = translateStakeStatus('refund')
      status3 = translateStakeStatus('quitStake')
      statusTip = translateStakeStatus('unfrozenToRefund')
      break
    case 5:
      status1 = translateStakeStatus('nodeExited')
      status2 = translateStakeStatus('refunding')
      status3 = translateStakeStatus('quitStake')
      statusTip = translateStakeStatus('refundNeedTime')
      current = 1
      break
    case 6:
      status1 = translateStakeStatus('nodeExited')
      status2 = translateStakeStatus('refunded')
      status3 = translateStakeStatus('stakeExited')
      current = 2
      break
    case 7:
      status1 = translateStakeStatus('nodeExited')
      status2 = translateStakeStatus('refundFailed')
      status3 = translateStakeStatus('stakeExited')
      current = 1
      break
    case 8:
      status1 = translateStakeStatus('transfered')
      status2 = translateStakeStatus('audited')
      status3 = translateStakeStatus('staked')
      current = 2
      break
    case 9:
    case 10:
      status1 = translateStakeStatus('nodeExited')
      status2 = translateStakeStatus('refund')
      status3 = translateStakeStatus('quitStake')
      break
    default:
      break
  }

  return { status1, status2, status3, current, statusTip }
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
