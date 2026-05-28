<template>
  <div class="identity-confirm">
    <section class="identity-confirm__section">
      <div class="identity-confirm__section-copy">
        <span class="identity-confirm__section-title">{{ $t('createIdentity.confirmInfo') }}</span>
        <span class="identity-confirm__section-caption">
          {{ $t('createIdentity.label') }} / {{ $t('createIdentity.ontid') }}
        </span>
      </div>

      <div class="identity-confirm__summary-card">
        <div class="identity-confirm__summary-row">
          <span class="identity-confirm__label">{{ $t('createIdentity.label') }}</span>
          <span class="identity-confirm__value">{{ label }}</span>
        </div>
        <div class="identity-confirm__summary-row">
          <span class="identity-confirm__label">{{ $t('createIdentity.ontid') }}</span>
          <span class="identity-confirm__value identity-confirm__value--break">{{ ontid }}</span>
        </div>
      </div>
    </section>

    <page-footer-actions align="between" class="identity-confirm__actions">
      <a-button type="default" html-type="button" variant="secondary" @click="emit('back')">{{
        $t('createJsonWallet.back')
      }}</a-button>
      <a-button type="primary" html-type="button" variant="primary" @click="emit('next')">{{
        $t('createJsonWallet.next')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'ConfirmInfo',
})

defineProps({
  label: {
    type: String,
    default: '',
  },
  ontid: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['back', 'next'])
</script>

<style scoped>
.identity-confirm {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.identity-confirm__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.identity-confirm__section-copy {
  display: grid;
  gap: 2px;
}

.identity-confirm__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.identity-confirm__section-caption,
.identity-confirm__label {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.identity-confirm__summary-card {
  display: grid;
  gap: var(--ow-space-2);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.identity-confirm__summary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.identity-confirm__summary-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.identity-confirm__value {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
  text-align: right;
}

.identity-confirm__value--break {
  overflow-wrap: anywhere;
}

.identity-confirm__actions {
  height: 68px;
}

.identity-confirm__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .identity-confirm {
    gap: var(--ow-space-2);
  }

  .identity-confirm__section {
    padding: 12px;
  }

  .identity-confirm__summary-row {
    grid-template-columns: 1fr;
  }

  .identity-confirm__value {
    text-align: left;
  }

  .identity-confirm__actions {
    height: 64px;
  }

  .identity-confirm__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
