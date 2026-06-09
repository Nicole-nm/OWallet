<template>
  <div class="info-container ow-panel ow-panel--flat">
    <div class="ow-panel-header">
      <p class="ow-panel-heading">{{ $t('vote.info') }}</p>
    </div>
    <div class="ow-panel-body vote-detail-info ow-kv-panel">
      <div class="info-item ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.startTime') }}</span>
        <span class="ow-kv-value">{{ startTime }}</span>
      </div>
      <div class="info-item ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.endTime') }}</span>
        <span class="ow-kv-value">{{ endTime }}</span>
      </div>
      <div class="info-item ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.hash') }}</span>
        <span class="hash-link ow-kv-value ow-text-link" @click="emit('openInExplorer')">{{
          hashDisplay
        }}</span>
      </div>
      <div class="info-item info-item--creator ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.creatorAddress') }}</span>
        <span class="ow-kv-value">{{ admin }}</span>
      </div>
      <div class="info-item ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.votingStatus') }}</span>
        <span class="ow-kv-value">{{ statusDisplay }}</span>
      </div>
      <div class="info-item ow-kv-row">
        <span class="ow-kv-label">{{ $t('vote.myVotes') }}</span>
        <span class="ow-kv-value">{{ myWeightDisplay }}</span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  startTime: string
  endTime: string
  hashDisplay: string
  admin: unknown
  statusDisplay: unknown
  myWeightDisplay: string | number
}>()

const emit = defineEmits<{
  openInExplorer: []
}>()
</script>

<style lang="scss" scoped>
.info-container {
  margin-bottom: var(--ow-space-5);
}

.vote-detail-info {
  padding-top: 0;

  .info-item {
    grid-template-columns: minmax(88px, 0.24fr) minmax(0, 1fr);
    gap: var(--ow-space-2);
    align-items: start;
    word-break: normal;
  }

  .ow-kv-label {
    white-space: nowrap;
  }

  .ow-kv-value {
    overflow-wrap: anywhere;
  }

  .info-item--creator .ow-kv-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.hash-link {
  word-break: break-all;
}
</style>
