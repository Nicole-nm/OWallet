<template>
  <div class="ow-editor-shell">
    <p class="ow-editor-title">{{ $t(formTitleKey) }}</p>
    <div class="ow-editor-section">
      <slot name="formFields"></slot>
    </div>

    <p class="ow-editor-title">{{ $t(signerTitleKey) }}</p>
    <div class="ow-editor-section">
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
    type: [Object, String] as PropType<unknown>,
    default: '',
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

const normalizedSignerWallet = computed(() => props.signerWallet as never)
const emit = defineEmits(['signerChange', 'txSigned', 'confirm', 'copy', 'send'])
</script>
