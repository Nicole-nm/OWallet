<template>
  <div class="pending-confirm">
    <shared-transfer-review-panel
      :amount="pendingTx.amount"
      :asset="pendingTx.assetName"
      :fee="gas"
      :payers="pendingTx.coPayerSignDtos"
      :recipient="pendingTx.receiveaddress"
      :required-number="sharedWallet.requiredNumber"
      :title-key="isRedeem ? 'sharedWalletHome.redeemOng' : 'sharedWalletHome.transaction'"
      :total-number="sharedWallet.totalNumber"
    ></shared-transfer-review-panel>

    <page-footer-actions align="between" class="pending-confirm__actions">
      <a-button type="default" variant="secondary" @click="cancel">{{
        $t('sharedWalletHome.cancel')
      }}</a-button>
      <a-button type="primary" variant="primary" :disabled="!showSign" @click="next">{{
        $t('sharedWalletHome.next')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BigNumber } from 'bignumber.js'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { findNextLocalSharedSigner } from '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import SharedTransferReviewPanel from './SharedTransferReviewPanel.vue'
defineOptions({
  name: 'PendingConfirm',
})

const emit = defineEmits(['cancelEvent', 'sendConfirmBack', 'signEvent'])

const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const pendingTx = computed(() => currentWalletStore.pendingTx)
const isRedeem = computed(() => Boolean(currentWalletStore.transfer.isRedeem))
const gas = computed(() => {
  const gasPrice = new BigNumber(currentWalletStore.pendingTx.gasprice)
  const gasLimit = new BigNumber(currentWalletStore.pendingTx.gaslimit)
  return gasPrice.multipliedBy(gasLimit).div(1e9).toString()
})

const showSign = ref(false)

onMounted(() => {
  updateShowSign()
})

async function updateShowSign() {
  showSign.value = false
  currentWalletStore.setCurrentSigner()

  const result = await findNextLocalSharedSigner(pendingTx.value.coPayerSignDtos)
  if (result.ok && result.signer) {
    currentWalletStore.setCurrentSigner({ account: result.signer })
    showSign.value = true
  }
}

function next() {
  emit('signEvent')
}

function cancel() {
  emit('cancelEvent')
}
</script>

<style scoped lang="scss">
.pending-confirm {
  width: min(100%, 880px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-3);
}

.pending-confirm__actions {
  height: 72px;
  margin-top: 0;
}

.pending-confirm__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
}
</style>
