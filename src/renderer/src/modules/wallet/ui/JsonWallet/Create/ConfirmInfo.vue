<template>
  <div class="json-confirm">
    <section class="json-confirm__section">
      <div class="json-confirm__section-copy">
        <span class="json-confirm__section-title">{{ $t('createJsonWallet.confirmInfo') }}</span>
        <span class="json-confirm__section-caption">
          {{ $t('createJsonWallet.addressN') }} / {{ $t('createJsonWallet.priavteKeywif') }}
        </span>
      </div>

      <div class="json-confirm__summary-card">
        <div class="json-confirm__summary-row">
          <span class="json-confirm__label">{{ $t('createJsonWallet.labelN') }}</span>
          <span class="json-confirm__value">{{ label }}</span>
        </div>
        <div class="json-confirm__summary-row">
          <span class="json-confirm__label">{{ $t('createJsonWallet.addressN') }}</span>
          <span class="json-confirm__value json-confirm__value--break">{{ address }}</span>
        </div>
        <div class="json-confirm__summary-row">
          <span class="json-confirm__label">{{ $t('createJsonWallet.pubKeyN') }}</span>
          <span class="json-confirm__value json-confirm__value--break">{{ publicKey }}</span>
        </div>
        <div class="json-confirm__summary-row">
          <span class="json-confirm__label">{{ $t('createJsonWallet.signatureSchemeN') }}</span>
          <span class="json-confirm__value">SHA256withECDSA</span>
        </div>
        <div class="json-confirm__summary-row">
          <span class="json-confirm__label">{{ $t('createJsonWallet.priavteKeywif') }}</span>
          <span class="json-confirm__value json-confirm__value--break">{{ wif }}</span>
        </div>
      </div>
    </section>

    <section class="json-confirm__section">
      <div class="json-confirm__backup-card">
        <a-alert type="warning" show-icon :message="$t('createJsonWallet.backupWallet')" />
        <a-button type="primary" variant="primary" @click="emit('downloadWallet')">{{
          $t('createJsonWallet.download')
        }}</a-button>
      </div>
    </section>

    <page-footer-actions align="between" class="json-confirm__actions">
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
  address: {
    type: String,
    default: '',
  },
  publicKey: {
    type: String,
    default: '',
  },
  wif: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['back', 'downloadWallet', 'next'])
</script>

<style scoped>
.json-confirm {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.json-confirm__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.json-confirm__section-copy {
  display: grid;
  gap: 2px;
}

.json-confirm__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.json-confirm__section-caption,
.json-confirm__label {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.json-confirm__summary-card,
.json-confirm__backup-card {
  display: grid;
  gap: var(--ow-space-2);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.json-confirm__summary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.json-confirm__summary-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.json-confirm__value {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
  text-align: right;
}

.json-confirm__value--break {
  overflow-wrap: anywhere;
}

.json-confirm__backup-card {
  justify-items: start;
}

.json-confirm__actions {
  height: 68px;
}

.json-confirm__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .json-confirm {
    gap: var(--ow-space-2);
  }

  .json-confirm__section {
    padding: 12px;
  }

  .json-confirm__summary-row {
    grid-template-columns: 1fr;
  }

  .json-confirm__value {
    text-align: left;
  }

  .json-confirm__actions {
    height: 64px;
  }

  .json-confirm__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
