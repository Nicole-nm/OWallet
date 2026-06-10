<template>
  <div class="ow-editor-shell shared-tx-editor">
    <section class="shared-tx-editor__section">
      <p class="ow-editor-title shared-tx-editor__title">{{ $t(formTitleKey) }}</p>
      <div class="ow-editor-section shared-tx-editor__section-body">
        <slot name="formFields"></slot>
      </div>
    </section>

    <section class="shared-tx-editor__section">
      <p class="ow-editor-title shared-tx-editor__title">{{ $t(signerTitleKey) }}</p>
      <div class="ow-editor-section shared-tx-editor__section-body">
        <div class="ow-editor-row">
          <span class="ow-editor-label">{{ $t(signerLabelKey) }}</span>
          <a-select
            :options="localSigners"
            class="ow-editor-control"
            @change="emit('signerChange', $event)"
          ></a-select>
        </div>

        <common-sign-shared-panel
          :wallet="normalizedSignerWallet"
          :sign-request="signRequest"
          @sharedTxSigned="emit('txSigned', $event)"
        ></common-sign-shared-panel>
      </div>
    </section>

    <div class="ow-editor-actions">
      <a-button type="primary" variant="primary" @click="emit('confirm')">
        {{ $t('common.confirmation') }}
      </a-button>
    </div>

    <a-modal :title="$t(modalTitleKey)" :open="modalOpen" @cancel="emit('copy')">
      <template #footer>
        <a-button :type="copyButtonType" @click="emit('copy')">
          {{ $t('sharedTx.copy') }}
        </a-button>
        <a-button
          v-if="showSendButton"
          type="primary"
          key="submit"
          :loading="sendLoading"
          @click="emit('send')"
        >
          {{ $t('sharedTx.send') }}
        </a-button>
      </template>

      <slot name="modalBody"></slot>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import CommonSignSharedPanel from './CommonSignSharedPanel.vue'

defineOptions({
  name: 'SharedTxEditorShell',
})

const props = defineProps({
  formTitleKey: {
    type: String,
    required: true,
  },
  signerTitleKey: {
    type: String,
    required: true,
  },
  signerLabelKey: {
    type: String,
    required: true,
  },
  modalTitleKey: {
    type: String,
    required: true,
  },
  localSigners: {
    type: Array as PropType<unknown[]>,
    default: () => [],
  },
  signerWallet: {
    type: Object as PropType<Record<string, unknown> | null>,
    default: null,
  },
  signRequest: {
    type: Object as PropType<Record<string, unknown> | null>,
    default: null,
  },
  modalOpen: {
    type: Boolean,
    default: false,
  },
  copyButtonType: {
    type: String,
    default: 'default',
  },
  showSendButton: {
    type: Boolean,
    default: false,
  },
  sendLoading: {
    type: Boolean,
    default: false,
  },
})

const normalizedSignerWallet = computed(() => (props.signerWallet ?? undefined) as never)
const emit = defineEmits(['signerChange', 'txSigned', 'confirm', 'copy', 'send'])
</script>

<style scoped lang="scss">
.shared-tx-editor {
  display: grid;
  gap: var(--ow-space-3);
  padding: 0;
}

.shared-tx-editor__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-tx-editor__title {
  margin: 0;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.shared-tx-editor__section-body {
  display: grid;
  gap: var(--ow-space-3);
  margin: 0;
}

.shared-tx-editor__section-body :deep(.ow-editor-row) {
  display: grid;
  grid-template-columns: minmax(140px, 0.3fr) minmax(0, 1fr);
  gap: var(--ow-space-3);
  align-items: start;
  margin: 0;
}

.shared-tx-editor__section-body :deep(.ow-editor-label) {
  margin: 0;
  color: var(--ow-color-text-secondary);
}

.shared-tx-editor__section-body :deep(.ow-editor-control) {
  width: 100%;
}

.shared-tx-editor__section-body :deep(textarea.ow-editor-control) {
  min-height: 130px;
}

.shared-tx-editor :deep(.ow-editor-actions) {
  margin: var(--ow-space-1) auto 0;
}

@media (max-width: 560px) {
  .shared-tx-editor__section {
    padding: 12px;
  }

  .shared-tx-editor__section-body :deep(.ow-editor-row) {
    grid-template-columns: 1fr;
    gap: var(--ow-space-2);
  }
}
</style>
