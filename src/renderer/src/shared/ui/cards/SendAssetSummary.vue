<template>
  <div class="ow-summary-table">
    <div class="ow-summary-row">
      <span class="ow-summary-label">{{ $t('sharedWalletHome.amount') }}</span>
      <span class="ow-summary-value">{{ amount }} {{ asset }}</span>
    </div>
    <div v-if="recipient" class="ow-summary-row">
      <span class="ow-summary-label">{{ $t('sharedWalletHome.recipient') }}</span>
      <span class="ow-summary-value">{{ recipient }}</span>
    </div>
    <div class="ow-summary-row">
      <span class="ow-summary-label">{{ $t('sharedWalletHome.fee') }}</span>
      <span class="ow-summary-value">{{ fee }} ONG</span>
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({ name: 'SendAssetSummary' })

defineProps<{
  amount: string | number
  asset?: string
  recipient?: string
  fee: string | number
}>()
</script>

<style scoped>
.ow-summary-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}
</style>
