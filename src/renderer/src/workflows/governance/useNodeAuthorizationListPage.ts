import { computed, h, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import { Modal } from 'ant-design-vue'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeAuthorizationStore } from '../../stores/modules/NodeAuthorization'
import { ROUTE_NAMES } from '../../router/routes'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { openAuthorizationLogin } from '../../modules/governance/application/authorization/authorizationContextService'
import { applyAuthorizationContext } from '../support/governanceContextStoreSync'
import { formatNumberForDisplay } from '../../shared/lib/numberFormat'
import {
  loadAuthorizationBlockCountdown,
  loadAuthorizationNodeListPage,
  type AuthorizationNodeListSort,
  type AuthorizationNodeListSortField,
} from '../../modules/governance/application/authorization/authorizationQueryApplicationService'
import type { GovernanceNode } from '../../shared/types'
import { getAuthorizationBlockUnitLabel } from './countLabels'

let countdownIntervalId: ReturnType<typeof setInterval> | null = null
const NODE_CHECKMARK_DETAILS_URL = 'https://node-docs.ont.io/node-checkmark'

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
  const sortState = ref<AuthorizationNodeListSort | null>(null)
  const countdown = ref(0)
  const countdownDisplay = computed(() => formatNumberForDisplay(countdown.value))
  const countdownUnitLabel = computed(() => getAuthorizationBlockUnitLabel(t, countdown.value))
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
      width: 48,
      className: 'authorization-col-rank',
    },
    {
      title: t('nodeMgmt.name'),
      dataIndex: 'name',
      key: 'name',
      width: 136,
      className: 'authorization-col-name',
    },
    {
      dataIndex: 'checkmark',
      key: 'checkmark',
      width: 112,
      className: 'authorization-col-checkmark',
    },
    {
      dataIndex: 'nodeProportion',
      key: 'nodeProportion',
      width: 144,
      className: 'authorization-col-proportion',
    },
    {
      title: t('nodeMgmt.currentStake'),
      dataIndex: 'currentStake',
      key: 'currentStake',
      width: 116,
      className: 'authorization-col-current-stake',
    },
    {
      dataIndex: 'annualizedYield',
      key: 'annualizedYield',
      width: 154,
      align: 'right' as const,
      className: 'authorization-col-annualized-yield',
    },
    {
      title: t('nodeMgmt.process'),
      dataIndex: 'process',
      key: 'process',
      width: 122,
      align: 'right' as const,
      className: 'authorization-col-process',
    },
    {
      title: '',
      key: 'action',
      width: 48,
      align: 'center' as const,
      className: 'authorization-col-action',
    },
  ])

  async function fetchList({ showError = false } = {}) {
    requesting.value = true
    try {
      const result = await loadAuthorizationNodeListPage({
        network: settingStore.network,
        pageSize: pagination.value.pageSize,
        pageNum: pagination.value.current - 1,
        sort: sortState.value,
      })

      if (!result.ok) {
        nodeAuthStore.setNodeList({ nodes: [] })
        if (showError) {
          notifyFailure(result, 'commonWalletHome.networkError')
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

    if (showError) {
      notifyFailure(result, 'commonWalletHome.networkError')
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

  function getNextSortState(field: AuthorizationNodeListSortField) {
    if (sortState.value?.field !== field) {
      return { field, order: 'ascend' as const }
    }

    if (sortState.value.order === 'ascend') {
      return { field, order: 'descend' as const }
    }

    return null
  }

  async function toggleAuthorizationSort(field: AuthorizationNodeListSortField) {
    sortState.value = getNextSortState(field)
    pagination.value = { ...pagination.value, current: 1 }
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

  function showCheckmarkTip() {
    Modal.info({
      title: t('nodeMgmt.checkmark'),
      content: () =>
        h('div', [
          h('p', t('nodeMgmt.checkmarkTip')),
          h('p', [
            `${t('nodeMgmt.checkmarkDetails')}: `,
            h(
              'a',
              {
                href: NODE_CHECKMARK_DETAILS_URL,
                target: '_blank',
                rel: 'noopener noreferrer',
                onClick: (event: MouseEvent) => {
                  event.preventDefault()
                  openExternalUrl(NODE_CHECKMARK_DETAILS_URL)
                },
              },
              NODE_CHECKMARK_DETAILS_URL
            ),
          ]),
        ]),
      okText: 'OK',
    })
  }

  function showAnnualizedYieldTip() {
    Modal.info({
      title: t('nodeMgmt.annualizedYield'),
      content: t('nodeMgmt.annualizedYieldTip'),
      okText: 'OK',
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
    authorizationListSortField: computed(() => sortState.value?.field ?? ''),
    authorizationListSortOrder: computed(() => sortState.value?.order ?? ''),
    authorizationListCountdown: computed(() => countdown.value),
    authorizationListCountdownDisplay: countdownDisplay,
    authorizationListCountdownUnit: countdownUnitLabel,
    handleRouteBack,
    handleAuthorizeLogin,
    handleNodeDetail,
    handleTableChange,
    toggleAuthorizationSort,
    showProportionTip,
    showCheckmarkTip,
    showAnnualizedYieldTip,
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
