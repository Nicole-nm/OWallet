<template>
  <div class="ledger-connect">
    <section class="ledger-connect__section">
      <span class="ledger-connect__section-title">{{ $t('ledgerWallet.info') }}</span>

      <div class="ledger-connect__notice">
        <ledger-status-notice :status="ledgerStatus" />
      </div>
    </section>

    <page-footer-actions align="between" class="ledger-connect__actions">
      <a-button type="default" @click="cancel" variant="secondary">
        {{ $t('importJsonWallet.cancel') }}
      </a-button>
      <div class="ledger-connect__actions-group">
        <a-button type="default" @click="support" variant="secondary">
          {{ $t('wallets.ledgerSupport') }}
        </a-button>
        <a-button
          type="primary"
          @click="connect"
          variant="primary"
          :disabled="!ledgerStatus || !publicKey"
        >
          {{ $t('importLedgerWallet.next') }}
        </a-button>
      </div>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../../../../shared/ui/ledger/LedgerStatusNotice.vue'

defineOptions({
  name: 'ConnectLedger',
})

defineProps({
  ledgerStatus: {
    type: String,
    default: '',
  },
  publicKey: {
    type: String,
    default: '',
  },
})

const emit = defineEmits(['next', 'cancel', 'support'])

function connect() {
  emit('next')
}

function cancel() {
  emit('cancel')
}

function support() {
  emit('support')
}
</script>

<style scoped>
.ledger-connect {
  width: min(100%, 760px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.ledger-connect__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.ledger-connect__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.ledger-connect__notice {
  padding: 10px 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.ledger-connect__actions {
  height: 68px;
}

.ledger-connect__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

.ledger-connect__actions-group {
  display: flex;
  align-items: center;
  gap: var(--ow-space-2);
}

@media (max-width: 560px) {
  .ledger-connect {
    gap: var(--ow-space-2);
  }

  .ledger-connect__section {
    padding: 12px;
  }

  .ledger-connect__actions {
    height: 64px;
  }

  .ledger-connect__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }

  .ledger-connect__actions-group {
    width: 100%;
    justify-content: flex-end;
  }
}
</style>
