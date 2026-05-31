<template>
  <section class="ow-panel wallet-dashboard__panel">
    <div class="wallet-dashboard__panel-header">
      <h2 class="wallet-dashboard__panel-title">{{ $t('sharedWalletHome.balance') }}</h2>
      <div class="wallet-dashboard__panel-actions">
        <button type="button" class="wallet-dashboard__icon-button" @click="$emit('refresh')">
          <ReloadOutlined />
        </button>
        <button type="button" class="wallet-dashboard__icon-button" @click="$emit('add-oep4')">
          <PlusOutlined />
        </button>
      </div>
    </div>

    <div class="wallet-dashboard__asset-list">
      <div class="wallet-dashboard__asset-row">
        <span class="wallet-dashboard__asset-label">ONT</span>
        <span class="wallet-dashboard__asset-amount">{{ balanceDisplay.ont }}</span>
      </div>
      <div class="wallet-dashboard__asset-row">
        <span class="wallet-dashboard__asset-label">ONG</span>
        <span class="wallet-dashboard__asset-amount">{{ balanceDisplay.ong }}</span>
      </div>
      <div
        v-for="item of oep4sDisplay"
        :key="item.contract_hash || item.contractHash"
        class="wallet-dashboard__asset-row"
      >
        <span class="wallet-dashboard__asset-label">{{ item.symbol }}</span>
        <span class="wallet-dashboard__asset-amount">{{ item.balanceDisplay }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { PlusOutlined, ReloadOutlined } from '@ant-design/icons-vue'

defineProps<{
  balanceDisplay: {
    ong: string
    ont: string
  }
  oep4sDisplay: Array<{
    balanceDisplay: string
    contract_hash?: string
    contractHash?: string
    symbol: string
  }>
}>()

defineEmits<{
  'add-oep4': []
  refresh: []
}>()
</script>

<style scoped>
.wallet-dashboard__panel {
  min-width: 0;
  padding: var(--ow-space-3);
}

.wallet-dashboard__panel-header,
.wallet-dashboard__panel-actions {
  display: flex;
  justify-content: space-between;
  gap: var(--ow-space-2);
}

.wallet-dashboard__panel-title {
  margin: 0;
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
}

.wallet-dashboard__icon-button {
  width: 32px;
  height: 32px;
  padding: 0;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-pill);
  color: var(--ow-color-brand);
  cursor: pointer;
}

.wallet-dashboard__asset-list {
  display: grid;
}

.wallet-dashboard__asset-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-3);
  padding: 10px 0;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.wallet-dashboard__asset-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__asset-amount {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-body);
}
</style>
