<template>
  <div class="json-import">
    <a-form layout="vertical" class="json-import__form" @submit.prevent="emit('next')">
      <section class="json-import__section">
        <div class="json-import__section-copy">
          <span class="json-import__section-title">{{ $t('importJsonWallet.basicInfo') }}</span>
          <span class="json-import__section-caption">
            {{ $t('createJsonWallet.priavteKeywif') }} / {{ $t('createJsonWallet.keystoreDat') }} /
            {{ $t('createJsonWallet.mnemonic') }} / {{ $t('createJsonWallet.privateKey') }}
          </span>
        </div>

        <a-tabs
          :activeKey="form.tabName"
          @update:activeKey="emit('updateField', { field: 'tabName', value: $event })"
          class="json-import__tabs"
        >
          <a-tab-pane key="wif" :tab="$t('createJsonWallet.priavteKeywif')">
            <div class="json-import__tab-panel">
              <text-field
                compact
                :label="$t('importJsonWallet.label')"
                :error="validationErrors.wifLabel"
                :model-value="form.wifLabel"
                @update:model-value="emit('updateField', { field: 'wifLabel', value: $event })"
                required
              />

              <text-field
                compact
                :label="$t('createJsonWallet.priavteKeywif')"
                :placeholder="$t('importJsonWallet.wifTip')"
                :error="validationErrors.wif"
                :model-value="form.wif"
                @update:model-value="emit('updateField', { field: 'wif', value: $event })"
                required
              />

              <password-field
                compact
                :label="$t('importJsonWallet.setPassword')"
                :error="validationErrors.wifPassword"
                :model-value="form.wifPassword"
                @update:model-value="emit('updateField', { field: 'wifPassword', value: $event })"
                required
              />

              <password-field
                compact
                :label="$t('importJsonWallet.rePassword')"
                :error="validationErrors.wifRePassword"
                :model-value="form.wifRePassword"
                @update:model-value="emit('updateField', { field: 'wifRePassword', value: $event })"
                required
              />
            </div>
          </a-tab-pane>

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
            <div class="json-import__tab-panel">
              <text-field
                compact
                :label="$t('importJsonWallet.label')"
                :model-value="form.mnemonicLabel"
                @update:model-value="emit('updateField', { field: 'mnemonicLabel', value: $event })"
              />

              <form-field
                compact
                :label="$t('createJsonWallet.mnemonic')"
                :error="validationErrors.mnemonic"
                required
              >
                <a-textarea
                  class="json-import__mnemonic ow-field-control"
                  id="import-json-mnemonic"
                  :rows="4"
                  :status="validationErrors.mnemonic ? 'error' : ''"
                  :placeholder="$t('importJsonWallet.mnemonic')"
                  :value="form.mnemonic"
                  @update:value="emit('updateField', { field: 'mnemonic', value: $event })"
                ></a-textarea>
              </form-field>

              <password-field
                compact
                :label="$t('importJsonWallet.setPassword')"
                :error="validationErrors.mnemonicPassword"
                :model-value="form.mnemonicPassword"
                @update:model-value="
                  emit('updateField', { field: 'mnemonicPassword', value: $event })
                "
                required
              />

              <password-field
                compact
                :label="$t('importJsonWallet.rePassword')"
                :error="validationErrors.mnemonicRePassword"
                :model-value="form.mnemonicRePassword"
                @update:model-value="
                  emit('updateField', { field: 'mnemonicRePassword', value: $event })
                "
                required
              />
            </div>
          </a-tab-pane>

          <a-tab-pane key="pk" :tab="$t('createJsonWallet.privateKey64Hex')">
            <div class="json-import__tab-panel">
              <text-field
                compact
                :label="$t('importJsonWallet.label')"
                :model-value="form.pkLabel"
                @update:model-value="emit('updateField', { field: 'pkLabel', value: $event })"
              />

              <text-field
                compact
                :label="$t('importJsonWallet.privateKey')"
                :placeholder="$t('importJsonWallet.privateKeyTip')"
                :error="validationErrors.pk"
                :model-value="form.pk"
                @update:model-value="emit('updateField', { field: 'pk', value: $event })"
                required
              />

              <password-field
                compact
                :label="$t('importJsonWallet.setPassword')"
                :error="validationErrors.pkPassword"
                :model-value="form.pkPassword"
                @update:model-value="emit('updateField', { field: 'pkPassword', value: $event })"
                required
              />

              <password-field
                compact
                :label="$t('createJsonWallet.rePassword')"
                :error="validationErrors.pkRePassword"
                :model-value="form.pkRePassword"
                @update:model-value="emit('updateField', { field: 'pkRePassword', value: $event })"
                required
              />
            </div>
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

<style scoped>
.json-import {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 64px;
  display: grid;
  gap: var(--ow-space-2);
}

.json-import__form {
  display: grid;
  gap: var(--ow-space-2);
}

.json-import__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 12px;
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

.json-import__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.json-import__tabs {
  margin-bottom: 0;
}

.json-import__tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--ow-space-2);
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
  margin-bottom: var(--ow-space-3);
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

.json-import__mnemonic {
  resize: none;
}

.json-import__actions {
  height: 56px;
}

.json-import__actions :deep(.ow-footer-actions) {
  margin: 6px auto;
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
