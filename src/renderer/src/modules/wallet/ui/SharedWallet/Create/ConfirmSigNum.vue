<template>
  <div class="shared-confirm">
    <section class="shared-confirm__section">
      <div class="shared-confirm__section-copy">
        <span class="shared-confirm__section-title">{{ $t('createSharedWallet.basicInfo') }}</span>
        <span class="shared-confirm__section-caption">{{ $t('createSharedWallet.label') }}</span>
      </div>

      <div class="shared-confirm__value-card">{{ label }}</div>
    </section>

    <section class="shared-confirm__section">
      <div class="shared-confirm__section-copy">
        <span class="shared-confirm__section-title"
          >{{ $t('createSharedWallet.copayers') }} ({{ copayers.length }})</span
        >
      </div>

      <div class="shared-confirm__copayer-list">
        <div
          class="shared-confirm__copayer-row"
          v-for="(copayer, index) in copayers"
          :key="copayer.index"
        >
          <span class="ow-step-circle">{{ index + 1 }}</span>
          <div class="shared-confirm__copayer-copy">
            <span class="shared-confirm__copayer-name">{{ copayer.name }}</span>
            <span class="shared-confirm__copayer-address">{{ copayer.address }}</span>
            <span class="shared-confirm__copayer-key">{{ copayer.publickey }}</span>
          </div>
        </div>
      </div>
    </section>

    <section class="shared-confirm__section">
      <div class="shared-confirm__section-copy">
        <span class="shared-confirm__section-title">{{
          $t('createSharedWallet.requiredSigNum')
        }}</span>
      </div>

      <a-select v-model:value="requiredSigNum" :options="options" class="shared-confirm__select">
      </a-select>
    </section>

    <page-footer-actions align="between" class="shared-confirm__actions">
      <a-button type="default" variant="secondary" @click="emit('back')">
        {{ $t('createSharedWallet.back') }}
      </a-button>
      <a-button type="primary" variant="primary" @click="emit('next')" :disabled="processing">
        {{ $t('createSharedWallet.next') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'ConfirmSigNum',
})

interface CopayerSummary {
  index?: string | number
  name?: string
  address?: string
  publickey?: string
}

const props = defineProps({
  processing: {
    type: Boolean,
    default: false,
  },
  label: {
    type: String,
    default: '',
  },
  copayers: {
    type: Array as PropType<CopayerSummary[]>,
    default: () => [],
  },
  options: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
  requiredSigNum: {
    type: Number,
    default: 2,
  },
})

const emit = defineEmits(['update:requiredSigNum', 'back', 'next'])

const requiredSigNum = computed({
  get: () => props.requiredSigNum,
  set: (value) => emit('update:requiredSigNum', value),
})
</script>

<style scoped>
.shared-confirm {
  width: min(100%, 880px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-4);
}

.shared-confirm__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-confirm__section-copy {
  display: grid;
  gap: 2px;
}

.shared-confirm__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-confirm__section-caption,
.shared-confirm__copayer-address,
.shared-confirm__copayer-key {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-confirm__value-card,
.shared-confirm__select {
  width: 100%;
}

.shared-confirm__value-card {
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
  overflow-wrap: anywhere;
}

.shared-confirm__copayer-list {
  display: grid;
  gap: var(--ow-space-2);
}

.shared-confirm__copayer-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: var(--ow-space-3);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-confirm__copayer-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.shared-confirm__copayer-name {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-confirm__copayer-address,
.shared-confirm__copayer-key {
  overflow-wrap: anywhere;
}

.shared-confirm__actions {
  height: 72px;
}

.shared-confirm__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .shared-confirm {
    gap: var(--ow-space-3);
  }

  .shared-confirm__section {
    padding: 12px;
  }

  .shared-confirm__actions {
    height: 68px;
  }

  .shared-confirm__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
