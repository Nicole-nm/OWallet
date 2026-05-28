import type { Ref } from 'vue'
import {
  createVoteDecisionTransaction,
  createVoteStopTransaction,
} from '../../modules/governance/application/voteTopicApplicationService'
import { MY_VOTED, VOTE_STATUS_TEXT } from '../../stores/modules/Vote'
import type { NetworkId, WalletSigner } from '../../shared/lib/types'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

interface VoteOperationTopic {
  [key: string]: unknown
  hash?: unknown
  statusText?: unknown
}

interface VoteOperationsDeps {
  tx: Ref<GovernanceSignablePayload>
  signVisible: Ref<boolean>
  myVoted: Ref<string>
  vote: { value: VoteOperationTopic }
  voteWallet: { value: WalletSigner | null | undefined }
  voteStore: {
    contractHash: string
    setContractHash: (hash: string) => void
  }
  settingStore: { network: NetworkId }
}

function getVoteStatusText(vote: VoteOperationTopic) {
  return typeof vote.statusText === 'string' ? vote.statusText : ''
}

export function useVoteOperations(deps: VoteOperationsDeps) {
  const { tx, signVisible, myVoted, vote, voteWallet, voteStore, settingStore } = deps

  async function submitVoteApproval(statusMap: Record<string, string>) {
    const wallet = voteWallet.value
    if (!wallet?.address) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
        statusText: '',
      }
    }

    if (myVoted.value === MY_VOTED.APPROVED) {
      return Promise.resolve({ ok: false as const, silent: true as const })
    }
    const statusText = getVoteStatusText(vote.value)
    if (statusText !== VOTE_STATUS_TEXT.IN_PROGRESS) {
      return Promise.resolve({
        ok: false as const,
        errorKey: 'vote.notAllowVote',
        statusText: statusMap[statusText] || '',
      })
    }

    const result = await createVoteDecisionTransaction({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
      hash: String(vote.value.hash || ''),
      approve: true,
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

  async function submitVoteRejection(statusMap: Record<string, string>) {
    const wallet = voteWallet.value
    if (!wallet?.address) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
        statusText: '',
      }
    }

    if (myVoted.value === MY_VOTED.REJECTED) {
      return Promise.resolve({ ok: false as const, silent: true as const })
    }
    const statusText = getVoteStatusText(vote.value)
    if (statusText !== VOTE_STATUS_TEXT.IN_PROGRESS) {
      return Promise.resolve({
        ok: false as const,
        errorKey: 'vote.notAllowVote',
        statusText: statusMap[statusText] || '',
      })
    }

    const result = await createVoteDecisionTransaction({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
      hash: String(vote.value.hash || ''),
      approve: false,
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

  async function submitStopVoteDetail(statusMap: Record<string, string>) {
    const wallet = voteWallet.value
    if (!wallet?.address) {
      return {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
        statusText: '',
      }
    }

    if (
      getVoteStatusText(vote.value) === VOTE_STATUS_TEXT.CANCELED ||
      getVoteStatusText(vote.value) === VOTE_STATUS_TEXT.FINISHED
    ) {
      const statusText = getVoteStatusText(vote.value)
      return Promise.resolve({
        ok: false as const,
        errorKey: 'vote.notAllowStop',
        statusText: statusMap[statusText] || '',
      })
    }

    const result = await createVoteStopTransaction({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
      hash: String(vote.value.hash || ''),
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
    submitVoteApproval,
    submitVoteRejection,
    submitStopVoteDetail,
  }
}
