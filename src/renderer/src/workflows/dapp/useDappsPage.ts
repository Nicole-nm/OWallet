import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'
import { openExternalUrl } from '../../modules/app/application/externalNavigationApplicationService'
import { ROUTE_NAMES } from '../../router/routes'

export function useDappsPage() {
  const router = useRouter()
  const redirectNoticeVisible = ref(false)

  onMounted(() => {
    redirectNoticeVisible.value = true
  })

  function handleRedirectConfirm() {
    redirectNoticeVisible.value = false
  }

  function handleRedirectCancel() {
    redirectNoticeVisible.value = false
    router.back()
  }

  function handleExchangeChangelly() {
    openExternalUrl(
      'https://widget.changelly.com/?currencies=&from=btc,eth&fromDefault=btc&to=ont&toDefault=ont&amount=0.001&address=&fiat=true&fixedTo=false&theme=default&ref_id=su5srryl1mhz4fno&merchant_id=su5srryl1mhz4fno'
    )
  }

  function handleExchangeCryptonex() {
    openExternalUrl('https://wallet.cryptonex.org/member/sign-in')
  }

  function handleOntidMgmt() {
    router.push({ name: ROUTE_NAMES.IDENTITIES })
  }

  return {
    redirectNoticeVisible,
    handleRedirectConfirm,
    handleRedirectCancel,
    handleExchangeChangelly,
    handleExchangeCryptonex,
    handleOntidMgmt,
  }
}
