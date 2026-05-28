import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { loadVoteDetail } from '../../modules/governance/application/voteTopicApplicationService'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { getExplorerUrl } from '../../shared/lib/urlBuilder'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { MY_VOTED, VOTE_STATUS_TEXT, useVoteStore } from '../../stores/modules/Vote'
import { formatVoteTime, formatVoteStatus, reverseVoteHash } from './useVoteFormatting'
import { useVoteOperations } from './useVoteOperations'
import type { GovernanceSignablePayload } from './governanceSigningTypes'

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

function isSilentVoteFailure(result: unknown): result is { silent: true } {
  return Boolean(result && typeof result === 'object' && 'silent' in result && result.silent)
}

function getVoteFailureMessage(result: unknown, translate: (key: string) => string) {
  if (!result || typeof result !== 'object') {
    return 'common.networkErr'
  }

  const errorKey =
    'errorKey' in result && typeof result.errorKey === 'string'
      ? result.errorKey
      : 'common.networkErr'
  const statusText =
    'statusText' in result && typeof result.statusText === 'string' ? result.statusText : ''

  return translate(errorKey) + statusText
}

export function useVoteDetailPage() {
  const { t } = useI18n()
  const router = useRouter()
  const voteStore = useVoteStore()
  const settingStore = useSettingStore()

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
  const approveData = ref<unknown[]>([])
  const rejectData = ref<unknown[]>([])
  const myVoted = ref('')
  const isVoter = ref(false)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')

  const vote = computed(() => voteStore.currentVote)
  const role = computed(() => voteStore.role)
  const myWeight = computed(() => voteStore.myWeight)
  const voteWallet = computed(() => voteStore.voteWallet)
  const votedRecords = computed(() => voteStore.currentVoteRecords)

  watch(
    votedRecords,
    (records) => {
      approveData.value = records.filter((item) => item.isApproval)
      rejectData.value = records.filter((item) => !item.isApproval)
    },
    { immediate: true }
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

  function navigateVoteDetailBack() {
    router.back()
  }

  function openVoteExplorer() {
    const url = `${getExplorerUrl()}/transaction/${reverseVoteHash(String(vote.value.hash || ''))}`
    openExternalUrl(url)
  }

  async function initializeVoteDetailPage() {
    await refreshVoteDetail({ showError: true })
    startPolling({ immediate: false })
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
        notifyError(result.errorKey)
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
      notifyError(result.errorKey)
    }

    return result
  }

  function closeVoteDetailDialog() {
    signVisible.value = false
    tx.value = ''
  }

  function setVoteDetailDialogVisible(visible: boolean) {
    signVisible.value = visible
  }

  function handleVoteDetailSent() {
    signVisible.value = false
    setTimeout(() => {
      void refreshVoteDetail()
    }, 3000)
  }

  function createStatusMap() {
    return {
      [VOTE_STATUS_TEXT.NOT_START]: t('vote.notStart'),
      [VOTE_STATUS_TEXT.IN_PROGRESS]: t('vote.inProgress'),
      [VOTE_STATUS_TEXT.FINISHED]: t('vote.finished'),
      [VOTE_STATUS_TEXT.CANCELED]: t('vote.canceled'),
    }
  }

  function back() {
    navigateVoteDetailBack()
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
    openVoteExplorer()
  }

  function handleCancel() {
    closeVoteDetailDialog()
  }

  function handleTxSent() {
    handleVoteDetailSent()
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
    navigateVoteDetailBack,
    formatVoteTime,
    formatVoteStatus,
    reverseVoteHash,
    openVoteExplorer,
    refreshVoteDetail,
    closeVoteDetailDialog,
    setVoteDetailDialogVisible,
    handleVoteDetailSent,
    submitVoteApproval,
    submitVoteRejection,
    submitStopVoteDetail,
  }
}
