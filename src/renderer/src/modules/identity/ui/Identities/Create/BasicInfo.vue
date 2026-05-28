<template>
  <a-form layout="vertical" class="identity-create" @submit.prevent="emit('next')">
    <section class="identity-create__section">
      <div class="identity-create__section-copy">
        <span class="identity-create__section-title">{{ $t('createIdentity.basicInfo') }}</span>
      </div>

      <div class="identity-create__field-grid">
        <text-field
          :label="$t('createIdentity.label')"
          :error="validationErrors.label"
          v-model="label"
          required
        />

        <password-field
          :label="$t('createIdentity.password')"
          :error="validationErrors.password"
          v-model="password"
          required
        />

        <password-field
          :label="$t('createIdentity.rePassword')"
          :error="validationErrors.rePassword"
          v-model="rePassword"
          required
        />
      </div>
    </section>

    <section class="identity-create__section">
      <div class="identity-create__section-copy">
        <span class="identity-create__section-title">{{ $t('createIdentity.selectWallet') }}</span>
      </div>

      <div class="identity-create__wallet-control">
        <a-radio-group v-model:value="payerWalletType" class="identity-create__wallet-switch">
          <a-radio value="commonWallet">{{ $t('createIdentity.commonWallet') }}</a-radio>
          <a-radio value="ledgerWallet">{{ $t('createIdentity.ledgerWallet') }}</a-radio>
        </a-radio-group>

        <div v-if="payerWalletType === 'commonWallet'" class="identity-create__wallet-panel">
          <wallet-select-field
            :options="localCommonWallet"
            v-model:value="payerWalletValue"
            :placeholder="$t('createIdentity.selectCommonWallet')"
            :empty-text="$t('createIdentity.selectOneWallet')"
            :aria-label="$t('createIdentity.selectCommonWallet')"
            :disabled="localCommonWallet.length === 0"
            @walletSelected="emit('walletSelected', $event)"
          >
          </wallet-select-field>
          <password-field
            class="identity-create__payer-password"
            v-model="payerPassword"
            :placeholder="$t('createIdentity.payerPassword')"
          />
        </div>

        <div v-if="payerWalletType === 'ledgerWallet'" class="identity-create__wallet-panel">
          <ledger-status-notice
            class="identity-create__ledger-status"
            :status="String(ledgerStatus || '')"
            :show-title="false"
            compact
          />
        </div>
      </div>
    </section>

    <page-footer-actions align="between" class="identity-create__actions">
      <a-button type="default" html-type="button" @click="emit('cancel')" variant="secondary">{{
        $t('createIdentity.cancel')
      }}</a-button>
      <a-button type="primary" html-type="submit" variant="primary">{{
        $t('createIdentity.next')
      }}</a-button>
    </page-footer-actions>
  </a-form>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import TextField from '../../../../../shared/ui/forms/TextField.vue'
import PasswordField from '../../../../../shared/ui/forms/PasswordField.vue'
import WalletSelectField from '../../../../../shared/ui/forms/WalletSelectField.vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../../../../shared/ui/ledger/LedgerStatusNotice.vue'

defineOptions({
  name: 'BasicInfo',
})

interface WalletSelectOption {
  label?: string
  value?: string | number | null
  address?: string
  key?: string | number
  name?: string
}

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  password: {
    type: String,
    default: '',
  },
  rePassword: {
    type: String,
    default: '',
  },
  payerWalletType: {
    type: String,
    default: 'commonWallet',
  },
  payerWalletValue: {
    type: String,
    default: undefined,
  },
  localCommonWallet: {
    type: Array as PropType<WalletSelectOption[]>,
    default: () => [],
  },
  payerPassword: {
    type: String,
    default: '',
  },
  validationErrors: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({
      label: '',
      password: '',
      rePassword: '',
    }),
  },
  ledgerStatus: {
    type: [String, Object],
    default: '',
  },
})

const emit = defineEmits([
  'update:label',
  'update:password',
  'update:rePassword',
  'update:payerWalletType',
  'update:payerWalletValue',
  'update:payerPassword',
  'walletSelected',
  'cancel',
  'next',
])

const label = computed({
  get: () => props.label,
  set: (value) => emit('update:label', value),
})

const password = computed({
  get: () => props.password,
  set: (value) => emit('update:password', value),
})

const rePassword = computed({
  get: () => props.rePassword,
  set: (value) => emit('update:rePassword', value),
})

const payerWalletType = computed({
  get: () => props.payerWalletType,
  set: (value) => emit('update:payerWalletType', value),
})

const payerWalletValue = computed({
  get: () => props.payerWalletValue,
  set: (value) => emit('update:payerWalletValue', value),
})

const payerPassword = computed({
  get: () => props.payerPassword,
  set: (value) => emit('update:payerPassword', value),
})
</script>

<style scoped>
.identity-create {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.identity-create__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.identity-create__section-copy {
  display: grid;
  gap: 2px;
}

.identity-create__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.identity-create__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-2);
}

.identity-create__field-grid > :first-child {
  grid-column: 1 / -1;
}

.identity-create__wallet-control {
  display: grid;
  gap: var(--ow-space-2);
}

.identity-create__wallet-switch {
  width: 100%;
  display: flex;
  flex-wrap: wrap;
  gap: var(--ow-space-3);
}

.identity-create__wallet-panel {
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.identity-create__payer-password {
  margin-top: 10px;
}

.identity-create__ledger-status {
  padding: 0;
}

.identity-create__actions {
  height: 68px;
}

.identity-create__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 700px) {
  .identity-create__field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .identity-create {
    gap: var(--ow-space-2);
  }

  .identity-create__section {
    padding: 12px;
  }

  .identity-create__actions {
    height: 64px;
  }

  .identity-create__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
