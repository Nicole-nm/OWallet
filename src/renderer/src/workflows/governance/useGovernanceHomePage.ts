import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { resolveVoteContractHash } from '../../modules/governance/application/voteTopicApplicationService'
import { ROUTE_NAMES } from '../../router/routes'
import { NETWORKS } from '../../shared/lib/constants'
import { notifyWarning } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useVoteStore } from '../../stores/modules/Vote'

export function useGovernanceHomePage() {
  const router = useRouter()
  const { locale } = useI18n()
  const settingStore = useSettingStore()
  const voteStore = useVoteStore()

  const onlyTestNet = ref(false)

  onMounted(() => {
    void resolveVoteContractHash({
      contractHash: voteStore.contractHash,
      network: settingStore.network,
    }).then((result) => {
      if (result?.ok && result.contractHash) {
        voteStore.setContractHash(result.contractHash)
      }
    })
  })

  function shouldBlockMainnetOnlyAction() {
    return settingStore.network === NETWORKS.TEST_NET && onlyTestNet.value
  }

  function handleNodeStake() {
    router.push({ name: ROUTE_NAMES.MY_NODE })
  }

  function handleAuthorization() {
    if (shouldBlockMainnetOnlyAction()) {
      notifyWarning('nodeMgmt.switchMainnet')
      return
    }

    router.push({ name: ROUTE_NAMES.NODE_LIST })
  }

  function handleVote() {
    if (shouldBlockMainnetOnlyAction()) {
      notifyWarning('nodeMgmt.switchMainnet')
      return
    }

    router.push({ name: ROUTE_NAMES.VOTE_LOGIN })
  }

  function handleNodeApply() {
    router.push({ name: ROUTE_NAMES.NODE_APPLY })
  }

  function openPolicyPage() {
    openExternalUrl('https://node.ont.io/voting-policy/' + locale.value)
  }

  return {
    onlyTestNet,
    handleAuthorization,
    handleNodeApply,
    handleNodeStake,
    handleVote,
    openPolicyPage,
  }
}
