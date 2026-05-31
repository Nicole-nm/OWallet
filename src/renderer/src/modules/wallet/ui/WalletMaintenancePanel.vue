<template>
  <section class="ow-panel wallet-dashboard__panel wallet-dashboard__panel--maintenance">
    <div class="wallet-dashboard__maintenance">
      <div class="wallet-dashboard__maintenance-row">
        <span class="wallet-dashboard__maintenance-label">{{
          $t('commonWalletHome.claimableOng')
        }}</span>
        <span class="wallet-dashboard__maintenance-value">{{ balanceDisplay.unboundOng }}</span>
      </div>
      <div class="wallet-dashboard__maintenance-row">
        <span class="wallet-dashboard__maintenance-label">{{
          $t('commonWalletHome.unboundOng')
        }}</span>
        <span class="wallet-dashboard__maintenance-value">{{ balanceDisplay.waitBoundOng }}</span>
      </div>
      <div class="wallet-dashboard__maintenance-actions">
        <redeem-info-icon></redeem-info-icon>
        <a-button type="default" class="wallet-dashboard__redeem" @click="$emit('redeem')">
          {{ $t('commonWalletHome.redeem') }}
        </a-button>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import RedeemInfoIcon from '../../../shared/ui/feedback/RedeemInfoIcon.vue'

defineProps<{
  balanceDisplay: {
    unboundOng: string
    waitBoundOng: string
  }
}>()

defineEmits<{
  redeem: []
}>()
</script>

<style scoped>
.wallet-dashboard__panel {
  min-width: 0;
  padding: var(--ow-space-3);
}

.wallet-dashboard__maintenance {
  display: grid;
  gap: var(--ow-space-1);
}

.wallet-dashboard__maintenance-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-4);
}

.wallet-dashboard__maintenance-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__maintenance-value {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__maintenance-actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ow-space-2);
}

.wallet-dashboard__redeem {
  min-width: 120px;
  border-radius: var(--ow-radius-control);
}
</style>
