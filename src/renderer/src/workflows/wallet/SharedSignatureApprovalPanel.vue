<template>
  <div class="shared-signature-approval">
    <section class="shared-signature-approval__section">
      <div class="shared-signature-approval__section-copy">
        <span class="shared-signature-approval__section-title">{{
          $t('sharedWalletHome.confirmation')
        }}</span>
        <span class="shared-signature-approval__section-caption">{{
          $t('sharedWalletHome.signTransaction')
        }}</span>
      </div>

      <div class="shared-signature-approval__card">
        <a-checkbox
          class="shared-signature-approval__check"
          :checked="checked"
          @change="$emit('update:checked', !checked)"
        >
          {{ $t('sharedWalletHome.agreeToSend') }}
        </a-checkbox>

        <a-input
          v-if="signerType === 'CommonWallet'"
          class="input shared-signature-approval__password"
          type="password"
          :placeholder="$t('sharedWalletHome.inputPassToTransfer')"
          :value="password"
          @update:value="$emit('update:password', String($event))"
        ></a-input>

        <ledger-status-notice
          v-if="signerType === 'HardwareWallet'"
          class="shared-signature-approval__ledger"
          :status="ledgerStatus"
          :show-title="false"
        />
      </div>
    </section>

    <page-footer-actions align="between" class="shared-signature-approval__actions">
      <a-button type="default" variant="secondary" @click="$emit('back')">
        {{ $t('sharedWalletHome.back') }}
      </a-button>
      <a-button
        type="primary"
        variant="primary"
        :disabled="submitDisabled"
        @click="$emit('submit')"
      >
        {{ $t('sharedWalletHome.submit') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'SharedSignatureApprovalPanel',
})

const props = withDefaults(
  defineProps<{
    checked: boolean
    ledgerReady?: boolean
    ledgerStatus?: string
    password: string
    sending?: boolean
    signerType: string
  }>(),
  {
    ledgerReady: false,
    ledgerStatus: '',
    sending: false,
  }
)

defineEmits<{
  back: []
  submit: []
  'update:checked': [checked: boolean]
  'update:password': [password: string]
}>()

const submitDisabled = computed(
  () =>
    props.sending ||
    !props.checked ||
    (props.signerType === 'CommonWallet' && !props.password) ||
    (props.signerType === 'HardwareWallet' && !props.ledgerReady)
)
</script>

<style scoped>
.shared-signature-approval {
  display: grid;
  gap: var(--ow-space-3);
}

.shared-signature-approval__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-signature-approval__section-copy {
  display: grid;
  gap: 2px;
}

.shared-signature-approval__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-signature-approval__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-signature-approval__card {
  display: grid;
  gap: var(--ow-space-2);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-signature-approval__check {
  margin: 0;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.shared-signature-approval__password {
  width: 100%;
}

.shared-signature-approval__ledger {
  min-width: 0;
}

.shared-signature-approval__actions {
  height: 72px;
  margin-top: 0;
}

.shared-signature-approval__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .shared-signature-approval__section {
    padding: 10px 12px;
  }

  .shared-signature-approval__actions {
    height: 68px;
  }

  .shared-signature-approval__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
