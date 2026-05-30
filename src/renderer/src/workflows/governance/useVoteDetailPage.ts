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

type VoteRecordRow = Record<string, unknown>

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

function getVoteCount(voteItem: Record<string, unknown>, primaryKey: string, fallbackKey: string) {
  return voteItem[primaryKey] ?? voteItem[fallbackKey] ?? 0
}

function toDisplayNumberInput(value: unknown) {
  return typeof value === 'number' || typeof value === 'string' ? value : undefined
}

function formatVoteRecordRow(record: VoteRecordRow) {
  return {
    ...record,
    weightDisplay: formatNumberForDisplay(toDisplayNumberInput(record.weight)),
  }
}

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

  function navigateVoteDetailBack() {
    router.back()
  }

  function openVoteExplorer() {
    const url = `${getExplorerUrl()}/transaction/${reverseVoteHash(String(vote.value.hash || ''))}`
    openExternalUrl(url)
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
