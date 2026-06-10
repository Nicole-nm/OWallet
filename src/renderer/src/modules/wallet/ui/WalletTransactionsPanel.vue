<template>
  <section class="ow-panel wallet-dashboard__panel">
    <h2 class="wallet-dashboard__panel-title">{{ $t('sharedWalletHome.completedTx') }}</h2>
    <div class="wallet-dashboard__tx-list">
      <wallet-transaction-empty-state
        v-if="completedTx.length === 0"
        class="wallet-dashboard__empty wallet-dashboard__empty--completed"
        :description="$t('sharedWalletHome.noCompletedTransactions')"
      />
      <div
        v-for="(tx, index) in completedTx"
        :key="tx.txHash + index"
        class="wallet-dashboard__tx-row"
        @click="$emit('show-detail', tx.txHash)"
      >
        <span class="wallet-dashboard__tx-hash">{{ tx.txHash.substring(0, 40) + '...' }}</span>
        <span class="wallet-dashboard__tx-amount">{{ tx.amount }} {{ tx.asset }}</span>
      </div>
      <div
        v-if="completedTx.length > moreThreshold"
        class="wallet-dashboard__more-link"
        @click="$emit('more')"
      >
        {{ $t('sharedWalletHome.checkMore') }}
        <RightOutlined />
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { RightOutlined } from '@ant-design/icons-vue'
import WalletTransactionEmptyState from './WalletTransactionEmptyState.vue'

withDefaults(
  defineProps<{
    completedTx: Array<{
      amount: string | number
      asset: string
      txHash: string
    }>
    moreThreshold?: number
  }>(),
  {
    moreThreshold: 6,
  }
)

defineEmits<{
  more: []
  'show-detail': [txHash: string]
}>()
</script>

<style scoped lang="scss">
.wallet-dashboard__panel {
  min-width: 0;
  padding: var(--ow-space-3);
}

.wallet-dashboard__panel-title {
  margin: 0 0 var(--ow-space-2);
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
}

.wallet-dashboard__tx-list {
  display: grid;
}

.wallet-dashboard__empty {
  margin: var(--ow-space-3) 0 0;
}

.wallet-dashboard__tx-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-3);
  padding: 10px 0;
  border-bottom: 1px solid var(--ow-color-border-subtle);
  cursor: pointer;
}

.wallet-dashboard__tx-hash {
  @include truncate;
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__tx-amount {
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-caption);
  white-space: nowrap;
  color: var(--ow-color-text-primary);
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
</style>
