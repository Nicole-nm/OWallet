<template>
  <div>
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.pendingTx')"
      @backEvent="backToWallets"
    ></breadcrumb>
    <div class="ow-send-flow pending-container">
      <pending-confirm @signEvent="handleSignEvent" v-if="!showInputPass"></pending-confirm>
      <pending-tx-sign
        @backEvent="handleBackEvent"
        @submitEvent="handleSubmitEvent"
        v-if="showInputPass"
      ></pending-tx-sign>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import PendingConfirm from '../../workflows/wallet/PendingConfirmStep.vue'
import PendingTxSign from '../../workflows/wallet/PendingTxSignStep.vue'
import { usePendingTxHomePage } from '../../workflows/wallet/usePendingTxHomePage'

defineOptions({
  name: 'PendingTxHomePage',
})

const {
  routes,
  backToWallets,
  showInputPass,
  handleSignEvent,
  handleBackEvent,
  handleSubmitEvent,
} = usePendingTxHomePage()
</script>

<style scoped>
.pending-container {
  margin-top: 4rem;
  margin-bottom: 4rem;
  padding-bottom: 0;
}
</style>
