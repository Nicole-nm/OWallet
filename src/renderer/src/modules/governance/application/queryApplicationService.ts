import { fetchOffChainNodes, fetchPeerPoolMap } from '../../../domains/governance/queryService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { mapMyNodeCard, mapOffChainNodeRecord } from '../domain/nodeMapper'

const logger = createLogger('governanceQueryApplicationService')

type NodeRecord = Record<string, unknown>

function indexOffChainNodesByAddress(records: unknown[]) {
  const resultMap: Record<string, NodeRecord> = Object.create(null)

  for (const record of records) {
    const node = mapOffChainNodeRecord(record as NodeRecord)
    if (node.nodeAddress) {
      resultMap[node.nodeAddress] = node
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
      const offChainNodesByAddress = indexOffChainNodesByAddress(
        Array.isArray(records) ? records : []
      )
      const peerMap = peers as Record<string, unknown>
      const myNodes: NodeRecord[] = []

      for (const wallet of wallets) {
        const offChainNode = offChainNodesByAddress[String(wallet.address || '')]

        if (!offChainNode) {
          continue
        }

        myNodes.push(
          mapMyNodeCard({
            wallet,
            offChainNode,
            peer: peerMap[String(offChainNode.publicKey || '')],
          })
        )
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
