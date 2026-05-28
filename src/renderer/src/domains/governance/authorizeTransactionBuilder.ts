/**
 * authorizeTransactionBuilder.ts
 *
 * Transaction builders and storage readers related to authorization staking
 * (authorize, unauthorize, withdraw) and governance state queries
 * (peer pool, attributes, authorize info, split fee, global params, unbound ONG).
 */

import { GAS_PRICE, GAS_LIMIT } from '../../shared/lib/constants'

/** Byte length of an Ontology address in binary form (matches voteParser.ADDR_BYTES). */
const ADDR_BYTES = 20
import { getRestClient } from '../../shared/chain/restClient'
import type { RestProxy } from '../../shared/network/restProxy'
import type {
  AuthorizationInfo,
  PeerPoolEntry,
  PeerAttributes,
  SplitFeeAddress,
  GlobalParam,
} from './types'
import { loadGovernanceSdk, resolveGovContext } from './governanceSdkLoader'
import type { SdkTransactionLike } from '../../shared/chain/types'

function createStakeTxBuilder(method: string) {
  return async (
    address: string | { serialize: () => string },
    peerPKs: string[],
    amounts: (number | string)[],
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    const builder = GovernanceTxBuilder as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >
    return builder[method]!(
      userAddr,
      peerPKs,
      amounts,
      payerAddr,
      gasPrice,
      gasLimit
    ) as SdkTransactionLike
  }
}

function createPeerValueTxBuilder(method: string) {
  return async (
    peerPubkey: string,
    address: string | { serialize: () => string },
    value: number | string,
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    const builder = GovernanceTxBuilder as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >
    return builder[method]!(
      peerPubkey,
      userAddr,
      value,
      payerAddr,
      gasPrice,
      gasLimit
    ) as SdkTransactionLike
  }
}

function createSimpleTxBuilder(method: string) {
  return async (
    address: string | { serialize: () => string },
    payer?: string | { serialize: () => string },
    gasPrice = GAS_PRICE,
    gasLimit = GAS_LIMIT
  ): Promise<SdkTransactionLike> => {
    const { GovernanceTxBuilder, userAddr, payerAddr } = await resolveGovContext(address, payer)
    const builder = GovernanceTxBuilder as unknown as Record<
      string,
      (...args: unknown[]) => unknown
    >
    return builder[method]!(userAddr, payerAddr, gasPrice, gasLimit) as SdkTransactionLike
  }
}

// ---------------------------------------------------------------------------
// Authorization stake transaction builders
// ---------------------------------------------------------------------------

export const buildAuthorizeForPeer = createStakeTxBuilder('makeAuthorizeForPeerTx')
export const buildUnauthorizeForPeer = createStakeTxBuilder('makeUnauthorizeForPeerTx')
export const buildWithdraw = createStakeTxBuilder('makeWithdrawTx')

export const buildAddInitPos = createPeerValueTxBuilder('makeAddInitPosTx')
export const buildReduceInitPos = createPeerValueTxBuilder('makeReduceInitPosTx')
export const buildChangeAuthorization = createPeerValueTxBuilder('makeChangeAuthorizationTx')

export const buildWithdrawFee = createSimpleTxBuilder('makeWithdrawFeeTx')
export const buildWithdrawPeerUnboundOng = createSimpleTxBuilder('makeWithdrawPeerUnboundOngTx')

// ---------------------------------------------------------------------------
// Governance storage constants
// ---------------------------------------------------------------------------

const GOVERNANCE_CONTRACT = '0700000000000000000000000000000000000000'
const GENESIS_BLOCK_TIMESTAMP = 1530316800

function hexEncodeStr(str: string) {
  return Buffer.from(str, 'utf8').toString('hex')
}

async function intToLE32Hex(n: number | string) {
  const { utils } = await loadGovernanceSdk()
  let hex = n.toString(16)
  while (hex.length < 8) hex = '0' + hex
  return utils.reverseHex(hex)
}

type StorageClient = Pick<RestProxy, 'getStorage'>

async function readStorage(client: StorageClient, key: string) {
  const { utils } = await loadGovernanceSdk()
  const res = await client.getStorage(GOVERNANCE_CONTRACT, key)
  const result = res.Result
  if (!result || typeof result !== 'string') return null
  return new utils.StringReader(result)
}

async function getGovernanceView(client: StorageClient) {
  const sr = await readStorage(client, hexEncodeStr('governanceView'))
  if (!sr) throw new Error('No governance view found')
  return { view: sr.readUint32(), height: sr.readUint32() }
}

// ---------------------------------------------------------------------------
// Governance storage readers
// ---------------------------------------------------------------------------

export async function getPeerPoolMap(): Promise<Record<string, PeerPoolEntry>> {
  const { Crypto, utils } = await loadGovernanceSdk()
  const client = getRestClient()
  const govView = await getGovernanceView(client)
  const key = hexEncodeStr('peerPool') + (await intToLE32Hex(govView.view))
  const sr = await readStorage(client, key)
  if (!sr) return {}

  const count = sr.readInt()
  const peerMap: Record<string, PeerPoolEntry> = {}
  for (let i = 0; i < count; i++) {
    const peer: Record<string, unknown> = {}
    peer.index = sr.readInt()
    peer.peerPubkey = utils.hexstr2str(sr.readNextBytes())
    peer.address = new Crypto.Address(sr.read(ADDR_BYTES)).toBase58()
    peer.status = sr.readUint8()
    peer.initPos = sr.readLong()
    peer.totalPos = sr.readLong()
    peerMap[peer.peerPubkey as string] = peer as unknown as PeerPoolEntry
  }
  return peerMap
}

