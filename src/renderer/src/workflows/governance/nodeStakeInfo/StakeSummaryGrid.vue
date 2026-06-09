<template>
  <section class="stake-summary-grid ow-stat-grid">
    <article class="stake-summary-card ow-stat-card">
      <span class="ow-stat-label">{{ $t('nodeStake.commitmentQuantity') }}</span>
      <p class="ow-stat-value">{{ commitmentQuantityDisplay }}</p>
    </article>
    <article class="stake-summary-card ow-stat-card">
      <span class="ow-stat-label">{{ $t('nodeStake.stakeQuantity') }}</span>
      <p class="ow-stat-value">{{ stakeQuantityDisplay }}</p>
    </article>
    <article class="stake-summary-card ow-stat-card">
      <span class="ow-stat-label">{{ $t('nodeStake.claimableQuantity') }}</span>
      <p class="ow-stat-value">{{ claimableQuantityDisplay }}</p>
    </article>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  commitmentQuantityDisplay: string
  stakeQuantityDisplay: string
  claimableQuantityDisplay: string
}>()
</script>

<style scoped>
.stake-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: var(--ow-space-2);
}

.stake-summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 92px;
}

@media (max-width: 720px) {
  .stake-summary-grid {
    grid-template-columns: 1fr;
  }
}
</style>
