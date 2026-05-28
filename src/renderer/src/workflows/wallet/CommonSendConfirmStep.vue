<template>
  <div class="send-confirm">
    <section class="send-confirm__section">
      <div class="send-confirm__section-header">
        <div class="send-confirm__section-copy">
          <span class="send-confirm__section-title">{{ $t('sharedWalletHome.send') }}</span>
          <span class="send-confirm__section-caption">{{
            $t('sharedWalletHome.confirmation')
          }}</span>
        </div>
      </div>

      <div class="send-confirm__summary-card">
        <send-asset-summary
          :amount="transfer.amount"
          :asset="transfer.asset"
          :recipient="transfer.to"
          :fee="transfer.gas"
        />
      </div>
    </section>

    <section class="send-confirm__section">
      <div class="send-confirm__section-header">
        <div class="send-confirm__section-copy">
          <span class="send-confirm__section-title">{{ $t('sharedWalletHome.confirmation') }}</span>
        </div>
      </div>

      <div class="send-confirm__approval-card">
        <a-checkbox @change="onChange" :checked="checked" class="send-confirm__check">{{
          $t('sharedWalletHome.agreeToSend')
        }}</a-checkbox>

        <a-input
          v-if="isCommonWallet"
          v-model:value="password"
          type="password"
          class="input send-confirm__password"
          :placeholder="$t('sharedWalletHome.inputPassToTransfer')"
        ></a-input>

        <div v-else class="send-confirm__ledger">
          <ledger-status-notice :status="ledgerStatus" :show-title="false" />
        </div>
      </div>
    </section>

    <page-footer-actions align="between" class="send-confirm__actions">
      <a-button type="default" variant="secondary" @click="back">{{
        $t('sharedWalletHome.back')
      }}</a-button>
      <a-button type="primary" variant="primary" @click="submit" :disabled="sending">{{
        $t('sharedWalletHome.submit')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { useCommonSendConfirmStep } from './useCommonSendConfirmStep'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import SendAssetSummary from '../../shared/ui/cards/SendAssetSummary.vue'

defineOptions({
  name: 'SendConfirm',
})

const emit = defineEmits(['backEvent', 'sendConfirmSubmit'])
const {
  checked,
  password,
  sending,
  transfer,
  isCommonWallet,
  ledgerStatus,
  onChange,
  submit: submitTransfer,
} = useCommonSendConfirmStep()

function back() {
  emit('backEvent')
}

async function submit() {
  const result = await submitTransfer()
  if (!result.ok) {
    return
  }
  emit('sendConfirmSubmit')
}
</script>

<style scoped>
.send-confirm {
  display: grid;
  gap: var(--ow-space-3);
}

.send-confirm__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.send-confirm__section-copy {
  display: grid;
  gap: 2px;
}

.send-confirm__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.send-confirm__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.send-confirm__summary-card,
.send-confirm__approval-card {
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.send-confirm__summary-card :deep(.ow-summary-table) {
  display: grid;
  gap: var(--ow-space-2);
}

.send-confirm__summary-card :deep(.ow-summary-row) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-2);
  padding-bottom: 6px;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.send-confirm__summary-card :deep(.ow-summary-label) {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.send-confirm__summary-card :deep(.ow-summary-value) {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.send-confirm__summary-card :deep(.ow-summary-row:last-child) {
  padding-bottom: 0;
  border-bottom: 0;
}

.send-confirm__approval-card {
  display: grid;
  gap: var(--ow-space-2);
}

.send-confirm__check {
  margin: 0;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.send-confirm__password {
  width: 100%;
}

.send-confirm__ledger {
  min-width: 0;
}

.send-confirm__actions {
  height: 72px;
  margin-top: 0;
}

.send-confirm__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .send-confirm__section {
    padding: 10px 12px;
  }

  .send-confirm__summary-card :deep(.ow-summary-row) {
    grid-template-columns: 1fr;
  }

  .send-confirm__actions {
    height: 68px;
  }

  .send-confirm__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
