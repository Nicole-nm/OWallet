<template>
  <div class="ledger-import">
    <section class="ledger-import__section">
      <div class="ledger-import__section-copy">
        <span class="ledger-import__section-title">{{
          $t('ledgerWallet.nameOfLedgerWallet')
        }}</span>
        <span class="ledger-import__section-caption">{{ $t('ledgerWallet.enterName') }}</span>
      </div>

      <a-input
        class="input ledger-import__name-input"
        :placeholder="$t('importLedgerWallet.label')"
        :value="form.label"
        @update:value="emit('updateField', { field: 'label', value: $event })"
      ></a-input>
    </section>

    <section class="ledger-import__section">
      <div class="ledger-import__section-copy">
        <span class="ledger-import__section-title">{{ $t('ledgerWallet.info') }}</span>
        <span class="ledger-import__section-caption">
          {{
            form.isAdvancedMode ? $t('ledgerWallet.specifyPath') : $t('ledgerWallet.selectAccount')
          }}
        </span>
      </div>

      <div class="ledger-import__panel">
        <div v-show="!form.isAdvancedMode">
          <a-spin :spinning="form.isLoading">
            <p v-if="shouldShowInitialPageStatus()" class="ledger-import__loading-status">
              {{ $t(getInitialPageStatusKey()) }}
            </p>

            <div class="ledger-import__address-list">
              <div
                class="ledger-import__account-row"
                v-for="ledgerAccount in form.publicKeyList"
                :key="ledgerAccount.acct"
              >
                <a-checkbox
                  v-if="ledgerAccount"
                  :value="ledgerAccount"
                  @change="emit('selectAddress', ledgerAccount)"
                  :checked="isSelected(ledgerAccount)"
                >
                  {{ `${ledgerAccount.acct}. ${getAddressFromPubKey(ledgerAccount)}` }}
                </a-checkbox>
              </div>
            </div>

            <div class="ledger-import__paging">
              <button
                type="button"
                class="ledger-import__paging-item"
                :disabled="form.page === 1"
                @click="emit('prevPage')"
              >
                &lt;
              </button>
              <span class="ledger-import__paging-item ledger-import__paging-item--current">{{
                form.page
              }}</span>
              <button type="button" class="ledger-import__paging-item" @click="emit('nextPage')">
                &gt;
              </button>
            </div>
          </a-spin>
        </div>

        <div v-show="form.isAdvancedMode" class="ledger-import__advanced">
          <a-radio-group
            :value="form.neo"
            class="ledger-import__path-group"
            @update:value="emit('updateField', { field: 'neo', value: $event })"
          >
            <a-radio class="ledger-import__path-radio" :value="false">
              <span class="ledger-import__path-label">44'/1024'/0'/0/</span>
              <a-input-number
                :disabled="form.neo"
                size="small"
                class="ledger-import__path-input"
                :step="1"
                :min="0"
                :precision="0"
                :value="form.notNeoPathParam"
                placeholder="0"
                @update:value="emit('updateField', { field: 'notNeoPathParam', value: $event })"
              />
            </a-radio>
            <a-radio class="ledger-import__path-radio" :value="true">
              <span class="ledger-import__path-label">44'/888'/0'/0/</span>
              <a-input-number
                :disabled="!form.neo"
                size="small"
                class="ledger-import__path-input"
                :step="1"
                :min="0"
                :precision="0"
                :value="form.neoPathParam"
                placeholder="0"
                @update:value="emit('updateField', { field: 'neoPathParam', value: $event })"
              />
            </a-radio>
          </a-radio-group>

          <a-spin :spinning="form.advancedModeLoading" />

          <div v-if="form.advancedModePublicKey" class="ledger-import__derived-address">
            {{ getAddressFromPubKey(form.advancedModePublicKey) }}
          </div>
        </div>
      </div>
    </section>

    <div class="ledger-import__mode-line">
      <button type="button" class="ledger-import__mode-toggle" @click="emit('toggleMode')">
        {{ form.isAdvancedMode ? $t('ledgerWallet.normalMode') : $t('ledgerWallet.advancedMode') }}
      </button>
    </div>

    <page-footer-actions align="between" class="ledger-import__actions">
      <a-button type="default" @click="emit('cancel')" variant="secondary">{{
        $t('importJsonWallet.cancel')
      }}</a-button>
      <a-button type="primary" @click="emit('next')" variant="primary" :disabled="addDisabled">{{
        $t('importLedgerWallet.next')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { onMounted, PropType } from 'vue'
import type { LedgerWalletSelection } from '../../../../../shared/types'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'BasicInfo',
})

