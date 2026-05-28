<template>
  <div class="ow-ledger-status" role="status" aria-live="polite">
    <div
      v-if="showTitle"
      class="ow-ledger-status__title"
      :class="compact ? 'ow-ledger-status__title--compact' : ''"
    >
      {{ $t('ledgerWallet.connectApp') }}
    </div>
    <div class="ow-ledger-status__row">
      <span class="ow-ledger-status__label">{{ $t('ledgerWallet.status') }}: </span>
      <span class="ow-ledger-status__value">{{ status }}</span>
    </div>
    <div v-if="$slots.default" class="ow-ledger-status__extra">
      <slot />
    </div>
  </div>
</template>

<script setup lang="ts">
defineOptions({
  name: 'LedgerStatusNotice',
})

defineProps({
  status: {
    type: String,
    default: '',
  },
  showTitle: {
    type: Boolean,
    default: true,
  },
  compact: {
    type: Boolean,
    default: false,
  },
})
</script>

<style scoped>
.ow-ledger-status__title {
  margin-bottom: 15px;
  font-family: var(--ow-font-bold);
}

.ow-ledger-status__title--compact {
  margin-bottom: 10px;
}

.ow-ledger-status__label {
  font-family: var(--ow-font-bold);
  color: var(--ow-color-text-primary);
}

.ow-ledger-status__value {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
}

.ow-ledger-status__extra {
  margin-top: 8px;
}
</style>
