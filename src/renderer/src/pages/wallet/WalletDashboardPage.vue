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

        <section class="ow-panel wallet-dashboard__panel wallet-dashboard__panel--maintenance">
          <div class="wallet-dashboard__maintenance">
            <div class="wallet-dashboard__maintenance-row">
              <span class="wallet-dashboard__maintenance-label">{{
                $t('commonWalletHome.claimableOng')
              }}</span>
              <span class="wallet-dashboard__maintenance-value">{{
                balanceDisplay.unboundOng
              }}</span>
            </div>
            <div class="wallet-dashboard__maintenance-row">
              <span class="wallet-dashboard__maintenance-label">{{
                $t('commonWalletHome.unboundOng')
              }}</span>
              <span class="wallet-dashboard__maintenance-value">{{
                balanceDisplay.waitBoundOng
              }}</span>
            </div>
            <div class="wallet-dashboard__maintenance-actions">
              <redeem-info-icon></redeem-info-icon>
              <a-button type="default" class="wallet-dashboard__redeem" @click="redeemOng">{{
                $t('commonWalletHome.redeem')
              }}</a-button>
            </div>
          </div>
        </section>
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
import RedeemInfoIcon from '../../shared/ui/feedback/RedeemInfoIcon.vue'
import Oep4Selection from '../../modules/wallet/ui/Oep4Selection.vue'
import WalletAddressToolbar from '../../modules/wallet/ui/WalletAddressToolbar.vue'
import WalletBalancePanel from '../../modules/wallet/ui/WalletBalancePanel.vue'
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

<style scoped>
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

.wallet-dashboard__panel {
  min-width: 0;
  padding: var(--ow-space-3);
}

.wallet-dashboard__maintenance {
  display: grid;
  gap: var(--ow-space-1);
}

.wallet-dashboard__maintenance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-4);
}

.wallet-dashboard__maintenance-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__maintenance-value {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__maintenance-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ow-space-2);
}

.wallet-dashboard__redeem {
  min-width: 120px;
  border-radius: var(--ow-radius-control);
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
