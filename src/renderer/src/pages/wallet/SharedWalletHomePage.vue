<template>
  <div class="ow-page-shell">
    <breadcrumb :current="sharedWallet.sharedWalletName" @backEvent="handleBack"></breadcrumb>
    <div class="wallet-info">
      <p class="wallet-info__copy">
        {{ $t('sharedWalletHome.walletAddress') }}:
        <span class="wallet-info__address">{{ sharedWallet.sharedWalletAddress }}</span>
        <span class="common-icon copy-icon" @click="copy()"></span>
      </p>
    </div>
    <div class="ow-page-columns">
      <div class="ow-page-column">
        <div class="ow-asset-header">
          <div>
            <span>{{ $t('sharedWalletHome.balance') }}</span>
            <span class="common-icon refresh-icon" @click="refresh(true)"></span>
          </div>
          <span class="common-icon add-icon" @click="addOep4"></span>
        </div>
        <div class="ow-asset-list">
          <div class="ow-asset-row">
            <span class="ow-asset-label">ONT</span>
            <span class="ow-asset-amount">{{ balance.ont }}</span>
          </div>

          <div class="ow-asset-row">
            <span class="ow-asset-label">ONG</span>
            <span class="ow-asset-amount">{{ balance.ong }}</span>
          </div>

          <div class="ow-asset-row" v-for="item of oep4s" :key="item.contract_hash">
            <span class="ow-asset-label">{{ item.symbol }}</span>
            <span class="ow-asset-amount">{{ item.balance }}</span>
          </div>
        </div>

        <div class="left-footer">
          <div class="claim-ong-container">
            <div class="claim-ong">
              <div class="claim-ong-item">
                <span>{{ $t('commonWalletHome.claimableOng') }}:</span>
                <span>{{ balance.unboundOng }}</span>
              </div>
              <div class="claim-ong-item">
                <span>{{ $t('commonWalletHome.unboundOng') }}:</span>
                <span>{{ balance.waitBoundOng }}</span>
              </div>
            </div>
            <div class="redeem-container">
              <a-button type="default" class="btn-redeem" @click="redeemOng">{{
                $t('commonWalletHome.redeem')
              }}</a-button>
              <redeem-info-icon></redeem-info-icon>
            </div>
          </div>

          <div v-if="hasLocalCopayer" class="left-btn-container">
            <div>
              <a-button class="ow-asset-action" type="primary" @click="showTransferBox">
                <SendOutlined />
                {{ $t('sharedWalletHome.send') }}
              </a-button>
              <a-button class="ow-asset-action" type="primary" @click="showReceive">
                <QrcodeOutlined />
                {{ $t('sharedWalletHome.receive') }}
              </a-button>
            </div>

            <div class="left-btn-more">
              <div class="vertical-line"></div>
              <a-dropdown placement="topCenter">
                <template #overlay>
                  <a-menu>
                    <a-menu-item key="1" @click="showTxMgmt()">
                      <span>{{ $t('sharedWalletHome.txMgmt') }}</span>
                    </a-menu-item>
                    <a-menu-item key="2" @click="toCopayerDetail()">
                      <span>{{ $t('sharedWalletHome.copayers') }}</span>
                    </a-menu-item>
                  </a-menu>
                </template>
                <a-button class="btn-dropdown">
                  {{ $t('common.more') }}
                  <DownOutlined class="icon-arrow" />
                </a-button>
              </a-dropdown>
            </div>
          </div>
        </div>
      </div>

      <div class="ow-page-column">
        <div class="pending-tx">
          <div class="ow-tx-header">
            <span>{{ $t('sharedWalletHome.pendingTx') }}</span>
          </div>
          <div class="pending-tx-container">
            <div
              v-for="tx in pendingTx"
              :key="tx.transactionidhash"
              class="ow-tx-row"
              @click="pendingTxDetail(tx)"
            >
              <span>{{ tx.transactionidhash }}</span>
              <span>
                {{ tx.receiveaddress === sharedWallet.sharedWalletAddress ? '+' : '-' }}
                {{ tx.amount }} {{ tx.assetName }}
              </span>
            </div>
          </div>
        </div>
        <div class="completed-tx">
          <div class="ow-tx-header">
            <span>{{ $t('sharedWalletHome.completedTx') }}</span>
            <span class="transfer-icon"></span>
          </div>

          <div
            v-for="tx in completedTx"
            :key="tx.txHash"
            class="ow-tx-row"
            @click="showTxDetail(tx.txHash)"
          >
            <span>{{ tx.txHash.substring(0, 40) + '...' }}</span>
            <span>{{ tx.amount }} {{ tx.asset }}</span>
          </div>
          <div class="ow-more-link" v-if="completedTx.length > 5" @click="checkMoreTx">
            {{ $t('sharedWalletHome.checkMore') }}
            <RightOutlined class="icon-arrow" />
          </div>
        </div>
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
import RedeemInfoIcon from '../../shared/ui/feedback/RedeemInfoIcon.vue'
import Oep4Selection from '../../modules/wallet/ui/Oep4Selection.vue'
import { useSharedWalletHomePage } from '../../workflows/wallet/useSharedWalletHomePage'
import { SendOutlined, QrcodeOutlined, DownOutlined, RightOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'SharedWalletHomePage',
})

const {
  sharedWallet,
  copy,
  refresh,
  addOep4,
  handleBack,
  balance,
  oep4s,
  redeemOng,
  hasLocalCopayer,
  showTransferBox,
  showReceive,
  showTxMgmt,
  toCopayerDetail,
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
} = useSharedWalletHomePage()
</script>

<style scoped>
.wallet-info {
  position: relative;
  padding-top: var(--ow-space-3);
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.wallet-info p {
  margin-bottom: var(--ow-space-1);
}

.wallet-info__copy {
  margin-bottom: var(--ow-space-1);
}

.wallet-info__address {
  color: var(--ow-color-text-secondary);
}

.shared-wallet-home__redeem-note {
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-primary);
}

.pending-tx {
  margin-bottom: var(--ow-space-12);
}

.pending-tx-container {
  height: 150px;
  overflow-y: auto;
}
.pending-tx-container::-webkit-scrollbar {
  width: 4px;
  height: 4px;
}
.pending-tx-container::-webkit-scrollbar-thumb {
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-border-default);
}

.pending-tx-container::-webkit-scrollbar-track {
  border-radius: var(--ow-radius-control);
  background: var(--ow-color-surface-hover);
}

.btn-dropdown {
  width: 120px;
  height: var(--ow-button-height);
  background: var(--ow-color-surface-muted);
  font-size: var(--ow-font-size-body);
  font-family: var(--ow-font-medium);
  color: var(--ow-color-brand);
  border-radius: var(--ow-radius-control);
  border: none;
}

.left-btn-container {
  display: flex;
  justify-content: space-between;
}

.left-btn-more {
  display: flex;
}

.vertical-line {
  width: 2px;
  height: var(--ow-button-height);
  background: var(--ow-color-surface-muted);
  margin-right: var(--ow-space-7);
}
</style>
