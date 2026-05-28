<template>
  <div>
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.txMgmt')"
      @backEvent="handleBack"
    ></breadcrumb>
    <div class="pax-container">
      <div class="pax-header">
        <a-radio-group :value="status" @change="handleStatusChange" class="status-group">
          <a-radio-button value="0">{{ $t('sharedTx.startTx') }}</a-radio-button>
          <a-radio-button value="1">{{ $t('sharedTx.signTx') }}</a-radio-button>
        </a-radio-group>
      </div>
      <div class="tx-content">
        <start-shared-tx
          v-if="status === '0'"
          :localSigners="localCopayers"
          :sharedWallet="sharedWallet"
        ></start-shared-tx>
        <sign-shared-tx
          v-if="status === '1'"
          :localSigners="localCopayers"
          :sharedWallet="sharedWallet"
        ></sign-shared-tx>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import StartSharedTx from '../../workflows/wallet/StartSharedTxPanel.vue'
import SignSharedTx from '../../workflows/wallet/SignSharedTxPanel.vue'
import { useSharedTxManagementPage } from '../../workflows/wallet/useSharedTxManagementPage'

defineOptions({
  name: 'SharedTxManagementPage',
})

const { routes, handleBack, status, handleStatusChange, localCopayers, sharedWallet } =
  useSharedTxManagementPage()
</script>

<style scoped>
.pax-container {
  text-align: center;
  position: relative;
}
</style>
