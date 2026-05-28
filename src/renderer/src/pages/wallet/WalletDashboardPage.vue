<template>
  <div class="ow-page-shell wallet-dashboard">
    <breadcrumb :current="currentWallet.label" @backEvent="handleBack"></breadcrumb>

    <section class="ow-panel wallet-dashboard__toolbar">
      <div class="wallet-dashboard__toolbar-copy">
        <div class="wallet-dashboard__address-row">
          <span class="wallet-dashboard__address-label">{{ $t('sharedWalletHome.address') }}</span>
          <div class="wallet-dashboard__address-bar">
            <span class="wallet-dashboard__address">{{ address }}</span>
            <div class="wallet-dashboard__qr-trigger">
              <button type="button" class="wallet-dashboard__icon-button">
                <QrcodeOutlined />
              </button>
              <div class="wallet-dashboard__qr-preview">
                <vue-qrcode :value="address" :size="168"></vue-qrcode>
              </div>
            </div>
            <button type="button" class="wallet-dashboard__icon-button" @click="copy(address)">
              <CopyOutlined />
            </button>
          </div>
        </div>
      </div>

      <div class="wallet-dashboard__toolbar-actions">
        <a-button class="wallet-dashboard__action" type="primary" @click="sendAsset">
          <SendOutlined />
          {{ $t('sharedWalletHome.send') }}
        </a-button>
        <a-button class="wallet-dashboard__action" type="primary" @click="commonReceive">
          <QrcodeOutlined />
          {{ $t('sharedWalletHome.receive') }}
        </a-button>
      </div>
    </section>

    <div class="wallet-dashboard__grid">
      <div class="wallet-dashboard__column">
        <section class="ow-panel wallet-dashboard__panel">
          <div class="wallet-dashboard__panel-header">
            <h2 class="wallet-dashboard__panel-title">{{ $t('sharedWalletHome.balance') }}</h2>
            <div class="wallet-dashboard__panel-actions">
              <button type="button" class="wallet-dashboard__icon-button" @click="refresh(true)">
                <ReloadOutlined />
              </button>
              <button type="button" class="wallet-dashboard__icon-button" @click="addOep4">
                <PlusOutlined />
              </button>
            </div>
          </div>

          <div class="wallet-dashboard__asset-list">
            <div class="wallet-dashboard__asset-row">
              <span class="wallet-dashboard__asset-label">ONT</span>
              <span class="wallet-dashboard__asset-amount">{{ balance.ont }}</span>
            </div>

            <div class="wallet-dashboard__asset-row">
              <span class="wallet-dashboard__asset-label">ONG</span>
              <span class="wallet-dashboard__asset-amount">{{ balance.ong }}</span>
            </div>

            <div
              class="wallet-dashboard__asset-row"
              v-for="item of oep4s"
              :key="item.contract_hash"
            >
              <span class="wallet-dashboard__asset-label">{{ item.symbol }}</span>
              <span class="wallet-dashboard__asset-amount">{{ item.balance }}</span>
            </div>
          </div>
        </section>

        <section class="ow-panel wallet-dashboard__panel wallet-dashboard__panel--maintenance">
          <div class="wallet-dashboard__maintenance">
            <div class="wallet-dashboard__maintenance-row">
              <span class="wallet-dashboard__maintenance-label">{{
                $t('commonWalletHome.claimableOng')
              }}</span>
              <span class="wallet-dashboard__maintenance-value">{{ balance.unboundOng }}</span>
            </div>
            <div class="wallet-dashboard__maintenance-row">
              <span class="wallet-dashboard__maintenance-label">{{
                $t('commonWalletHome.unboundOng')
              }}</span>
              <span class="wallet-dashboard__maintenance-value">{{ balance.waitBoundOng }}</span>
            </div>
            <div class="wallet-dashboard__maintenance-actions">
              <a-button type="default" class="wallet-dashboard__redeem" @click="redeemOng">{{
                $t('commonWalletHome.redeem')
              }}</a-button>
              <redeem-info-icon></redeem-info-icon>
            </div>
          </div>
        </section>
      </div>

      <section class="ow-panel wallet-dashboard__panel wallet-dashboard__panel--transactions">
        <div class="wallet-dashboard__panel-header">
          <h2 class="wallet-dashboard__panel-title">{{ $t('sharedWalletHome.completedTx') }}</h2>
        </div>

        <div class="wallet-dashboard__tx-list">
          <div
            v-for="(tx, index) in completedTx"
            :key="tx.txHash + index"
            class="wallet-dashboard__tx-row"
            @click="showTxDetail(tx.txHash)"
          >
            <span class="wallet-dashboard__tx-hash">{{ tx.txHash.substring(0, 40) + '...' }}</span>
            <span class="wallet-dashboard__tx-amount">{{ tx.amount }} {{ tx.asset }}</span>
          </div>

          <div
            class="wallet-dashboard__more-link"
            v-if="completedTx.length > 6"
            @click="checkMoreTx"
          >
            {{ $t('sharedWalletHome.checkMore') }}
            <RightOutlined class="icon-arrow" />
          </div>
        </div>
      </section>
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
import VueQrcode from 'qrcode.vue'
import { useWalletDashboardPage } from '../../workflows/wallet/useWalletDashboardPage'
import {
  CopyOutlined,
  SendOutlined,
  QrcodeOutlined,
  RightOutlined,
  ReloadOutlined,
  PlusOutlined,
} from '@ant-design/icons-vue'

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
  balance,
  oep4s,
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
.wallet-dashboard {
  display: grid;
  gap: var(--ow-space-3);
}

