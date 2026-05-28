import type { Ref } from 'vue'
import {
  createVoteStopTransaction,
  syncAdminVotes,
} from '../../modules/governance/application/voteTopicApplicationService'
import { VOTE_STATUS_TEXT } from '../../stores/modules/Vote'
import type { NetworkId, WalletSigner } from '../../shared/lib/types'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

type VoteRow = Record<string, unknown>

interface VoteAdminOperationsDeps {
  tx: Ref<GovernanceSignablePayload>
  signVisible: Ref<boolean>
  allVotes: Ref<VoteRow[]>
  voteWallet: { value: WalletSigner | null | undefined }
  voteStore: unknown
  settingStore: { network: NetworkId }
}

export function useVoteAdminOperations(deps: VoteAdminOperationsDeps) {
  const { tx, signVisible, allVotes, voteWallet, settingStore } = deps
  const voteStore = deps.voteStore as {
    contractHash: string
    setContractHash: (hash: string) => void
    setAdminVotes: (votes: VoteRow[]) => void
  }

  function syncAdminVotesInStore(address = voteWallet.value?.address || '') {
    const result = syncAdminVotes({
      allVotes: allVotes.value,
      address,
    })
    voteStore.setAdminVotes(result.votes)
    return result
  }

  async function submitStopVote(vote: VoteRow, statusMap: Record<string, string>) {
    const statusText = String(vote.statusText || '')
    if (statusText === VOTE_STATUS_TEXT.CANCELED || statusText === VOTE_STATUS_TEXT.FINISHED) {
      return {
        ok: false as const,
        errorKey: 'vote.notAllowStop',
        statusText: statusMap[statusText] || '',
      }
    }

    const wallet = voteWallet.value || undefined
    const result = await createVoteStopTransaction({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
      hash: String(vote.hash || ''),
      voteWallet: wallet,
    })
    if (!result.ok) {
      return result
    }

    if (result.contractHash) {
      voteStore.setContractHash(result.contractHash)
    }
    tx.value = result.tx
    signVisible.value = true
    return { ok: true as const }
  }

  return {
    syncAdminVotesInStore,
    submitStopVote,
  }
}
