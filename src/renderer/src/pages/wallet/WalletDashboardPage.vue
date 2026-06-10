<template>
  <div class="ow-page-shell wallet-dashboard">
    <breadcrumb :current="currentWallet.label" @backEvent="handleBack"></breadcrumb>

    <wallet-address-toolbar
      :address="address"
      @copy="copy(address)"
      @receive="commonReceive"
      @send="sendAsset"
    ></wallet-address-toolbar>

    <div class="wallet-dashboard__grid">
      <div class="wallet-dashboard__column">
        <wallet-balance-panel
          :balance-display="balanceDisplay"
          :oep4s-display="oep4sDisplay"
          @add-oep4="addOep4"
          @refresh="refresh(true)"
        ></wallet-balance-panel>

        <wallet-maintenance-panel
          :balance-display="balanceDisplay"
          @redeem="redeemOng"
        ></wallet-maintenance-panel>
      </div>

      <wallet-transactions-panel
        :completed-tx="completedTx"
        @more="checkMoreTx"
        @show-detail="showTxDetail"
      ></wallet-transactions-panel>
    </div>

    <a-modal :title="$t('redeemInfo.info')" v-model:open="redeemInfoVisible" @ok="handleModalOk">
      <p class="wallet-dashboard__redeem-note">{{ $t('redeemInfo.noClaimableOng') }}</p>
    </a-modal>

    <oep4-selection
      :open="showOep4Selection"
      :oep4s="oep4SelectionItems"
      :page-number="oep4SelectionPageNumber"
      :total="oep4SelectionTotal"
      @update:open="handleOep4SelectionOpenChange"
      @page-change="handleOep4SelectionPageChange"
      @toggle-selection="toggleOep4Selection"
    ></oep4-selection>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import Oep4Selection from '../../modules/wallet/ui/Oep4Selection.vue'
import WalletAddressToolbar from '../../modules/wallet/ui/WalletAddressToolbar.vue'
import WalletBalancePanel from '../../modules/wallet/ui/WalletBalancePanel.vue'
import WalletMaintenancePanel from '../../modules/wallet/ui/WalletMaintenancePanel.vue'
import WalletTransactionsPanel from '../../modules/wallet/ui/WalletTransactionsPanel.vue'
import { useWalletDashboardPage } from '../../workflows/wallet/useWalletDashboardPage'

defineOptions({
  name: 'WalletDashboardPage',
})

const {
  currentWallet,
  handleBack,
  address,
  copy,
  refresh,
  addOep4,
  balanceDisplay,
  oep4sDisplay,
  redeemOng,
  sendAsset,
  commonReceive,
  completedTx,
  showTxDetail,
  checkMoreTx,
  redeemInfoVisible,
  handleModalOk,
  showOep4Selection,
  oep4SelectionItems,
  oep4SelectionPageNumber,
  oep4SelectionTotal,
  handleOep4SelectionOpenChange,
  handleOep4SelectionPageChange,
  toggleOep4Selection,
} = useWalletDashboardPage()
</script>

<style scoped lang="scss">
.wallet-dashboard,
.wallet-dashboard__column {
  display: grid;
  gap: var(--ow-space-3);
}

.wallet-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-3);
  align-items: start;
}

.wallet-dashboard__redeem-note {
  color: var(--ow-color-text-primary);
}

@media (max-width: 960px) {
  .wallet-dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
