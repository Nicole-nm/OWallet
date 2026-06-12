<template>
  <section class="stake-detail-panel ow-panel">
    <div class="ow-panel-body ow-kv-panel">
      <div class="ow-kv-row stake-detail-row">
        <span class="ow-kv-label">{{ $t('nodeStake.stakeWalletAddress') }}</span>
        <span class="ow-kv-value">{{ stakeWalletAddress }}</span>
      </div>
      <div class="ow-kv-row stake-detail-row">
        <span class="ow-kv-label">{{ $t('nodeStake.nodePk') }}</span>
        <span class="ow-kv-value">{{ nodePublicKey }}</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
defineProps<{
  stakeWalletAddress: unknown
  nodePublicKey: unknown
}>()
</script>

<style scoped lang="scss">
.stake-detail-panel {
  margin-bottom: var(--ow-space-2);
}
</style>