.wallet-dashboard__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--ow-space-3);
  padding: var(--ow-space-3);
}

.wallet-dashboard__toolbar-copy {
  min-width: 0;
  flex: 0 1 560px;
  width: min(100%, 560px);
}

.wallet-dashboard__address-row {
  display: grid;
  gap: var(--ow-space-1);
}

.wallet-dashboard__address-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__address-bar {
  display: flex;
  align-items: center;
  gap: var(--ow-space-3);
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.wallet-dashboard__address {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__address::-webkit-scrollbar {
  height: 4px;
}

.wallet-dashboard__address::-webkit-scrollbar-thumb {
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-border-default);
}

.wallet-dashboard__redeem-note {
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__qr-trigger {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.wallet-dashboard__qr-preview {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ow-space-2);
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
  box-shadow: var(--ow-shadow-card);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease;
}

.wallet-dashboard__qr-trigger:hover .wallet-dashboard__qr-preview,
.wallet-dashboard__qr-trigger:focus-within .wallet-dashboard__qr-preview {
  opacity: 1;
  visibility: visible;
}

.wallet-dashboard__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  align-items: center;
  gap: var(--ow-space-2);
}

.wallet-dashboard__action {
  min-width: 132px;
  height: var(--ow-button-height);
  border: none;
  border-radius: var(--ow-radius-control);
  background: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
}

.wallet-dashboard__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-3);
  align-items: start;
}

.wallet-dashboard__column {
  display: grid;
  gap: var(--ow-space-3);
  min-width: 0;
}

.wallet-dashboard__panel {
  min-width: 0;
  padding: var(--ow-space-3);
}

.wallet-dashboard__panel--maintenance {
  align-self: start;
}

.wallet-dashboard__panel-title {
  margin: 0;
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
  line-height: var(--ow-line-height-title);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__panel-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ow-space-3);
  margin-bottom: var(--ow-space-2);
}

.wallet-dashboard__panel-actions {
  display: flex;
  gap: var(--ow-space-2);
}

.wallet-dashboard__icon-button {
  flex-shrink: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-surface-muted);
  color: var(--ow-color-brand);
  cursor: pointer;
}

.wallet-dashboard__icon-button:hover,
.wallet-dashboard__icon-button:focus-visible {
  border-color: var(--ow-color-brand);
  background: var(--ow-color-surface-selected);
}

.wallet-dashboard__asset-list,
.wallet-dashboard__tx-list {
  display: grid;
  gap: 0;
}

.wallet-dashboard__asset-row,
.wallet-dashboard__tx-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ow-space-3);
  min-width: 0;
  padding: 10px 0;
  border-bottom: 1px solid var(--ow-color-border-subtle);
  background: transparent;
}

.wallet-dashboard__asset-row:last-child,
.wallet-dashboard__tx-row:last-of-type {
  border-bottom: 0;
}

.wallet-dashboard__asset-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__asset-amount,
.wallet-dashboard__tx-amount,
.wallet-dashboard__maintenance-value {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__maintenance {
  display: grid;
  gap: var(--ow-space-1);
  margin-top: 0;
  padding-top: 0;
  border-top: 0;
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

.wallet-dashboard__maintenance-actions {
  display: flex;
  align-items: center;
  justify-content: flex-start;
  gap: var(--ow-space-2);
  padding-top: 2px;
}

.wallet-dashboard__redeem {
  min-width: 120px;
  border-radius: var(--ow-radius-control);
  border: 1px solid var(--ow-color-border-default);
}

.wallet-dashboard__tx-row {
  cursor: pointer;
  transition:
    border-color 0.15s ease,
    transform 0.15s ease,
    box-shadow 0.15s ease;
}

.wallet-dashboard__tx-row:hover {
  border-color: var(--ow-color-brand);
  background: var(--ow-color-surface-muted);
  transform: none;
  box-shadow: none;
}

.wallet-dashboard__tx-hash {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__tx-amount {
  white-space: nowrap;
}

.wallet-dashboard__more-link {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  margin-top: var(--ow-space-2);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-brand);
  cursor: pointer;
}

@media (max-width: 960px) {
  .wallet-dashboard__grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 720px) {
  .wallet-dashboard__toolbar,
  .wallet-dashboard__panel-header,
  .wallet-dashboard__maintenance {
    flex-direction: column;
    align-items: stretch;
  }

  .wallet-dashboard__toolbar-actions,
  .wallet-dashboard__panel-actions {
    justify-content: flex-start;
  }

  .wallet-dashboard__toolbar-copy {
    width: 100%;
  }
}

@media (max-width: 560px) {
  .wallet-dashboard__toolbar,
  .wallet-dashboard__panel {
    padding: 10px 12px;
  }

  .wallet-dashboard__address-bar,
  .wallet-dashboard__asset-row,
  .wallet-dashboard__tx-row,
  .wallet-dashboard__maintenance-row {
    align-items: flex-start;
  }

  .wallet-dashboard__toolbar-actions,
  .wallet-dashboard__maintenance-actions {
    width: 100%;
  }

  .wallet-dashboard__action,
  .wallet-dashboard__redeem {
    width: 100%;
  }
}
</style>
