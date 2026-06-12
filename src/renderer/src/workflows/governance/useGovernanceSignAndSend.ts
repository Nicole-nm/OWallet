import { computed, toRaw, ref } from 'vue'
import {
  signGovernancePayload,
  submitGovernanceSignedTransaction,
} from '../../modules/governance/application/common/governanceSigningApplicationService'
import {
  isSdkTransactionLike,
  type GovernanceSignablePayload,
} from '../../modules/governance/application/common/governanceSignablePayload'
import { WalletAdapterFactory } from '../../modules/wallet/application/adapter/WalletAdapterFactory'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, notifyWarning, showAppError } from '../../shared/ui/feedback'
import { classifyError } from '../../shared/lib/errors'
import { handleTransactionFeedback } from '../../shared/lib/transactionFeedback'
import { isCommonWallet, type WalletSigner } from '../../shared/lib/types'
import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'

interface UseGovernanceSignAndSendOptions {
  /** The wallet that will sign the transaction. */
  wallet: () => WalletSigner | null | undefined
  /** Whether the signing UI is currently active — gates Ledger polling. Defaults to always on. */
  active?: () => boolean
}

export type GovernanceSignAndSendResult = { ok: boolean; cancelled?: boolean }

/**
 * Inline (modal-free) signing for governance transactions: renders a password field
 * for common wallets or Ledger status for hardware wallets, then signs and broadcasts.
 * Shared by the node-apply and new-authorization flows.
 */
export function useGovernanceSignAndSend({ wallet, active }: UseGovernanceSignAndSendOptions) {
  const loadingStore = useLoadingModalStore()
  const walletPassword = ref('')
  const usesCommonWallet = computed(() => isCommonWallet(wallet()))
  const { ledgerStatus, ledgerWallet, pauseMonitoring, startMonitoring } = useLedgerStatusMonitor({
    shouldPoll: computed(() => (active ? active() : true) && !usesCommonWallet.value),
  })

  function ensureSignerReady(): boolean {
    const signer = wallet()
    const usingLedger = !usesCommonWallet.value

    if (!signer?.address) {
      notifyError('nodeStake.selectIndividualWallet')
      return false
    }
    if (!usingLedger && !walletPassword.value) {
      notifyError('nodeStake.passwordEmpty')
      return false
    }
    if (usingLedger && !ledgerWallet.value.address) {
      notifyWarning('ledgerWallet.connectApp')
      return false
    }
    return true
  }

  async function signAndSend(
    payload: GovernanceSignablePayload
  ): Promise<GovernanceSignAndSendResult> {
    if (!ensureSignerReady()) return { ok: false }

    if (payload === null || payload === undefined || payload === '') {
      notifyError('common.networkErr')
      return { ok: false }
    }

    const signer = wallet() as WalletSigner
    const usingLedger = !usesCommonWallet.value

    try {
      loadingStore.showLoadingModals()

      if (usingLedger) {
        await pauseMonitoring()
      }

      const adapter = WalletAdapterFactory.fromWalletSigner(signer)
      if (!adapter) {
        notifyError('nodeStake.selectIndividualWallet')
        return { ok: false }
      }

      const signResult = await signGovernancePayload({
        payload: toRaw(payload),
        adapter,
        password: walletPassword.value,
        ledgerConnected: Boolean(ledgerWallet.value.address),
      })

      if (!signResult.ok) {
        if (signResult.cancelled) {
          walletPassword.value = ''
          return { ok: false, cancelled: true }
        }
        notifyGovernanceSigningFailure(signResult)
        return { ok: false }
      }

      const signedTx = toRaw(signResult.signedPayload)
      if (!isSdkTransactionLike(signedTx)) {
        notifyError('common.networkErr')
        return { ok: false }
      }

      walletPassword.value = ''
      const sendResult = await submitGovernanceSignedTransaction({ tx: signedTx })
      if (!sendResult.ok && 'category' in sendResult && sendResult.category === 'network') {
        notifyError(sendResult.errorKey ?? 'common.networkErr')
        return { ok: false }
      }

      loadingStore.hideLoadingModals()
      const feedback = handleTransactionFeedback(sendResult)
      if (!feedback.ok) {
        return { ok: false }
      }

      return { ok: true }
    } catch (err: unknown) {
      showAppError(classifyError(err))
      return { ok: false }
    } finally {
      loadingStore.hideLoadingModals()
      if (usingLedger) {
        startMonitoring()
      }
    }
  }

  return {
    walletPassword,
    usesCommonWallet,
    ledgerStatus,
    ledgerWallet,
    ensureSignerReady,
    signAndSend,
  }
}
