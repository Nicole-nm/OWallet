<template>
  <div>
    <a-modal
      :title="$t('nodeStake.signWithWallet')"
      :open="open"
      @ok="handleWalletSignOK"
      @cancel="handleWalletSignCancel"
    >
      <div v-if="usesCommonWallet">
        <p>{{ $t('nodeStake.enterWalletPass') }}</p>
        <a-input
          class="input"
          v-model:value="walletPassword"
          :placeholder="$t('nodeStake.password')"
          type="password"
        ></a-input>
      </div>
      <div v-if="!usesCommonWallet">
        <ledger-status-notice :status="ledgerStatus" compact />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, toRaw, type PropType } from 'vue'
import {
  signGovernancePayload,
  submitGovernanceSignedTransaction,
} from '../../modules/governance/application/governanceSigningApplicationService'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { notifyError, notifyWarning } from '../../shared/ui/feedback'
import { handleTransactionFeedback } from '../../shared/lib/transactionFeedback'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import { isCommonWallet } from '../../shared/lib/types'
import { notifyGovernanceSigningFailure } from './governanceSigningFeedback'
import type { SdkTransactionLike } from '../../shared/chain/types'
import type { WalletSigner } from '../../shared/lib/types'
import type { GovernanceSignablePayload } from './governanceSigningTypes'
// common component to sign tx or messages with wallet or ledger.

defineOptions({
  name: 'SignSendTx',
})

const props = defineProps({
  tx: {
    type: [Object, String] as PropType<GovernanceSignablePayload>,
    required: false,
    default: null,
  },
  wallet: {
    type: Object as PropType<WalletSigner | null>,
    required: false,
    default: null,
  },
  open: {
    type: Boolean,
    required: true,
  },
  sendAfterSign: {
    required: false,
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits(['update:open', 'signClose', 'afterSign', 'txSent'])
const loadingStore = useLoadingModalStore()

const walletPassword = ref('')
const usesCommonWallet = computed(() => isCommonWallet(props.wallet))
const { startMonitoring, stopMonitoring, ledgerStatus, ledgerWallet } = useLedgerStatusMonitor({
  shouldPoll: computed(() => props.open && !usesCommonWallet.value),
})

function unwrapPayload(payload: unknown): GovernanceSignablePayload {
  return typeof payload === 'string' ? payload : (toRaw(payload) as GovernanceSignablePayload)
}

function isSdkTransactionLike(payload: unknown): payload is SdkTransactionLike {
  return Boolean(
    payload &&
    typeof payload === 'object' &&
    typeof (payload as SdkTransactionLike).serializeUnsignedData === 'function' &&
    typeof (payload as SdkTransactionLike).serialize === 'function' &&
    typeof (payload as SdkTransactionLike).getHash === 'function'
  )
}

function handleWalletSignCancel() {
  walletPassword.value = ''
  emit('update:open', false)
  emit('signClose')
}

async function handleWalletSignOK() {
  const payload = unwrapPayload(props.tx)
  const wallet = props.wallet
  const usingLedger = !usesCommonWallet.value

  if (payload === null || payload === undefined || payload === '') {
    notifyError('common.networkErr')
    return
  }

  if (!wallet?.address) {
    notifyError('nodeStake.selectIndividualWallet')
    return
  }

  if (!usingLedger && !walletPassword.value) {
    notifyError('nodeStake.passwordEmpty')
    return
  }

  if (usingLedger && !ledgerWallet.value.address) {
    notifyWarning('ledgerWallet.connectApp')
    return
  }

  try {
    loadingStore.showLoadingModals()

    if (usingLedger) {
      stopMonitoring()
      await new Promise((resolve) => setTimeout(resolve, 1000))
    }

    const result = await signGovernancePayload({
      payload,
      wallet,
      password: walletPassword.value,
      ledgerConnected: Boolean(ledgerWallet.value.address),
    })

    if (!result.ok) {
      if (result.cancelled) {
        walletPassword.value = ''
        return
      }
      notifyGovernanceSigningFailure(result)
      return
    }

    if (typeof payload === 'string') {
      walletPassword.value = ''
      loadingStore.hideLoadingModals()
      emit('afterSign', result.signedPayload)
      return
    }

    await sendTx(result.signedPayload)
    walletPassword.value = ''
  } catch {
    notifyError('common.networkErr')
  } finally {
    loadingStore.hideLoadingModals()
    if (usingLedger) {
      startMonitoring()
    }
  }
}

async function sendTx(tx: unknown) {
  if (!props.sendAfterSign) {
    loadingStore.hideLoadingModals()
    emit('afterSign', tx)
    return
  }

  const rawTx = unwrapPayload(tx)
  if (!isSdkTransactionLike(rawTx)) {
    loadingStore.hideLoadingModals()
    notifyError('common.networkErr')
    return
  }

  walletPassword.value = ''
  const result = await submitGovernanceSignedTransaction({ tx: rawTx })
  if (!result.ok && 'errorKey' in result && result.errorKey === 'common.networkErr') {
    loadingStore.hideLoadingModals()
    notifyError('common.networkErr')
    return
  }

  loadingStore.hideLoadingModals()
  const feedback = handleTransactionFeedback(result)
  if (!feedback.ok) {
    return
  }

  emit('txSent')
}
</script>
