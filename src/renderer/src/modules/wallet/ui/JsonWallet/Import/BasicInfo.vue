<template>
  <div class="json-import">
    <a-form layout="vertical" class="json-import__form" @submit.prevent="emit('next')">
      <section class="json-import__section">
        <div class="json-import__section-copy">
          <span class="json-import__section-title">{{ $t('importJsonWallet.basicInfo') }}</span>
        </div>

        <a-tabs
          :activeKey="form.tabName"
          @update:activeKey="emit('updateField', { field: 'tabName', value: $event })"
          class="json-import__tabs"
        >
          <a-tab-pane key="dat" :tab="$t('createJsonWallet.keystoreDat')">
            <div class="json-import__tab-panel">
              <form-field :label="$t('importJsonWallet.dat')" compact required>
                <a-upload
                  :show-upload-list="false"
                  :before-upload="handleDatBeforeUpload"
                  accept=".dat,.json"
                >
                  <a-button type="default" variant="secondary" html-type="button">
                    {{ form.datPath }}
                  </a-button>
                </a-upload>
              </form-field>

              <div v-if="datAccounts.length > 0" class="json-import__dat-list">
                <a-card
                  v-for="(account, index) in datAccounts"
                  :key="account.address"
                  class="json-import__dat-item"
                  :bordered="true"
                >
                  <p class="json-import__dat-address">Address: {{ account.address }}</p>
                  <text-field
                    :label="$t('importJsonWallet.label')"
                    :model-value="form.datLabel[index] || ''"
                    @update:model-value="emit('datLabelChange', { index, value: $event })"
                    compact
                  />
                  <password-field
                    :label="$t('importJsonWallet.datImportPassword')"
                    :model-value="form.datPassword[index] || ''"
                    @update:model-value="emit('datPasswordChange', { index, value: $event })"
                    compact
                  />
                </a-card>
              </div>
            </div>
          </a-tab-pane>

          <a-tab-pane key="mnemonic" :tab="$t('createJsonWallet.mnemonic')">
            <secret-import-tab
              label-key="mnemonicLabel"
              :label-value="form.mnemonicLabel"
              :label-error="validationErrors.mnemonicLabel"
              secret-key="mnemonic"
              :secret-value="form.mnemonic"
              :secret-error="validationErrors.mnemonic"
              secret-label-key="createJsonWallet.mnemonic"
              secret-placeholder-key="importJsonWallet.mnemonic"
              secret-id="import-json-mnemonic"
              password-key="mnemonicPassword"
              :password-value="form.mnemonicPassword"
              :password-error="validationErrors.mnemonicPassword"
              re-password-key="mnemonicRePassword"
              :re-password-value="form.mnemonicRePassword"
              :re-password-error="validationErrors.mnemonicRePassword"
              re-password-label-key="importJsonWallet.rePassword"
              @update-field="emit('updateField', $event)"
            />
          </a-tab-pane>

          <a-tab-pane key="wif" :tab="$t('createJsonWallet.priavteKeywif')">
            <secret-import-tab
              label-key="wifLabel"
              :label-value="form.wifLabel"
              :label-error="validationErrors.wifLabel"
              secret-key="wif"
              :secret-value="form.wif"
              :secret-error="validationErrors.wif"
              secret-label-key="createJsonWallet.priavteKeywif"
              secret-placeholder-key="importJsonWallet.wifTip"
              secret-id="import-json-wif"
              password-key="wifPassword"
              :password-value="form.wifPassword"
              :password-error="validationErrors.wifPassword"
              re-password-key="wifRePassword"
              :re-password-value="form.wifRePassword"
              :re-password-error="validationErrors.wifRePassword"
              re-password-label-key="importJsonWallet.rePassword"
              @update-field="emit('updateField', $event)"
            />
          </a-tab-pane>

          <a-tab-pane key="pk" :tab="$t('createJsonWallet.privateKey64Hex')">
            <secret-import-tab
              label-key="pkLabel"
              :label-value="form.pkLabel"
              :label-error="validationErrors.pkLabel"
              secret-key="pk"
              :secret-value="form.pk"
              :secret-error="validationErrors.pk"
              secret-label-key="importJsonWallet.privateKey"
              secret-placeholder-key="importJsonWallet.privateKeyTip"
              secret-id="import-json-private-key"
              password-key="pkPassword"
              :password-value="form.pkPassword"
              :password-error="validationErrors.pkPassword"
              re-password-key="pkRePassword"
              :re-password-value="form.pkRePassword"
              :re-password-error="validationErrors.pkRePassword"
              re-password-label-key="createJsonWallet.rePassword"
              @update-field="emit('updateField', $event)"
            />
          </a-tab-pane>
        </a-tabs>
      </section>

      <page-footer-actions align="between" class="json-import__actions">
        <a-button type="default" html-type="button" @click="emit('cancel')" variant="secondary">{{
          $t('importJsonWallet.cancel')
        }}</a-button>
        <a-button type="primary" html-type="submit" variant="primary">{{
          $t('importJsonWallet.next')
        }}</a-button>
      </page-footer-actions>
    </a-form>

    <a-modal
      :title="$t('importJsonWallet.confirmImport')"
      :open="form.confirmModal"
      @ok="emit('confirmOk')"
      @cancel="emit('confirmCancel')"
    >
      <div>
        <p class="json-import__modal-copy">
          {{ $t('importJsonWallet.confirmImportExist') }}
        </p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'
