<template>
  <div class="identity-card">
    <div class="identity-card__header">
      <div class="identity-card__kind">
        <span>{{ $t('identities.identity') }}</span>
      </div>

      <a-dropdown>
        <template #overlay>
          <a-menu>
            <a-menu-item key="1">
              <span @click="handleExportIdentity()">{{ $t('common.exportIdentity') }}</span>
            </a-menu-item>
            <a-menu-item key="2">
              <span @click="deleteIdentity()">{{ $t('common.deleteIdentity') }}</span>
            </a-menu-item>
          </a-menu>
        </template>
        <app-button variant="ghost" size="compact">
          {{ $t('common.more') }}<DownOutlined />
        </app-button>
      </a-dropdown>
    </div>

    <div class="identity-card__body">
      <h3 class="identity-card__title">{{ identity.label }}</h3>

      <div class="identity-card__summary-row">
        <span class="identity-card__label">{{ $t('identities.ontid') }}</span>
        <span class="identity-card__value">{{ identity.ontid }}</span>
      </div>
    </div>

    <div class="identity-card__footer">
      <span v-if="addressCopied" class="identity-card__copied">{{ $t('common.copied') }}</span>
      <app-button
        class="identity-card__copy-button"
        variant="ghost"
        size="compact"
        @click="copyAddress(identity)"
      >
        {{ $t('common.copy') }}
      </app-button>
    </div>

    <a-modal
      :title="modalTitle"
      v-model:open="passModal"
      @ok="handleValidatePassword"
      @cancel="handleCancel"
    >
      <div>
        <p class="identity-card__modal-copy">
          {{ option === 'EXPORT_ONTID' ? $t('wallets.exportOntid') : '' }}
          {{ identity.ontid }}
        </p>
        <div>
          <p>{{ $t('common.enterIdentityPassword') }}</p>
          <a-input
            class="input"
            v-model:value="password"
            :placeholder="$t('common.password')"
            type="password"
          ></a-input>
        </div>
      </div>
    </a-modal>

    <a-modal
      :title="$t('common.exportIdentity')"
      v-model:open="showIdentityKeystore"
      @ok="handleShowKeystoreOk"
    >
      <div class="identity-keystore">
        <p class="identity-keystore__value">{{ keystore }}</p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, type PropType } from 'vue'
import { useI18n } from 'vue-i18n'
import {
  deleteStoredIdentity,
  exportIdentityKeystore,
  validateStoredIdentityPassword,
} from '../../modules/identity/application/identityDetailApplicationService'
import { useCopyFeedback } from '../../shared/composables/useCopyFeedback'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useIdentitiesStore } from '../../stores/modules/Identities'
import { DownOutlined } from '@ant-design/icons-vue'
import type { Identity } from '../../shared/lib/types'
import AppButton from '../../shared/ui/actions/AppButton.vue'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'

defineOptions({
  name: 'IdentityView',
})

const props = defineProps({
  identity: {
    type: Object as PropType<Identity>,
    default: () => ({}) as Identity,
  },
})

const { t } = useI18n()
const loadingStore = useLoadingModalStore()
const identitiesStore = useIdentitiesStore()

const addressCopied = ref(false)
const modalTitle = computed(() => t('common.authentication'))
const passModal = ref(false)
const password = ref('')
const showIdentityKeystore = ref(false)
const keystore = ref('')
const option = ref('')
const { copied, copyText } = useCopyFeedback({ successMessageKey: 'common.copied' })

watch(copied, (value) => {
  addressCopied.value = value
})

async function copyAddress(identity: Identity) {
  await copyText(identity.ontid)
}

function handleExportIdentity() {
  passModal.value = true
  option.value = 'EXPORT_ONTID'
}

function deleteIdentity() {
  passModal.value = true
  option.value = 'DELETE_ONTID'
}

function handleCancel() {
  passModal.value = false
  password.value = ''
}

async function handleValidatePassword() {
  if (!password.value) {
    notifyError('common.enterIdentityPassword')
    return
  }

  loadingStore.showLoadingModals()
  const validationResult = await validateStoredIdentityPassword(props.identity, password.value)
  if (!validationResult.ok) {
    loadingStore.hideLoadingModals()
    notifyError(validationResult.errorKey || 'common.networkErr')
    return
  }

  if (!validationResult.valid) {
    loadingStore.hideLoadingModals()
    return
  }

  if (option.value === 'DELETE_ONTID') {
    handleDelete()
  } else if (option.value === 'EXPORT_ONTID') {
    const exportResult = exportIdentityKeystore(props.identity)
    passModal.value = false
    if (!exportResult.ok) {
      loadingStore.hideLoadingModals()
      notifyError(exportResult.errorKey || 'common.networkErr')
      return
    }
    showIdentityKeystore.value = true
    keystore.value = exportResult.keystore
    loadingStore.hideLoadingModals()
  }

  password.value = ''
}

async function handleDelete() {
  const result = await deleteStoredIdentity(props.identity.ontid)
  if (!result.ok) {
    loadingStore.hideLoadingModals()
    notifyError(result.errorKey || 'wallets.deleteIdentityFailed')
    return
  }

  identitiesStore.deleteIdentity(props.identity.ontid)
  loadingStore.hideLoadingModals()
  notifySuccess('wallets.deleteIdentitySuccess')
  passModal.value = false
}

function handleShowKeystoreOk() {
  keystore.value = ''
  showIdentityKeystore.value = false
}
</script>

<style scoped>
.identity-card {
  min-height: 100%;
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: linear-gradient(180deg, rgba(255, 255, 255, 0.98), rgba(248, 250, 252, 0.96));
  display: grid;
  gap: var(--ow-space-3);
}

.identity-card__header,
.identity-card__footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-2);
}

.identity-card__kind {
  display: inline-flex;
  align-items: center;
  min-height: 28px;
  padding: 0 10px;
  border-radius: var(--ow-radius-pill);
  background: color-mix(in srgb, var(--ow-color-brand) 10%, white);
  color: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
}

.identity-card__body {
  display: grid;
  gap: var(--ow-space-2);
}

.identity-card__title {
  margin: 0;
  font-family: var(--ow-font-bold);
  font-size: 1.1rem;
  line-height: 1.25;
  color: var(--ow-color-text-primary);
}

.identity-card__summary-row {
  display: grid;
  gap: 6px;
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.identity-card__label {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.identity-card__value {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: 1.55;
  color: var(--ow-color-text-primary);
  overflow-wrap: anywhere;
}

.identity-card__copied {
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-success);
}

.identity-card__copy-button {
  margin-left: auto;
}

.identity-card__modal-copy {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

.identity-keystore {
  max-height: 360px;
  overflow: auto;
}

.identity-keystore__value {
  margin: 0;
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  overflow-wrap: anywhere;
}

@media (max-width: 560px) {
  .identity-card {
    padding: 12px;
  }

  .identity-card__footer {
    align-items: flex-start;
    flex-direction: column;
  }

  .identity-card__copy-button {
    margin-left: 0;
  }
}
</style>
