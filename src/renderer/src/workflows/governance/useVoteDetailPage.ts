import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { loadVoteDetail } from '../../modules/governance/application/vote/voteTopicApplicationService'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { getExplorerUrl } from '../../shared/lib/urlBuilder'
import { notifyWarning } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import { useSettingStore } from '../../stores/modules/Setting'
import { MY_VOTED, VOTE_STATUS_TEXT, useVoteStore } from '../../stores/modules/Vote'
import { formatVoteTime, formatVoteStatus, reverseVoteHash } from './useVoteFormatting'
import { useVoteOperations } from './useVoteOperations'
import { getVoteFailureMessage, isSilentVoteFailure } from './voteFailureMessage'
import { createVoteStatusMap } from './voteStatusLabels'
import { formatVoteRecordRow, getVoteCount, toDisplayNumberInput } from './voteTableFormatters'
import type { GovernanceSignablePayload } from '../../modules/governance/application/common/governanceSignablePayload'

interface VoteRoute {
  name: string
  path: string
}

interface VoteTableColumn {
  dataIndex: string
  key: string
  title: string
  width: number
  align?: string
}

interface RefreshVoteDetailOptions {
  showError?: boolean
}

type VoteRecordRow = Record<string, unknown>

export function useVoteDetailPage() {
  const { t } = useI18n()
  const router = useRouter()
  const voteStore = useVoteStore()
  const settingStore = useSettingStore()
  const loadingStore = useLoadingModalStore()

  const routes = ref<VoteRoute[]>([
    { name: t('vote.node'), path: '/node' },
    { name: t('vote.votingTopics'), path: '/vote/votes' },
  ])
  const columns = ref<VoteTableColumn[]>([
    { dataIndex: 'name', key: 'name', title: t('vote.name'), width: 88 },
    {
      dataIndex: 'address',
      key: 'address',
      title: t('vote.address'),
      width: 176,
    },
    {
      dataIndex: 'weight',
      key: 'weight',
      title: t('vote.votes'),
      width: 88,
      align: 'right',
    },
  ])
  const myVoted = ref('')
  const isVoter = ref(false)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')

  const vote = computed(() => voteStore.currentVote)
  const role = computed(() => voteStore.role)
  const myWeight = computed(() => voteStore.myWeight)
  const voteApprovesDisplay = computed(() =>
    formatNumberForDisplay(toDisplayNumberInput(getVoteCount(vote.value, 'approves', 'approve')))
  )
  const voteRejectsDisplay = computed(() =>
    formatNumberForDisplay(toDisplayNumberInput(getVoteCount(vote.value, 'rejects', 'reject')))
  )
  const myWeightDisplay = computed(() => formatNumberForDisplay(myWeight.value))
  const voteWallet = computed(() => voteStore.voteWallet)
  const votedRecords = computed(() => voteStore.currentVoteRecords)
  const approveData = computed(() =>
    votedRecords.value
      .filter((item) => (item as VoteRecordRow).isApproval)
      .map((item) => formatVoteRecordRow(item as VoteRecordRow))
  )
  const rejectData = computed(() =>
    votedRecords.value
      .filter((item) => !(item as VoteRecordRow).isApproval)
      .map((item) => formatVoteRecordRow(item as VoteRecordRow))
  )

  const { startPolling } = usePollingTask(() => refreshVoteDetail(), {
    autoStart: false,
    intervalMs: 10 * 1000,
  })

  const { submitVoteApproval, submitVoteRejection, submitStopVoteDetail } = useVoteOperations({
    tx,
    signVisible,
    myVoted,
    vote,
    voteWallet,
    voteStore,
    settingStore,
  })

  onMounted(() => {
    window.scroll(0, 0)
    void initializeVoteDetailPage()
  })

  function setVoteDetailRoutes(nextRoutes: VoteRoute[]) {
    routes.value = nextRoutes
  }

  function setVoteDetailColumns(nextColumns: VoteTableColumn[]) {
    columns.value = nextColumns
  }

  async function initializeVoteDetailPage() {
    loadingStore.showLoadingModals()

    try {
      await refreshVoteDetail({ showError: true })
    } finally {
      loadingStore.hideLoadingModals()
      startPolling({ immediate: false })
    }
  }

  async function refreshVoteDetail({ showError = false }: RefreshVoteDetailOptions = {}) {
    const wallet = voteWallet.value
    const hash = String(vote.value.hash || '')
    if (!hash || !wallet?.address) {
      const result = {
        ok: false as const,
        errorKey: 'nodeStake.selectIndividualWallet',
      }
      if (showError) {
        notifyFailure(result)
      }
      return result
    }

    const result = await loadVoteDetail({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
      hash,
      address: wallet.address,
      voteWallet: wallet,
      allVoters: voteStore.allVoters || [],
    })

    if (result.ok) {
      if (result.contractHash) {
        voteStore.setContractHash(result.contractHash)
      }
      voteStore.setVoteRecords(result.votedRecords)
      if (result.currentVote && typeof result.currentVote === 'object') {
        voteStore.setCurrentVote(result.currentVote)
      }
      myVoted.value = String(result.myVoted || '')
      isVoter.value = result.isVoter
      return result
    }

    if (showError) {
      notifyFailure(result)
    }

    return result
  }

  function setVoteDetailDialogVisible(visible: boolean) {
    signVisible.value = visible
  }

  function createStatusMap() {
    return createVoteStatusMap(t)
  }

  function back() {
    router.back()
  }

  function formatTime(dateTime: unknown) {
    return formatVoteTime(
      dateTime instanceof Date || typeof dateTime === 'string' || typeof dateTime === 'number'
        ? dateTime
        : 0
    )
  }

  function formatStatus(voteItem: Record<string, unknown>) {
    return formatVoteStatus(voteItem, createStatusMap())
  }

  function reverseHash(hash: unknown) {
    return reverseVoteHash(String(hash || ''))
  }

  function openVoteInExplorer() {
    const url = `${getExplorerUrl()}/transaction/${reverseVoteHash(String(vote.value.hash || ''))}`
    openExternalUrl(url)
  }

  function handleCancel() {
    signVisible.value = false
    tx.value = ''
  }

  function handleTxSent() {
    signVisible.value = false
    setTimeout(() => {
      void refreshVoteDetail()
    }, 3000)
  }

  async function onApprove() {
    const result = await submitVoteApproval(createStatusMap())
    if (!result.ok && !isSilentVoteFailure(result)) {
      notifyWarning(getVoteFailureMessage(result, t), { literal: true })
    }
    return result
  }

  async function onReject() {
    const result = await submitVoteRejection(createStatusMap())
    if (!result.ok && !isSilentVoteFailure(result)) {
      notifyWarning(getVoteFailureMessage(result, t), { literal: true })
    }
    return result
  }

  async function onStop() {
    const result = await submitStopVoteDetail(createStatusMap())
    if (!result.ok) {
      notifyWarning(getVoteFailureMessage(result, t), { literal: true })
    }
    return result
  }

  return {
    routes,
    columns,
    approveData,
    rejectData,
    myVoted,
    MY_VOTED,
    isVoter,
    signVisible,
    tx,
    VOTE_STATUS_TEXT,
    vote,
    role,
    myWeight,
    voteApprovesDisplay,
    voteRejectsDisplay,
    myWeightDisplay,
    voteWallet,
    votedRecords,
    back,
    formatTime,
    formatStatus,
    reverseHash,
    openVoteInExplorer,
    handleCancel,
    handleTxSent,
    onApprove,
    onReject,
    onStop,
    setVoteDetailRoutes,
    setVoteDetailColumns,
    refreshVoteDetail,
    setVoteDetailDialogVisible,
  }
}
