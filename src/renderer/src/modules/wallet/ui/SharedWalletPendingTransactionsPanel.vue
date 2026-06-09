<template>
  <section class="ow-panel wallet-dashboard__panel">
    <h2 class="wallet-dashboard__panel-title">{{ $t('sharedWalletHome.pendingTx') }}</h2>
    <div class="wallet-dashboard__tx-list">
      <wallet-transaction-empty-state
        v-if="pendingTx.length === 0"
        class="wallet-dashboard__empty wallet-dashboard__empty--pending"
        :description="$t('sharedWalletHome.noPendingTransactions')"
      />
      <div
        v-for="tx in pendingTx"
        :key="tx.transactionIdHash"
        class="wallet-dashboard__tx-row"
        @click="$emit('show-detail', tx)"
      >
        <span class="wallet-dashboard__tx-hash">
          {{ tx.transactionIdHash.substring(0, 40) + '...' }}
        </span>
        <span class="wallet-dashboard__tx-amount">{{ signedAmount(tx) }} {{ tx.assetName }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { BigNumber } from 'bignumber.js'
import type { PendingSharedTransfer } from '../../../shared/types'
import WalletTransactionEmptyState from './WalletTransactionEmptyState.vue'

const props = defineProps<{
  pendingTx: PendingSharedTransfer[]
  sharedWalletAddress: string
}>()

defineEmits<{
  'show-detail': [tx: PendingSharedTransfer]
}>()

function signedAmount(tx: PendingSharedTransfer): string {
  const sign = tx.receiveaddress === props.sharedWalletAddress ? '+' : '-'
  return `${sign}${new BigNumber(tx.amount).toString()}`
}
</script>

<style scoped>
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
  overflow: hidden;
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.wallet-dashboard__tx-amount {
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-primary);
  white-space: nowrap;
}
</style>
