<template>
  <div class="redeem-profit">
    <div class="redeem-item ow-panel ow-panel--compact">
      <span class="ow-info-label">{{ $t('nodeMgmt.unboundOng') }}: </span>
      <span class="ow-info-value">{{ peerUnboundOngDisplay }} ONG</span>
      <a-button type="primary" variant="accent" @click="emit('redeemUnboundOng')">{{
        $t('nodeMgmt.redeem')
      }}</a-button>
    </div>
    <div class="redeem-item ow-panel ow-panel--compact">
      <span class="ow-info-label">{{ $t('nodeMgmt.profit') }}: </span>
      <span class="ow-info-value">{{ splitFeeAmountDisplay }} ONG</span>
      <a-button type="primary" variant="accent" @click="emit('redeemRewards')">{{
        $t('nodeMgmt.redeem')
      }}</a-button>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{
  peerUnboundOngDisplay: string
  splitFeeAmountDisplay: string
}>()

const emit = defineEmits<{
  redeemUnboundOng: []
  redeemRewards: []
}>()
</script>

<style scoped lang="scss">
.redeem-profit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--ow-space-2);
}
.redeem-profit p {
  margin-bottom: 0;
}
.redeem-item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ow-space-2);
  width: 100%;
}
.redeem-item span:first-child {
  white-space: nowrap;
}

.redeem-item .ow-info-label {
  font-size: var(--ow-font-size-body);
}

.redeem-item .ow-info-value {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
  font-variant-numeric: tabular-nums;
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.redeem-item button {
  margin-left: 0;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .redeem-profit {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 640px) {
  .redeem-item {
    grid-template-columns: 1fr;
    justify-items: flex-start;
  }
}
</style>