import FormField from '../../../../../shared/ui/forms/FormField.vue'
import TextField from '../../../../../shared/ui/forms/TextField.vue'
import PasswordField from '../../../../../shared/ui/forms/PasswordField.vue'
import SecretImportTab from './SecretImportTab.vue'

defineOptions({
  name: 'BasicInfo',
})

interface DatAccount {
  address: string
  [key: string]: unknown
}

interface ImportJsonFormViewModel {
  tabName: string
  pk: string
  pkLabel: string
  pkPassword: string
  pkRePassword: string
  datPath: string
  datWallet: { accounts: DatAccount[] } | null
  datLabel: string[]
  datPassword: string[]
  wif: string
  wifLabel: string
  wifPassword: string
  wifRePassword: string
  mnemonic: string
  mnemonicLabel: string
  mnemonicPassword: string
  mnemonicRePassword: string
  confirmModal: boolean
}

const props = defineProps({
  form: {
    type: Object as PropType<ImportJsonFormViewModel>,
    default: () => ({}) as ImportJsonFormViewModel,
  },
  validationErrors: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
})

const datAccounts = computed(() => props.form.datWallet?.accounts ?? [])

const emit = defineEmits([
  'updateField',
  'fileChange',
  'datLabelChange',
  'datPasswordChange',
  'cancel',
  'next',
  'confirmOk',
  'confirmCancel',
])

function handleDatBeforeUpload(file: File) {
  emit('fileChange', file)
  return false
}
</script>

<style scoped lang="scss">
.json-import {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 48px;
  display: grid;
  gap: var(--ow-space-2);
}

.json-import__form {
  display: grid;
  gap: var(--ow-space-2);
}

.json-import__section {
  display: grid;
  gap: var(--ow-space-1);
  padding: 10px 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.json-import__section-copy {
  display: grid;
  gap: 2px;
}

.json-import__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.json-import__tabs {
  margin-bottom: 0;
}

.json-import__tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--ow-space-1);
}

.json-import__tabs :deep(.ant-tabs-tab) {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  padding: 8px 0;
}

.json-import__tab-panel {
  display: grid;
  gap: var(--ow-space-1);
}

.json-import__tab-panel :deep(.ow-form-item.ant-form-item) {
  margin-bottom: var(--ow-space-2);
}

.json-import__dat-list {
  display: grid;
  gap: var(--ow-space-2);
}

.json-import__dat-item {
  border-color: var(--ow-color-border-subtle);
  background: var(--ow-color-surface-muted);
  box-shadow: none;
}

.json-import__dat-address {
  margin: 0 0 var(--ow-space-2);
  word-break: break-all;
  color: var(--ow-color-text-secondary);
}

.json-import__multiline-secret {
  resize: none;
}

.json-import__actions {
  height: 52px;
}

.json-import__actions :deep(.ow-footer-actions) {
  margin: 4px auto;
  gap: var(--ow-space-2);
}

.json-import__modal-copy {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

@media (max-width: 560px) {
  .json-import {
    gap: var(--ow-space-2);
  }

  .json-import__section {
    padding: 10px;
  }

  .json-import__actions {
    height: 56px;
  }

  .json-import__actions :deep(.ow-footer-actions) {
    margin: 6px auto;
  }
}
</style>
