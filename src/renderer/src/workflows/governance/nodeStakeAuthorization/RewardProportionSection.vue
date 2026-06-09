<template>
  <section class="reward-proportion-section ow-panel">
    <div class="ow-panel-header reward-proportion-header">
      <div class="ow-panel-heading">
        {{ $t('nodeMgmt.rewardProportion') }}
      </div>
      <a-button type="primary" variant="primary" @click="emit('edit')">{{
        $t('nodeMgmt.edit')
      }}</a-button>
    </div>
    <div class="ow-panel-body reward-proportion-body">
      <div class="reward-proportion-grid">
        <div class="node-reward-proportion ow-panel ow-panel--muted ow-panel--compact">
          <p class="reward-proportion-title">
            {{ $t('nodeMgmt.nodeRewardProportion') }}
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.tPeerCost }}% ({{ $t('nodeMgmt.activeT') }})
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.t1PeerCost }}% ({{ $t('nodeMgmt.activeT1') }})
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.t2PeerCost }}% ({{ $t('nodeMgmt.activeT2') }})
          </p>
        </div>
        <div class="node-reward-proportion ow-panel ow-panel--muted ow-panel--compact">
          <p class="reward-proportion-title">
            {{ $t('nodeMgmt.userRewardProportion') }}
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.tStakeCost }}% ({{ $t('nodeMgmt.activeT') }})
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.t1StakeCost }}% ({{ $t('nodeMgmt.activeT1') }})
          </p>
          <p class="reward-proportion-line">
            {{ peerAttributes.t2StakeCost }}% ({{ $t('nodeMgmt.activeT2') }})
          </p>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import type { PeerAttributes } from '../../../shared/types'

defineProps<{
  peerAttributes: PeerAttributes
}>()

const emit = defineEmits<{
  edit: []
}>()
</script>

<style scoped>
.reward-proportion-section {
  overflow: hidden;
}

.reward-proportion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-2);
  padding: var(--ow-space-3) var(--ow-space-4);
}

.reward-proportion-body {
  display: grid;
  gap: var(--ow-space-1);
  padding: var(--ow-space-3) var(--ow-space-4);
}

.reward-proportion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-1);
}

.node-reward-proportion {
  padding: 10px 12px;
}

.node-reward-proportion p {
  margin: 0;
}

.reward-proportion-title {
  margin-bottom: 1px !important;
  font-family: var(--ow-font-bold);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.reward-proportion-line {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.reward-proportion-line + .reward-proportion-line {
  margin-top: 1px;
}

@media (max-width: 720px) {
  .reward-proportion-header {
    flex-direction: column;
    align-items: stretch;
  }

  .reward-proportion-grid {
    grid-template-columns: 1fr;
  }
}
</style>
