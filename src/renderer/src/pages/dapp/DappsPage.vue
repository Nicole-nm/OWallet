<template>
  <div class="negative-margin-top">
    <a-modal
      v-model:open="redirectNoticeVisible"
      :title="$t('dapps.notification')"
      @ok="handleRedirectConfirm"
      @cancel="handleRedirectCancel"
    >
      <p class="dapp-redirect-copy">{{ $t('dapps.userPolicy') }}</p>
    </a-modal>

    <a-tabs class="ow-section-tabs">
      <a-tab-pane key="dapps" :tab="$t('dapps.dapps')">
        <div class="dapp-grid ow-card-grid ow-card-grid--padded">
          <button
            type="button"
            @click="handleExchangeChangelly"
            class="dapp-item ow-action-card ow-action-card--tile"
          >
            <div class="dapp-title">
              <img src="../../assets/changelly.png" alt="" />
              <span>{{ $t('exchange.changelly') }}</span>
            </div>
            <p class="dapp-content">Cryptocurrency Exchange Platform</p>
          </button>

          <button
            type="button"
            @click="handleExchangeCryptonex"
            class="dapp-item ow-action-card ow-action-card--tile"
            :title="$t('exchange.cryptonex')"
          >
            <div class="dapp-title">
              <img src="../../assets/cryptonex.png" alt="" />
              <span>{{ $t('exchange.cryptonex') }}</span>
            </div>
            <p class="dapp-content">
              Buy Bitcoin, Ethereum, Cryptonex Quick online purchase using a bank card
            </p>
          </button>

          <button
            type="button"
            class="dapp-item ow-action-card ow-action-card--tile"
            @click="handleOntidMgmt"
          >
            <div class="dapp-title">
              <img src="../../assets/ontid.svg" alt="" />
              <span>ONT ID</span>
            </div>
            <p class="dapp-content">{{ $t('dapps.ontidMgmt') }}</p>
          </button>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { useDappsPage } from '../../workflows/dapp/useDappsPage'

defineOptions({
  name: 'DappsPage',
})

const {
  redirectNoticeVisible,
  handleRedirectConfirm,
  handleRedirectCancel,
  handleExchangeChangelly,
  handleExchangeCryptonex,
  handleOntidMgmt,
} = useDappsPage()
</script>

<style scoped>
/* Dapp tile: header (icon + name) divided from body (description).
   Overrides .ow-action-card padding so the divider spans edge-to-edge. */
.dapp-redirect-copy {
  margin: 0;
}

.dapp-item {
  padding: 0;
  font-family: var(--ow-font-medium);
  text-align: left;
}

.dapp-title {
  display: flex;
  align-items: flex-start;
  min-height: var(--ow-space-16);
  padding: var(--ow-space-4);
  border-bottom: 1px solid var(--ow-color-border-default);
  font-size: var(--ow-font-size-subtitle);
  color: var(--ow-color-text-secondary);
  line-height: var(--ow-line-height-title);
}

.dapp-title > img {
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  margin-right: var(--ow-space-3);
}

.dapp-title > span {
  min-width: 0;
  overflow-wrap: anywhere;
}

.dapp-content {
  flex: 1;
  margin: 0;
  padding: var(--ow-space-4);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-muted);
}
</style>
