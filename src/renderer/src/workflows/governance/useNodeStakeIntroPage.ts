import { computed, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import {
  ensureNodeStakeQualification,
  loadNodeStakeRegistrationDetail,
} from '../../modules/governance/application/nodeStakeOnboardingApplicationService'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useIdentitiesStore } from '../../stores/modules/Identities'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useNodeSessionStore } from '../../modules/governance/store/nodeSessionStore'
import { openNodeManagement } from '../../modules/governance/application/managementContextService'
import { ROUTE_NAMES } from '../../router/routes'
import { createLogger } from '../../shared/lib/logger'
import { notifyError } from '../../shared/ui/feedback'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { applyManagementContext } from '../support/governanceContextStoreSync'
import { loadIdentityCollectionIntoStore } from '../support/identityCollectionStoreSync'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import type { CommonWallet, Identity, WalletSigner } from '../../shared/lib/types'
import type { StakeDetail } from '../../shared/types'

const logger = createLogger('useNodeStakeIntroPage')

type SelectableRecord = {
  label?: string
}

type SelectOption<T extends SelectableRecord> = T & {
  label: string
  value: string
}

function toSelectOptions<T extends SelectableRecord>(
  items: T[] = [],
  valueKey: keyof T & string
): SelectOption<T>[] {
  return items.map((item) => ({
    ...item,
    label: `${String(item.label || '')} ${String(item[valueKey] || '')}`.trim(),
    value: String(item[valueKey] || ''),
  }))
}

function applyStakeDetail(
  nodeStakeStore: ReturnType<typeof useNodeStakeStore>,
  result: { detail: StakeDetail }
) {
  nodeStakeStore.setStakeDetail({ detail: result.detail })
}

type StakeWalletType = 'commonWallet' | 'ledgerWallet'
type StakeIdentityOption = SelectOption<Identity>

export function useNodeStakeIntroPage() {
  const router = useRouter()
  const walletsStore = useWalletsStore()
  const identitiesStore = useIdentitiesStore()
  const settingStore = useSettingStore()
  const nodeStakeStore = useNodeStakeStore()
  const loadingStore = useLoadingModalStore()
  const nodeSessionStore = useNodeSessionStore()

  const payerWalletType = ref<StakeWalletType>('commonWallet')
  const payerWalletValue = ref<string | undefined>(undefined)
  const payerWallet = ref<CommonWallet | null>(null)
  const stakeIdentity = ref<StakeIdentityOption | null>(null)

  const { ledgerStatus, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() => payerWalletType.value === 'ledgerWallet'),
  })
  const normalWallet = computed(() =>
    toSelectOptions(walletsStore.normalWallets.slice(), 'address')
  )
  const identities = computed(() => toSelectOptions(identitiesStore.identities.slice(), 'ontid'))

  async function ensurePageDataLoaded() {
    await Promise.all([
      loadWalletCollectionsIntoStore(walletsStore),
      loadIdentityCollectionIntoStore(identitiesStore),
    ])
  }

  onMounted(() => {
    void ensurePageDataLoaded()
  })

  function handleRouteBack() {
    router.go(-1)
  }

  function changePayerWallet(event: Event) {
    const target = event.target as HTMLInputElement | null
    payerWalletType.value = target?.value === 'ledgerWallet' ? 'ledgerWallet' : 'commonWallet'
    if (payerWalletType.value === 'ledgerWallet') {
      payerWalletValue.value = undefined
      payerWallet.value = null
    }
  }

  function handleChangePayer(selection: { wallet?: unknown }) {
    const wallet = (selection.wallet || null) as CommonWallet | null
    payerWalletValue.value = wallet?.address
    payerWallet.value = wallet
  }

  function changeIdentity(value: string) {
    stakeIdentity.value = identities.value.find((identity) => identity.ontid === value) || null
  }

  function resolveStakeWallet(): WalletSigner | null {
    if (payerWalletType.value === 'commonWallet') {
      return payerWallet.value
    }

    return ledgerWallet.value
  }

  async function next() {
    if (!stakeIdentity.value) {
      notifyError('nodeStake.selectIdentity')
      return
    }

    if (payerWalletType.value === 'commonWallet' && !payerWallet.value) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }

    if (payerWalletType.value === 'ledgerWallet' && !ledgerWallet.value?.address) {
      notifyError('nodeStake.selectLedgerWallet')
      return
    }

    const stakeWallet = resolveStakeWallet()
    if (!stakeWallet?.address) {
      notifyError('nodeStake.selectIndividualWallet')
      return
    }
    loadingStore.showLoadingModals()

    try {
      const network = settingStore.network
      const qualificationResult = await ensureNodeStakeQualification({
        network,
        ontid: stakeIdentity.value.ontid,
        stakeWalletAddress: stakeWallet.address,
      })
      if (!qualificationResult.ok) {
        notifyError(qualificationResult.errorKey)
        return
      }

      nodeStakeStore.setStakeIdentity({ stakeIdentity: stakeIdentity.value })
      nodeStakeStore.setStakeWallet({ stakeWallet })

      const stakeDetailResult = await loadNodeStakeRegistrationDetail({
        network,
        ontid: stakeIdentity.value.ontid,
      })
      if (!stakeDetailResult.ok) {
        notifyError(stakeDetailResult.errorKey)
        return
      }

      applyStakeDetail(nodeStakeStore, { detail: stakeDetailResult.detail as StakeDetail })
      const stakeDetail = stakeDetailResult.detail as StakeDetail

      if (stakeDetail.status) {
        const result = openNodeManagement({
          context: {
            stakeWallet,
            nodePublicKey: stakeDetail.publicKey,
            status: stakeDetail.status,
            activeTab: 1,
          },
        })
        applyManagementContext(nodeSessionStore, nodeStakeStore, result.context)
        await router.push(result.route)
        return
      }

      await router.push({ name: ROUTE_NAMES.NODE_STAKE_REGISTER })
    } catch (err: unknown) {
      logger.error('next', err)
      notifyError('common.networkErr')
    } finally {
      loadingStore.hideLoadingModals()
    }
  }

  return {
    identities,
    ledgerStatus,
    next,
    normalWallet,
    payerWalletType,
    payerWalletValue,
    changeIdentity,
    changePayerWallet,
    handleChangePayer,
    handleRouteBack,
  }
}
