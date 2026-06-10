<template>
  <div class="ow-page-shell wallet-dashboard">
    <breadcrumb :current="sharedWallet.sharedWalletName" @backEvent="handleBack"></breadcrumb>

    <wallet-address-toolbar
      :address="sharedWallet.sharedWalletAddress"
      :show-actions="hasLocalCopayer"
      @copy="copy"
      @receive="showReceive"
      @send="showTransferBox"
    >
      <template #address-actions>
        <a-tooltip v-if="registered === true" :title="$t('sharedWalletHome.registered')">
          <span
            class="wallet-dashboard__icon-button registration-button registration-button--registered"
          >
            <CheckCircleFilled />
          </span>
        </a-tooltip>
        <a-tooltip v-else-if="registered === false" :title="$t('sharedWalletHome.registerPrompt')">
          <button
            type="button"
            class="wallet-dashboard__icon-button registration-button registration-button--unregistered"
            :disabled="registering"
            @click="handleRegister"
          >
            <a-spin v-if="registering" size="small" />
            <ExclamationCircleFilled v-else />
          </button>
        </a-tooltip>
        <span
          v-else
          class="wallet-dashboard__icon-button registration-button registration-button--loading"
        >
          <a-spin size="small" />
        </span>
      </template>
      <template #extra-actions>
        <a-dropdown>
          <template #overlay>
            <a-menu>
              <a-menu-item key="1" @click="showTxMgmt()">
                <span>{{ $t('sharedWalletHome.txMgmt') }}</span>
              </a-menu-item>
            </a-menu>
          </template>
          <a-button class="wallet-dashboard__more-action">
            {{ $t('common.more') }}
            <DownOutlined />
          </a-button>
        </a-dropdown>
      </template>
    </wallet-address-toolbar>

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

      <div class="wallet-dashboard__column">
        <shared-wallet-pending-transactions-panel
          :pending-tx="pendingTx"
          :shared-wallet-address="sharedWallet.sharedWalletAddress"
          @show-detail="pendingTxDetail"
        ></shared-wallet-pending-transactions-panel>

        <wallet-transactions-panel
          :completed-tx="completedTx"
          :more-threshold="5"
          @more="checkMoreTx"
          @show-detail="showTxDetail"
        ></wallet-transactions-panel>
      </div>
    </div>
    <a-modal :title="$t('redeemInfo.info')" v-model:open="redeemInfoVisible" @ok="handleModalOk">
      <p class="shared-wallet-home__redeem-note">{{ $t('redeemInfo.noClaimableOng') }}</p>
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
import SharedWalletPendingTransactionsPanel from '../../modules/wallet/ui/SharedWalletPendingTransactionsPanel.vue'
import WalletAddressToolbar from '../../modules/wallet/ui/WalletAddressToolbar.vue'
import WalletBalancePanel from '../../modules/wallet/ui/WalletBalancePanel.vue'
import WalletMaintenancePanel from '../../modules/wallet/ui/WalletMaintenancePanel.vue'
import WalletTransactionsPanel from '../../modules/wallet/ui/WalletTransactionsPanel.vue'
import { useSharedWalletHomePage } from '../../workflows/wallet/useSharedWalletHomePage'
import { CheckCircleFilled, DownOutlined, ExclamationCircleFilled } from '@ant-design/icons-vue'

defineOptions({
  name: 'SharedWalletHomePage',
})

const {
  sharedWallet,
  copy,
  refresh,
  addOep4,
  handleBack,
  handleRegister,
  balanceDisplay,
  oep4sDisplay,
  redeemOng,
  hasLocalCopayer,
  showTransferBox,
  showReceive,
  showTxMgmt,
  pendingTx,
  completedTx,
  pendingTxDetail,
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
  registered,
  registering,
} = useSharedWalletHomePage()
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

.shared-wallet-home__redeem-note {
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__more-action {
  min-width: 132px;
  height: var(--ow-button-height);
  border-radius: var(--ow-radius-control);
  font-family: var(--ow-font-medium);
  color: var(--ow-color-brand);
}

.registration-button {
  font-size: 16px;
}

.registration-button--registered {
  --wallet-dashboard-icon-button-color: var(--ow-color-success);
  --wallet-dashboard-icon-button-hover-border-color: var(--ow-color-success);
  --wallet-dashboard-icon-button-hover-color: var(--ow-color-success);
  cursor: default;
}

.registration-button--unregistered {
  --wallet-dashboard-icon-button-color: var(--ow-color-warning);
  --wallet-dashboard-icon-button-hover-border-color: var(--ow-color-warning);
  --wallet-dashboard-icon-button-hover-color: var(--ow-color-warning);
}

.registration-button--loading {
  cursor: default;
}

.registration-button :deep(.ant-spin) {
  color: inherit;
  line-height: 1;
}

.registration-button :deep(.ant-spin-dot-item) {
  background-color: currentColor;
}

@media (max-width: 960px) {
  .wallet-dashboard__grid {
    grid-template-columns: 1fr;
  }
}
</style>
