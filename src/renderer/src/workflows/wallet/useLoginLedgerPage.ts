import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { usePollingTask } from '../../shared/composables/usePollingTask'
import { useLedgerWalletStore } from '../../stores/modules/LedgerWallet'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import {
  loadLedgerAccountSelection,
  readLedgerDeviceInfo,
} from '../../modules/wallet/application/ledgerWalletConnectionService'
import { verifyLedgerLogin } from '../../modules/wallet/application/ledgerWalletSessionService'
import { ROUTE_NAMES } from '../../router/routes'

const interval = 3000

export function useLoginLedgerPage() {
  const router = useRouter()
  const { t } = useI18n()
  const currentWalletStore = useCurrentWalletStore()
  const ledgerWalletStore = useLedgerWalletStore()

  const ledgerStatus = ref('')
  const device = ref<unknown | null>(null)
  const publicKey = ref('')
  const currentWallet = ref(currentWalletStore.wallet)
  usePollingTask(getDevice, { intervalMs: interval })

  function goBack() {
    router.push({ name: ROUTE_NAMES.WALLETS })
  }

  function getDevice() {
    readLedgerDeviceInfo().then((result) => {
      if (!result.ok) {
        const err = result.error
        if (err === 'NOT_FOUND') {
          ledgerStatus.value = t('common.ledgerNotOpen')
        } else if (err === 'NOT_SUPPORT') {
          ledgerStatus.value = t('common.ledgerNotSupported')
        } else {
          ledgerStatus.value = t('common.pluginDevice')
        }
        return
      }

      device.value = result.deviceInfo
      getLedgerPublicKey()
    })
  }

  function getLedgerPublicKey() {
    const acctNum = 0
    const neo = Boolean(
      (currentWallet.value as { neo?: boolean | number } | null | undefined)?.neo ?? false
    )
    loadLedgerAccountSelection({ acct: acctNum, neo }).then((result) => {
      if (!result.ok) {
        ledgerStatus.value =
          typeof result.error === 'object' && result.error !== null && 'message' in result.error
            ? String(result.error.message || t('common.pluginDevice'))
            : t('common.pluginDevice')
        return
      }

      publicKey.value = result.selection?.publicKey || ''
      ledgerStatus.value = t('common.readyToLogin')
      login()
    })
  }

  async function login() {
    if (!device.value || !publicKey.value) {
      return
    }

    const result = await verifyLedgerLogin({
      publicKey: publicKey.value,
      currentWallet: currentWallet.value,
    })

    if (!result.ok) {
      ledgerStatus.value = t('common.invalidLedger')
      return
    }

    ledgerWalletStore.setLoggedInLedger(result.ledgerWallet)
    router.push({ name: ROUTE_NAMES.WALLET_DASHBOARD })
  }

  return {
    currentWallet,
    device,
    goBack,
    ledgerStatus,
    publicKey,
  }
}
