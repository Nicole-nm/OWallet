<template>
  <div class="ow-editor-row">
    <p class="ow-editor-label">{{ $t('sharedTx.signTx') }}</p>

    <div class="ow-editor-control">
      <div v-if="wallet.type === 'CommonWallet'">
        <a-input
          type="password"
          class="input-pass"
          :placeholder="$t('sharedTx.inputPassword')"
          v-model:value="password"
        ></a-input>
      </div>

      <ledger-status-notice
        class="ledger-status"
        v-if="wallet.type === 'HardwareWallet'"
        :status="ledgerStatus"
      >
        <p>{{ $t('sharedTx.ledgerSignMultiTimes') }}</p>
      </ledger-status-notice>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, PropType } from 'vue'
import { signSerializedSharedTransaction } from '../../modules/wallet/application/sharedWalletTransactionApplicationService'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { notifyError } from '../../shared/ui/feedback'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import type { SharedWalletSigner } from '../../shared/types'

defineOptions({
  name: 'SignSharedTx',
})

const props = defineProps({
  wallet: {
    type: Object as PropType<SharedWalletSigner>,
    default: () => ({ type: '', address: '', publicKey: '' }),
  },
  signRequest: {
    type: Object as PropType<Record<string, unknown> | null>,
    default: null,
  },
})

const emit = defineEmits(['sharedTxSigned'])
const loadingStore = useLoadingModalStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const password = ref('')
const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const { ledgerStatus, ledgerPk } = useLedgerStatusMonitor({
  shouldPoll: computed(() => props.wallet.type === 'HardwareWallet'),
})

watch(
  () => props.signRequest,
  (request) => {
    if (!request?.tx) {
      return
    }

    signSharedTx(request.isFirstSign, request.tx)
  }
)

async function signSharedTx(isFirstSign: unknown, tx: unknown) {
  if (
    (props.wallet.type === 'CommonWallet' && !password.value) ||
    (props.wallet.type === 'HardwareWallet' && !ledgerPk.value)
  ) {
    return
  }

  const result = await signSerializedSharedTransaction({
    serializedTx: String(tx || ''),
    sharedWallet: sharedWallet.value,
    wallet: props.wallet,
    password: props.wallet.type === 'CommonWallet' ? password.value : undefined,
    isFirstSign: Boolean(isFirstSign),
  })

  if (!result.ok) {
    if (!result.cancelled) {
      loadingStore.hideLoadingModals()
      notifyError('ledgerWallet.signFailed')
    }
    return
  }

  emit('sharedTxSigned', result.serializedTx)
}
</script>