interface LedgerAccountItem extends LedgerWalletSelection {
  acct: number
}

interface ImportLedgerViewModel {
  label: string
  neo: boolean
  page: number
  selectedPublicKeys: LedgerAccountItem[]
  publicKeyList: LedgerAccountItem[]
  isAdvancedMode: boolean
  isLoading: boolean
  notNeoPathParam: string
  neoPathParam: string
  advancedModeLoading: boolean
  advancedModePublicKey: LedgerAccountItem | null
  initialPageStatus: 'idle' | 'loading' | 'retrying' | 'ready'
}

const props = defineProps({
  form: {
    type: Object as PropType<ImportLedgerViewModel>,
    default: () => ({}),
  },
  addDisabled: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits([
  'entered',
  'updateField',
  'toggleMode',
  'selectAddress',
  'prevPage',
  'nextPage',
  'cancel',
  'next',
])

onMounted(() => {
  emit('entered')
})

function isSelected(pk: LedgerAccountItem) {
  return (props.form.selectedPublicKeys || []).some((item) => item.acct === pk.acct)
}

function getAddressFromPubKey(item: LedgerAccountItem | null | undefined) {
  return item?.address || ''
}

function shouldShowInitialPageStatus() {
  return (
    !props.form.isAdvancedMode &&
    (props.form.publicKeyList || []).length === 0 &&
    ['loading', 'retrying'].includes(props.form.initialPageStatus)
  )
}

function getInitialPageStatusKey() {
  return props.form.initialPageStatus === 'retrying'
    ? 'ledgerWallet.retryingAccounts'
    : 'ledgerWallet.loadingAccounts'
}
</script>

<style scoped>
.ledger-import {
  width: min(100%, 840px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.ledger-import__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.ledger-import__section-copy {
  display: grid;
  gap: 2px;
}

.ledger-import__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.ledger-import__section-caption,
.ledger-import__loading-status {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.ledger-import__panel {
  display: grid;
  gap: var(--ow-space-2);
  padding: 10px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.ledger-import__name-input {
  width: 100%;
}

.ledger-import__address-list {
  display: grid;
  gap: 6px;
}

.ledger-import__account-row {
  padding: 8px 10px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.ledger-import__account-row :deep(.ant-checkbox-wrapper) {
  width: 100%;
}

.ledger-import__paging {
  margin-top: var(--ow-space-2);
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ow-space-2);
}

.ledger-import__paging-item {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--ow-color-border-strong);
  border-radius: var(--ow-radius-card);
  background: var(--ow-color-surface-card);
  color: var(--ow-color-text-primary);
}

.ledger-import__paging-item:disabled {
  opacity: 0.5;
  cursor: default;
}

.ledger-import__paging-item--current {
  font-family: var(--ow-font-medium);
}

.ledger-import__advanced {
  display: grid;
  gap: var(--ow-space-3);
}

.ledger-import__path-group {
  display: grid;
  gap: var(--ow-space-2);
}

.ledger-import__path-radio {
  display: flex;
  align-items: center;
  min-height: 36px;
}

.ledger-import__path-label {
  display: inline-block;
  width: 96px;
  color: var(--ow-color-text-primary);
}

.ledger-import__path-input {
  width: 72px;
  margin-left: var(--ow-space-3);
}

.ledger-import__derived-address {
  padding: 8px 10px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
  overflow-wrap: anywhere;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.ledger-import__mode-line {
  display: flex;
  justify-content: flex-end;
}

.ledger-import__mode-toggle {
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  cursor: pointer;
}

.ledger-import__actions {
  height: 68px;
}

.ledger-import__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .ledger-import {
    gap: var(--ow-space-2);
  }

  .ledger-import__section {
    padding: 12px;
  }

  .ledger-import__path-radio {
    align-items: flex-start;
    flex-direction: column;
    gap: var(--ow-space-1);
  }

  .ledger-import__path-input {
    margin-left: 0;
  }

  .ledger-import__actions {
    height: 64px;
  }

  .ledger-import__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
