import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { notifyError } from '../../shared/ui/feedback'
import { Modal } from 'ant-design-vue'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { ROUTE_NAMES } from '../../router/routes'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { openAuthorizationLogin } from '../../modules/governance/application/authorizationContextService'
import { applyAuthorizationContext } from '../support/governanceContextStoreSync'
import {
  loadAuthorizationBlockCountdown,
  loadAuthorizationNodeListPage,
} from '../../modules/governance/application/authorizationQueryApplicationService'
import type { GovernanceNode } from '../../shared/types'

let countdownIntervalId: ReturnType<typeof setInterval> | null = null

interface AuthorizationPagination {
  current: number
  pageSize: number
  total: number
}

export function useNodeAuthorizationListPage() {
  const { t } = useI18n()
  const router = useRouter()
  const settingStore = useSettingStore()
  const nodeAuthStore = useNodeAuthorizationStore()

  const requesting = ref(false)
  const countdown = ref(0)
  const pagination = ref({
    current: 1,
    pageSize: 10,
    total: 30,
  })
  const columns = computed(() => [
    {
      title: t('nodeMgmt.rank'),
      dataIndex: 'rank',
      key: 'rank',
    },
    {
      title: t('nodeMgmt.name'),
      dataIndex: 'name',
      key: 'name',
    },
    {
      dataIndex: 'nodeProportion',
      key: 'nodeProportion',
    },
    {
      title: t('nodeMgmt.currentStake'),
      dataIndex: 'currentStake',
      key: 'currentStake',
    },
    {
      title: t('nodeMgmt.process'),
      dataIndex: 'process',
      key: 'process',
    },
    {
      title: '',
      key: 'action',
    },
  ])

  async function fetchList({ showError = false } = {}) {
    requesting.value = true
    try {
      const result = await loadAuthorizationNodeListPage({
        network: settingStore.network,
        pageSize: pagination.value.pageSize,
        pageNum: pagination.value.current - 1,
      })

      if (!result.ok) {
        nodeAuthStore.setNodeList({ nodes: [] })
        if (showError) {
          notifyError(result.errorKey || 'commonWalletHome.networkError')
        }
        return result.total
      }

      nodeAuthStore.setNodeList({ nodes: result.nodes })
      pagination.value = {
        ...pagination.value,
        total: result.total,
      }
      return result.total
    } finally {
      requesting.value = false
    }
  }

  async function refreshCountdown({ showError = false } = {}) {
    const result = await loadAuthorizationBlockCountdown({
      network: settingStore.network,
    })

    if (result.ok) {
      countdown.value = Number(result.countdown) || 0
    }

    if (!result.ok && showError) {
      notifyError(result.errorKey || 'commonWalletHome.networkError')
    }

    return result
  }

  async function initializePage() {
    await fetchList({ showError: true })
    await refreshCountdown({ showError: true })
    countdownIntervalId = setInterval(() => {
      void refreshCountdown()
    }, 6000)
  }

  function disposePage() {
    if (countdownIntervalId) {
      clearInterval(countdownIntervalId)
      countdownIntervalId = null
    }
  }

  async function handleTableChangeInternal(nextPagination: AuthorizationPagination) {
    pagination.value = { ...pagination.value, ...nextPagination }
    await fetchList({ showError: true })
  }

  function beginAuthorization(record: GovernanceNode) {
    const result = openAuthorizationLogin({
      currentNode: record,
    })
    applyAuthorizationContext(nodeAuthStore, result.authorizationContext)
    return router.push(result.route)
  }

  function goToStakeHistory() {
    return router.push({ name: ROUTE_NAMES.STAKE_HISTORY })
  }

  function handleRouteBack() {
    router.go(-1)
  }

  function handleAuthorizeLogin(record: GovernanceNode) {
    return beginAuthorization(record)
  }

  function handleNodeDetail(record: GovernanceNode) {
    openExternalUrl(String(record.detailUrl || ''))
  }

  async function handleTableChange(nextPagination: AuthorizationPagination) {
    await handleTableChangeInternal(nextPagination)
  }

  function showProportionTip() {
    Modal.info({
      title: t('nodeMgmt.proportionNextRound'),
      content: t('nodeMgmt.proportionNextRoundTip'),
      okText: t('nodeMgmt.authorizationFAQ'),
      onOk: () => {
        openExternalUrl(
          'https://medium.com/ontologynetwork/owallet-stake-authorization-faq-4a4bce224122'
        )
      },
    })
  }

  function toStakeHistory() {
    return goToStakeHistory()
  }

  function toQuestion() {
    openExternalUrl(
      'https://medium.com/ontologynetwork/owallet-stake-authorization-faq-4a4bce224122'
    )
  }

  onMounted(() => {
    void initializePage()
  })

  onBeforeUnmount(() => {
    disposePage()
  })

  return {
    columns,
    authorizationListRequesting: requesting,
    authorizationListPagination: pagination,
    authorizationListNodes: computed(() => nodeAuthStore.nodeList),
    authorizationListCountdown: computed(() => countdown.value),
    handleRouteBack,
    handleAuthorizeLogin,
    handleNodeDetail,
    handleTableChange,
    showProportionTip,
    toStakeHistory,
    toQuestion,
    initializeAuthorizationListPage: initializePage,
    disposeAuthorizationListPage: disposePage,
    refreshAuthorizationListPage: fetchList,
    handleAuthorizationListPageChange: handleTableChangeInternal,
    beginAuthorizationLogin: beginAuthorization,
    goToAuthorizationStakeHistory: goToStakeHistory,
  }
}