export async function getAttributes(peerPubKey: string): Promise<PeerAttributes> {
  const { utils } = await loadGovernanceSdk()
  const client = getRestClient()
  const key = hexEncodeStr('peerAttributes') + peerPubKey
  const sr = await readStorage(client, key)
  if (!sr) {
    return {
      peerPubkey: '',
      maxAuthorize: 0,
      t2PeerCost: 100,
      t1PeerCost: 100,
      tPeerCost: 100,
      t2StakeCost: 100,
      t1StakeCost: 100,
      tStakeCost: 100,
    }
  }
  const pr: Record<string, unknown> = {}
  pr.peerPubkey = utils.hexstr2str(sr.readNextBytes())
  pr.maxAuthorize = sr.readLong()
  pr.t2PeerCost = sr.readLong()
  pr.t1PeerCost = sr.readLong()
  pr.tPeerCost = sr.readLong()
  pr.t2StakeCost = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  pr.t1StakeCost = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  pr.tStakeCost = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  if (pr.t2StakeCost === 0) pr.t2StakeCost = pr.t2PeerCost
  if (pr.t1StakeCost === 0) pr.t1StakeCost = pr.t1PeerCost
  if (pr.tStakeCost === 0) pr.tStakeCost = pr.tPeerCost
  if (pr.t2StakeCost === 101) pr.t2StakeCost = 0
  if (pr.t1StakeCost === 101) pr.t1StakeCost = 0
  if (pr.tStakeCost === 101) pr.tStakeCost = 0
  return pr as unknown as PeerAttributes
}

export async function getAuthorizeInfo(
  peerPubKey: string,
  userAddr: string | { serialize: () => string }
): Promise<AuthorizationInfo & { peerPubkey: string; address: unknown }> {
  const { Crypto, utils } = await loadGovernanceSdk()
  const client = getRestClient()
  const addrHex =
    typeof userAddr === 'string' ? new Crypto.Address(userAddr).serialize() : userAddr.serialize()
  const key = hexEncodeStr('voteInfoPool') + peerPubKey + addrHex
  const sr = await readStorage(client, key)
  if (!sr) {
    return {
      peerPubkey: '',
      address: null as unknown,
      consensusPos: 0,
      freezePos: 0,
      newPos: 0,
      withdrawPos: 0,
      withdrawFreezePos: 0,
      withdrawUnfreezePos: 0,
    }
  }
  const ai: Record<string, unknown> = {}
  ai.peerPubkey = utils.hexstr2str(sr.readNextBytes())
  ai.address = new Crypto.Address(sr.read(ADDR_BYTES))
  ai.consensusPos = sr.readLong()
  ai.freezePos = sr.readLong()
  ai.newPos = sr.readLong()
  ai.withdrawPos = sr.readLong()
  ai.withdrawFreezePos = sr.readLong()
  ai.withdrawUnfreezePos = sr.readLong()
  return ai as unknown as AuthorizationInfo & {
    peerPubkey: string
    address: unknown
  }
}

export async function getSplitFeeAddress(
  userAddr: string | { serialize: () => string }
): Promise<SplitFeeAddress> {
  const { Crypto } = await loadGovernanceSdk()
  const client = getRestClient()
  const addrHex =
    typeof userAddr === 'string' ? new Crypto.Address(userAddr).serialize() : userAddr.serialize()
  const key = hexEncodeStr('splitFeeAddress') + addrHex
  const sr = await readStorage(client, key)
  if (!sr) return { address: null as unknown, amount: 0 as number | string }
  const sfa: Record<string, unknown> = {}
  sfa.address = new Crypto.Address(sr.read(ADDR_BYTES))
  sfa.amount = sr.readLong()
  return sfa as unknown as SplitFeeAddress
}

export async function getGlobalParam(): Promise<GlobalParam> {
  const { utils } = await loadGovernanceSdk()
  const client = getRestClient()
  const key = hexEncodeStr('globalParam')
  const sr = await readStorage(client, key)
  if (!sr) {
    return {
      candidateFee: 0,
      minInitState: 0,
      candidateNum: 0,
      posLimit: 10,
      A: 0,
      B: 0,
      yita: 0,
      penalty: 0,
    }
  }
  const gp: Record<string, unknown> = {}
  gp.candidateFee = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.minInitState = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.candidateNum = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.posLimit = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.A = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.B = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.yita = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  gp.penalty = Number(utils.bigIntFromBytes(sr.readNextBytes()))
  return gp as unknown as GlobalParam
}

export async function getPeerUnboundOng(userAddr: string | { serialize: () => string }) {
  const { Crypto, utils } = await loadGovernanceSdk()
  const client = getRestClient()
  const addrHex =
    typeof userAddr === 'string' ? new Crypto.Address(userAddr).serialize() : userAddr.serialize()
  const key = hexEncodeStr('totalStake') + addrHex
  const sr = await readStorage(client, key)
  if (!sr) return 0

  const address = new Crypto.Address(sr.read(ADDR_BYTES))
  if (!address) return 0
  const stake = sr.readLong()
  const timeOffset = sr.readUint32()
  const blockHeight = (await client.getBlockHeight()).Result
  const block = (await client.getBlockJson(blockHeight)).Result as {
    Header: { Timestamp: number }
  }
  const timeStamp = block.Header.Timestamp - GENESIS_BLOCK_TIMESTAMP

  return utils.calcUnboundOng(stake, timeOffset, timeStamp) as number
}
