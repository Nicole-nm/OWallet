import { computed, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { useRouter } from 'vue-router'
import { notifyError } from '../../shared/ui/feedback'
import { ROUTE_NAMES, ROUTE_PATHS } from '../../router/routes'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { useVoteStore } from '../../stores/modules/Vote'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { loadWalletCollectionsIntoStore } from '../support/walletCollectionsStoreSync'
import type { CommonWallet, WalletSigner } from '../../shared/lib/types'

type VoteLoginRoute = {
  name: string
  path: string
}

type VoteWalletType = 'commonWallet' | 'ledgerWallet'

export function useVoteLoginPage() {
  const { t } = useI18n()
  const router = useRouter()
  const walletsStore = useWalletsStore()
  const voteStore = useVoteStore()

  const routes = ref<VoteLoginRoute[]>([{ name: t('vote.node'), path: ROUTE_PATHS.node }])
  const voteWalletType = ref<VoteWalletType>('commonWallet')
  const voteWallet = ref<CommonWallet | null>(null)
  const voteWalletValue = ref('')

  const { ledgerStatus, ledgerWallet } = useLedgerStatusMonitor({
    shouldPoll: computed(() => voteWalletType.value === 'ledgerWallet'),
  })
  const normalWallet = computed(() => {
    const list = walletsStore.normalWallets.slice()
    return list.map((item) => ({
      ...item,
      label: `${item.label} ${item.address}`,
      value: item.address,
    }))
  })

  onMounted(() => {
    void loadWalletCollectionsIntoStore(walletsStore)
  })

  function setVoteLoginRoutes(nextRoutes: VoteLoginRoute[]) {
    routes.value = nextRoutes
  }

  function navigateVoteLoginBack() {
    router.back()
  }

  function openVoteWalletImport() {
    router.push({ name: ROUTE_NAMES.IMPORT_JSON_WALLET })
  }

  function setVoteWalletType(nextType: VoteWalletType) {
    voteWalletType.value = nextType
  }

  function selectVoteCommonWallet(address: string) {
    voteWallet.value = normalWallet.value.find((wallet) => wallet.address === address) || null
    voteWalletValue.value = voteWallet.value?.address || ''
  }

  function submitVoteLoginSelection() {
    if (voteWalletType.value === 'commonWallet' && !voteWallet.value) {
      return { ok: false, errorKey: 'nodeStake.selectIndividualWallet' }
    }

    if (voteWalletType.value === 'ledgerWallet' && !ledgerWallet.value?.address) {
      return { ok: false, errorKey: 'nodeStake.selectLedgerWallet' }
    }

    const selectedWallet =
      voteWalletType.value === 'commonWallet' ? voteWallet.value : ledgerWallet.value
    voteStore.setVoteWallet(selectedWallet as WalletSigner | null)
    voteStore.setVoteWalletType(voteWalletType.value)
    router.push({ name: ROUTE_NAMES.VOTE_LIST })
    return { ok: true }
  }

  function back() {
    navigateVoteLoginBack()
  }

  function hereImport() {
    openVoteWalletImport()
  }

  function changeVoteWallet(event: Event) {
    const target = event.target as HTMLInputElement | null
    if (!target) {
      return
    }

    setVoteWalletType(target.value as VoteWalletType)
  }

  function handleChangePayer(selection: { wallet?: { address?: string } | null }) {
    const address = selection.wallet?.address || ''
    if (!address) {
      voteWallet.value = null
      voteWalletValue.value = ''
      return
    }

    selectVoteCommonWallet(address)
  }

  function next() {
    const result = submitVoteLoginSelection()
    if (!result.ok) {
      notifyError(result.errorKey || 'common.networkErr')
    }
    return result
  }

  return {
    routes,
    voteWalletType,
    voteWallet,
    voteWalletValue,
    ledgerStatus,
    ledgerWallet,
    normalWallet,
    back,
    hereImport,
    changeVoteWallet,
    handleChangePayer,
    next,
    setVoteLoginRoutes,
    navigateVoteLoginBack,
    openVoteWalletImport,
    setVoteWalletType,
    selectVoteCommonWallet,
    submitVoteLoginSelection,
  }
}
