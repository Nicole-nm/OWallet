import { computed, onMounted, ref, watch } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import {
  loadVoteList,
  loadVoteRole,
} from '../../modules/governance/application/voteTopicApplicationService'
import { VOTE_ROLE } from '../../shared/lib/constants'
import { ROUTE_NAMES } from '../../router/routes'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSettingStore } from '../../stores/modules/Setting'
import { VOTE_STATUS_TEXT, useVoteStore } from '../../stores/modules/Vote'
import { useVoteAdminOperations } from './useVoteAdminOperations'
import { formatVoteStatus } from './useVoteFormatting'
import type { GovernanceSignablePayload } from './governanceSigningTypes'
import type { VoteTopic } from '../../shared/types'

type VoteRoleResult = Awaited<ReturnType<typeof loadVoteRole>>
type VoteListResult = Awaited<ReturnType<typeof loadVoteList>>

interface VoteListRoute {
  name: string
  path: string
}

interface VoteListMenuLabels {
  all: string
  created: string
}

interface VoteListRefreshOptions {
  showLoading?: boolean
  showError?: boolean
}

interface TablePaginationChange {
  current?: number
  pageSize?: number
}

interface MenuSelectPayload {
  key: string
}

function formatDateTime(value: unknown) {
  const date = new Date(
    value instanceof Date || typeof value === 'string' || typeof value === 'number' ? value : 0
  )
  const pad = (num: number) => String(num).padStart(2, '0')
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())} ${pad(date.getHours())}:${pad(date.getMinutes())}`
}

function getVoteTimestamp(value: unknown) {
  const timestamp = Number(value)
  return Number.isFinite(timestamp) ? timestamp : 0
}

function sortVotesByNewest<T extends { startTime?: unknown; endTime?: unknown }>(votes: T[]) {
  return [...votes].sort((left, right) => {
    const startDiff = getVoteTimestamp(right?.startTime) - getVoteTimestamp(left?.startTime)
    if (startDiff !== 0) {
      return startDiff
    }

    return getVoteTimestamp(right?.endTime) - getVoteTimestamp(left?.endTime)
  })
}

export function useVoteListPage() {
  const { t } = useI18n()
  const router = useRouter()
  const voteStore = useVoteStore()
  const loadingStore = useLoadingModalStore()
  const settingStore = useSettingStore()

  const routes = ref<VoteListRoute[]>([{ name: t('vote.node'), path: '/node' }])
  const currentMenu = ref(['all'])
  const menus = ref([{ key: 'all', name: t('vote.allVotes') }])
  const menuLabels = ref<VoteListMenuLabels>({
    all: t('vote.allVotes'),
    created: t('vote.created'),
  })
  const currentPage = ref(1)
  const pageSize = ref(10)
  const signVisible = ref(false)
  const tx = ref<GovernanceSignablePayload>('')

  const role = computed(() => voteStore.role || [])
  const allVotes = computed(() => voteStore.allVotes || [])
  const adminVotes = computed(() => voteStore.adminVotes || [])
  const voteWallet = computed(() => voteStore.voteWallet)
  const isAdmin = computed(() => Array.isArray(role.value) && role.value.includes(VOTE_ROLE.ADMIN))
  const activeVotes = computed(() =>
    sortVotesByNewest(currentMenu.value[0] === 'created' ? adminVotes.value : allVotes.value)
  )
  const columns = computed(() => [
    {
      title: t('vote.title'),
      dataIndex: 'title',
      key: 'title',
    },
    {
      title: t('vote.duration'),
      key: 'duration',
      width: 300,
    },
    {
      title: t('vote.votingStatus'),
      key: 'status',
      width: 220,
    },
    {
      title: t('vote.actions'),
      key: 'actions',
      width: 140,
      align: 'right',
    },
  ])
  const tablePagination = computed(() => ({
    current: currentPage.value,
    pageSize: pageSize.value,
    total: activeVotes.value.length,
    showSizeChanger: false,
    hideOnSinglePage: activeVotes.value.length <= pageSize.value,
  }))

  const { syncAdminVotesInStore, submitStopVote } = useVoteAdminOperations({
    tx,
    signVisible,
    allVotes,
    voteWallet,
    voteStore,
    settingStore,
  })

  const { startPolling } = usePollingTask(
    () =>
      refreshVoteList({
        showLoading: false,
        showError: false,
      }),
    {
      autoStart: false,
      intervalMs: 10 * 1000,
    }
  )

  function applyVoteRoleResult(result: VoteRoleResult) {
    if (!result?.ok) {
      return result
    }

    if (result.contractHash) {
      voteStore.setContractHash(result.contractHash)
    }
    voteStore.setAllVoters(result.allVoters)
    voteStore.setVoteRole(result.role)
    voteStore.setMyWeight(result.myWeight)
    return result
  }

  function applyVoteListResult(result: VoteListResult) {
    if (!result?.ok) {
      return result
    }

    if (result.contractHash) {
      voteStore.setContractHash(result.contractHash)
    }
    voteStore.setAllVotes(result.votes)
    return result
  }

  watch(
    isAdmin,
    (nextValue) => {
      if (!nextValue) {
        return
      }
      if (!menus.value.some((menu) => menu.key === 'created')) {
        menus.value = [...menus.value, { key: 'created', name: menuLabels.value.created }]
      }
      syncAdminVotesInStore()
    },
    { immediate: true }
  )

  watch(
    activeVotes,
    (votes) => {
      const maxPage = Math.max(1, Math.ceil(votes.length / pageSize.value) || 1)
      if (currentPage.value > maxPage) {
        currentPage.value = maxPage
      }
    },
    { immediate: true }
  )

  onMounted(() => {
    void initializeVoteListPage()
  })

  function setVoteListRoutes(nextRoutes: VoteListRoute[]) {
    routes.value = nextRoutes
  }

  function setVoteListMenuLabels(labels: VoteListMenuLabels) {
    menuLabels.value = labels
    menus.value = [{ key: 'all', name: labels.all }]
    if (isAdmin.value) {
      menus.value.push({ key: 'created', name: labels.created })
    }
  }

  function navigateVoteListBack() {
    router.back()
  }

  async function initializeVoteListPage() {
    loadingStore.showLoadingModals()

    try {
      if (voteWallet.value?.address) {
        const roleResult = await loadVoteRole({
          contractHash: voteStore.contractHash,
          network: settingStore.network,
          address: voteWallet.value.address,
        })
        applyVoteRoleResult(roleResult)
        if (!roleResult.ok) {
          notifyError(roleResult.errorKey)
        }
      }

      await refreshVoteList({ showLoading: false, showError: true })
    } finally {
      loadingStore.hideLoadingModals()
    }

    startPolling({ immediate: false })
  }

  async function refreshVoteList(options: VoteListRefreshOptions = {}) {
    const { showLoading = true, showError = true } = options
    if (showLoading) {
      loadingStore.showLoadingModals()
    }

    try {
      const result = await loadVoteList({
        contractHash: voteStore.contractHash,
        network: settingStore.network,
      })
      applyVoteListResult(result)

      if (result.ok && isAdmin.value) {
        syncAdminVotesInStore()
      }

      if (!result.ok && showError) {
        notifyError(result.errorKey)
      }

      return result
    } finally {
      if (showLoading) {
        loadingStore.hideLoadingModals()
      }
    }
  }

  function selectVoteListMenu(key: string) {
    currentMenu.value = [key]
    currentPage.value = 1
  }

  function handleTableChange(pagination: TablePaginationChange = {}) {
    currentPage.value = pagination?.current || 1
    pageSize.value = pagination?.pageSize || pageSize.value
  }

  function openVoteCreatePage() {
    router.push({ name: ROUTE_NAMES.VOTE_CREATE })
  }

  function formatVoteDuration(vote: Pick<VoteTopic, 'startTime' | 'endTime'>) {
    const start = formatDateTime(vote.startTime)
    const end = formatDateTime(vote.endTime)
    return `${start} ~ ${end}`
  }

  function openVoteDetail(vote: VoteTopic | Record<string, unknown>) {
    voteStore.setCurrentVote(vote)
    router.push({ name: ROUTE_NAMES.VOTE_DETAIL })
  }

  function isVoteStoppable(vote: VoteTopic | Record<string, unknown>) {
    return (
      vote?.statusText === VOTE_STATUS_TEXT.NOT_START ||
      vote?.statusText === VOTE_STATUS_TEXT.IN_PROGRESS
    )
  }

  function getVoteRowKey(vote: VoteTopic | Record<string, unknown>) {
    return String(vote?.hash || vote?.topicHash || vote?.title || '')
  }

  function closeVoteListDialog() {
    signVisible.value = false
    tx.value = ''
  }

  function setVoteListDialogVisible(visible: boolean) {
    signVisible.value = visible
  }

  function handleVoteListTransactionSent() {
    signVisible.value = false
    void refreshVoteList()
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
    navigateVoteListBack()
  }

  function handleSelectMenu({ key }: MenuSelectPayload) {
    selectVoteListMenu(key)
  }

  function handleAddVote() {
    openVoteCreatePage()
  }

  function formatDuration(vote: Pick<VoteTopic, 'startTime' | 'endTime'>) {
    return formatVoteDuration(vote)
  }

  function formatStatus(vote: VoteTopic | Record<string, unknown>) {
    return formatVoteStatus(vote, createStatusMap())
  }

  function toDetail(vote: VoteTopic | Record<string, unknown>) {
    openVoteDetail(vote)
  }

  function handleCancel() {
    closeVoteListDialog()
  }

  function handleTxSent() {
    handleVoteListTransactionSent()
  }

  async function onStopVote(vote: VoteTopic | Record<string, unknown>) {
    const result = await submitStopVote(vote, createStatusMap())
    if (!result.ok) {
      const errorKey = 'errorKey' in result ? result.errorKey : 'common.networkErr'
      notifyWarning(t(errorKey) + ('statusText' in result ? result.statusText : ''), {
        literal: true,
      })
    }
    return result
  }

  return {
    routes,
    currentMenu,
    menus,
    columns,
    activeVotes,
    tablePagination,
    signVisible,
    tx,
    VOTE_ROLE,
    VOTE_STATUS_TEXT,
    role,
    allVotes,
    adminVotes,
    voteWallet,
    isAdmin,
    back,
    handleSelectMenu,
    handleTableChange,
    handleAddVote,
    formatDuration,
    formatStatus,
    isVoteStoppable,
    getVoteRowKey,
    toDetail,
    handleCancel,
    handleTxSent,
    onStopVote,
    setVoteListRoutes,
    setVoteListMenuLabels,
    navigateVoteListBack,
    refreshVoteList,
    selectVoteListMenu,
    openVoteCreatePage,
    formatVoteDuration,
    formatVoteStatus,
    openVoteDetail,
    closeVoteListDialog,
    setVoteListDialogVisible,
    handleVoteListTransactionSent,
    submitStopVote,
  }
}
