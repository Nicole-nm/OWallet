import { fetchOffChainNodes, fetchPeerPoolMap } from '../../../../domains/governance/queryService'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import { mapMyNodeCard, mapOffChainNodeRecord } from '../../domain/nodeMapper'

const logger = createLogger('governanceQueryApplicationService')

type NodeRecord = Record<string, unknown>

function groupOffChainNodesByAddress(records: unknown[]) {
  const resultMap: Record<string, NodeRecord[]> = Object.create(null)

  for (const record of records) {
    const node = mapOffChainNodeRecord(record as NodeRecord)
    if (node.nodeAddress) {
      const bucket = resultMap[node.nodeAddress] || (resultMap[node.nodeAddress] = [])
      bucket.push(node)
    }
  }

  return resultMap
}

export async function loadMyNodeCards({
  network,
  wallets = [],
}: {
  network: string
  wallets?: NodeRecord[]
}) {
  return tryCatch(
    async () => {
      const [peers, records] = await Promise.all([fetchPeerPoolMap(), fetchOffChainNodes(network)])
      const offChainNodesByAddress = groupOffChainNodesByAddress(
        Array.isArray(records) ? records : []
      )
      const peerMap = peers as Record<string, unknown>
      const myNodes: NodeRecord[] = []

      for (const wallet of wallets) {
        const offChainNodes = offChainNodesByAddress[String(wallet.address || '')]

        if (!offChainNodes || offChainNodes.length === 0) {
          continue
        }

        for (const offChainNode of offChainNodes) {
          myNodes.push(
            mapMyNodeCard({
              wallet,
              offChainNode,
              peer: peerMap[String(offChainNode.publicKey || '')],
            })
          )
        }
      }

      return { nodes: myNodes }
    },
    {
      context: 'loadMyNodeCards',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ nodes: [] as unknown[] }),
    }
  )
}
