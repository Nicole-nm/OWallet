<template>
  <div class="ow-page-shell ow-page-shell--padded">
    <breadcrumb
      :current="$t('sharedWalletHome.send')"
      :routes="routes"
      @backEvent="handleBack"
    ></breadcrumb>

    <div class="ow-page-columns">
      <div class="ow-page-column">
        <div class="oep4-container">
          <div class="home-title">
            <p>OEP-4 Tokens</p>
            <ReloadOutlined class="refresh-icon" @click="refresh" />
          </div>

          <div
            class="oep4-item"
            v-for="(token, index) of oep4s.filter((t: { net?: string }) => t.net === net)"
            :key="index"
          >
            <div class="oep4-item__title">{{ token.symbol }} - {{ token.name }}</div>
            <div class="oep4-balance">
              <span class="ow-asset-label">{{ $t('commonWalletHome.balance') }}: </span>
              <span class="ow-asset-amount">{{ token.balance }}</span>
            </div>
            <div class="">
              <span class="ow-asset-label">{{ $t('commonWalletHome.scriptHash') }}: </span>
              <span class="asset-scriptHash">{{ token.scriptHash }}</span>
            </div>
          </div>

          <a-button @click="handleAdd">{{ $t('commonWalletHome.add') }}</a-button>
        </div>
        <div class="oep4-btns">
          <a-button class="ow-asset-action" type="primary" @click="sendAsset">
            <i class="arrow-up"></i>
            {{ $t('sharedWalletHome.send') }}
          </a-button>
          <a-button class="ow-asset-action" type="primary" @click="commnReceive">
            <i class="arrow-down"></i>
            {{ $t('sharedWalletHome.receive') }}
          </a-button>
        </div>
      </div>
      <div class="ow-page-column">
        <div class="completed-tx">
          <div class="ow-tx-header tx-header-with-icon">
            <span>{{ $t('sharedWalletHome.completedTx') }}</span>
            <span class="transfer-icon"></span>
          </div>
          <div
            v-for="(tx, index) in completedTx.slice(0, 10)"
            :key="tx.txHash + index"
            class="ow-tx-row"
            @click="showTxDetail(tx.txHash)"
          >
            <span>{{ tx.txHash }}</span>
            <span>{{ tx.amount }} {{ tx.asset }}</span>
          </div>
          <div class="ow-more-link" v-if="completedTx.length > 6" @click="checkMoreTx">
            {{ $t('sharedWalletHome.checkMore') }}>>
          </div>
        </div>
      </div>
    </div>

    <a-modal
      :title="$t('commonWalletHome.addOep4')"
      v-model:open="showModal"
      @ok="handleAddOep4"
      @cancel="handleCancel"
    >
      <div>
        <div>
          <p>{{ $t('commonWalletHome.enterScripthash') }}</p>
          <a-input class="input" v-model:value="scriptHash"></a-input>
        </div>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { ReloadOutlined } from '@ant-design/icons-vue'
import { useOep4HomePage } from '../../workflows/wallet/useOep4HomePage'

defineOptions({
  name: 'Oep4HomePage',
})

const {
  routes,
  oep4s,
  net,
  refresh,
  handleAdd,
  handleBack,
  sendAsset,
  commnReceive,
  completedTx,
  showTxDetail,
  checkMoreTx,
  showModal,
  handleAddOep4,
  handleCancel,
  scriptHash,
} = useOep4HomePage()
</script>

<style scoped>
.oep4-container {
  max-height: 360px;
  overflow-y: auto;
}

.home-title {
  display: flex;
  align-items: center;
  margin-bottom: var(--ow-space-5);
}

.home-title p {
  font-size: var(--ow-font-size-title);
  font-weight: 500;
  margin: 0;
  margin-right: var(--ow-space-4);
}

.oep4-item {
  margin-bottom: var(--ow-space-4);
}

.oep4-item div {
  display: flex;
  align-items: center;
}

.oep4-item__title {
  font-family: var(--ow-font-bold);
  color: var(--ow-color-text-primary);
}

.asset-scriptHash {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.oep4-btns {
  margin-top: var(--ow-space-8);
}

.tx-header-with-icon :last-child {
  width: 64px;
  height: 64px;
  display: block;
  float: right;
  background: url('../../assets/transaction.png');
  background-size: contain;
  top: -20px;
  right: 0;
  position: absolute;
}
</style>
