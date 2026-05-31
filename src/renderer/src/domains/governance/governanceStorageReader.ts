/**
 * governanceStorageReader.ts
 *
 * Read-only accessors for on-chain governance state (peer pool, peer
 * attributes, authorize info, split fee, global params, unbound ONG). These
 * decode the contract's binary storage payloads via the typed
 * {@link deserialize} helper, keeping the transaction builders focused on
 * building transactions.
 */

import { getRestClient } from '../../shared/chain/restClient'
import { deserialize, type StringReaderLike } from '../../shared/chain/storageCodec'
import type { RestProxy } from '../../shared/network/restProxy'
import type {
  AuthorizationInfo,
  PeerPoolEntry,
  PeerAttributes,
  SplitFeeAddress,
  GlobalParam,
} from './types'
import { loadGovernanceSdk } from './governanceSdkLoader'

/** Byte length of an Ontology address in binary form (matches voteParser.ADDR_BYTES). */
const ADDR_BYTES = 20

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

async function readStorage(client: StorageClient, key: string): Promise<StringReaderLike | null> {
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
    const peer = deserialize<PeerPoolEntry>(sr, {
      index: (r) => r.readInt(),
      peerPubkey: (r) => utils.hexstr2str(r.readNextBytes()),
      address: (r) => new Crypto.Address(r.read(ADDR_BYTES)).toBase58(),
      status: (r) => r.readUint8(),
      initPos: (r) => r.readLong(),
      totalPos: (r) => r.readLong(),
    })
    peerMap[peer.peerPubkey] = peer
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
  const pr = deserialize<PeerAttributes>(sr, {
    peerPubkey: (r) => utils.hexstr2str(r.readNextBytes()),
    maxAuthorize: (r) => r.readLong(),
    t2PeerCost: (r) => r.readLong(),
    t1PeerCost: (r) => r.readLong(),
    tPeerCost: (r) => r.readLong(),
    t2StakeCost: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    t1StakeCost: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    tStakeCost: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
  })
  if (pr.t2StakeCost === 0) pr.t2StakeCost = pr.t2PeerCost
  if (pr.t1StakeCost === 0) pr.t1StakeCost = pr.t1PeerCost
  if (pr.tStakeCost === 0) pr.tStakeCost = pr.tPeerCost
  if (pr.t2StakeCost === 101) pr.t2StakeCost = 0
  if (pr.t1StakeCost === 101) pr.t1StakeCost = 0
  if (pr.tStakeCost === 101) pr.tStakeCost = 0
  return pr
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
  return deserialize<AuthorizationInfo & { peerPubkey: string; address: unknown }>(sr, {
    peerPubkey: (r) => utils.hexstr2str(r.readNextBytes()),
    address: (r) => new Crypto.Address(r.read(ADDR_BYTES)),
    consensusPos: (r) => r.readLong(),
    freezePos: (r) => r.readLong(),
    newPos: (r) => r.readLong(),
    withdrawPos: (r) => r.readLong(),
    withdrawFreezePos: (r) => r.readLong(),
    withdrawUnfreezePos: (r) => r.readLong(),
  })
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
  return deserialize<SplitFeeAddress>(sr, {
    address: (r) => new Crypto.Address(r.read(ADDR_BYTES)),
    amount: (r) => r.readLong(),
  })
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
  return deserialize<GlobalParam>(sr, {
    candidateFee: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    minInitState: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    candidateNum: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    posLimit: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    A: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    B: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    yita: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
    penalty: (r) => Number(utils.bigIntFromBytes(r.readNextBytes())),
  })
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
