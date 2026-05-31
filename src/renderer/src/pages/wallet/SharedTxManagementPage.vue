<template>
  <div class="ow-page-shell shared-tx-management">
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.txMgmt')"
      @backEvent="handleBack"
    ></breadcrumb>

    <div class="pax-container shared-tx-management__body">
      <div class="pax-header shared-tx-management__tabs">
        <a-radio-group
          :value="status"
          class="status-group"
          button-style="solid"
          @change="handleStatusChange"
        >
          <a-radio-button value="0">{{ $t('sharedTx.startTx') }}</a-radio-button>
          <a-radio-button value="1">{{ $t('sharedTx.signTx') }}</a-radio-button>
        </a-radio-group>
      </div>

      <div class="tx-content shared-tx-management__content">
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
.shared-tx-management {
  display: grid;
  gap: var(--ow-space-3);
}

.shared-tx-management__body {
  width: min(100%, 900px);
  margin: 0 auto;
}

.shared-tx-management__tabs {
  padding-bottom: var(--ow-space-4);
  text-align: left;
}

.shared-tx-management__tabs :deep(.ant-radio-group) {
  display: flex;
  flex-wrap: wrap;
}

.shared-tx-management__content {
  padding-bottom: var(--ow-space-5);
}

@media (max-width: 560px) {
  .shared-tx-management {
    padding: 0 var(--ow-space-3);
  }

  .shared-tx-management__content {
    padding-bottom: var(--ow-space-3);
  }
}
</style>
