<template>
  <div class="shared-create">
    <section class="shared-create__section">
      <div class="shared-create__section-copy">
        <span class="shared-create__section-title">{{ $t('createSharedWallet.basicInfo') }}</span>
        <span class="shared-create__section-caption">{{ $t('createSharedWallet.label') }}</span>
      </div>

      <a-input
        v-model:value="label"
        class="input shared-create__wallet-name"
        :class="validLabel ? '' : 'error-input'"
        :placeholder="$t('createSharedWallet.label')"
        @change="emit('validateLabel')"
      ></a-input>
    </section>

    <section class="shared-create__section">
      <div class="shared-create__section-copy">
        <span class="shared-create__section-title">{{
          $t('createSharedWallet.copayers2_12')
        }}</span>
        <span class="shared-create__section-caption">{{ $t('createSharedWallet.inputPks') }}</span>
      </div>

      <div class="shared-create__copayer-list">
        <div class="shared-create__copayer-row" v-for="(item, index) in pks" :key="index">
          <div class="shared-create__copayer-fields">
            <a-input
              class="input"
              :class="item.nameValid ? '' : 'error-input'"
              :placeholder="$t('createSharedWallet.name')"
              :value="item.name"
              @update:value="emit('updateCopayerName', { index, value: $event })"
            ></a-input>
            <a-input
              class="input"
              :class="item.pkValid ? '' : 'error-input'"
              :placeholder="$t('createSharedWallet.publicKey')"
              :value="item.publickey"
              @update:value="emit('updateCopayerPublicKey', { index, value: $event })"
              @change="emit('validatePublickey', { index, value: $event.target.value })"
            ></a-input>
          </div>

          <button type="button" class="shared-create__delete" @click="emit('removePk', index)">
            <DeleteOutlined />
          </button>

          <p class="shared-create__error ow-error-text" v-if="!item.pkValid">
            {{ $t('createSharedWallet.invalidPk') }}
          </p>
        </div>
      </div>

      <a-button
        v-if="pks.length < 12"
        variant="accent"
        class="shared-create__add"
        @click="emit('addPk')"
      >
        {{ $t('createSharedWallet.add') }}
      </a-button>
    </section>

    <page-footer-actions align="between" class="shared-create__actions">
      <a-button type="default" @click="emit('cancel')" variant="secondary">
        {{ $t('createSharedWallet.cancel') }}
      </a-button>
      <a-button type="primary" @click="emit('next')" variant="primary">
        {{ $t('createSharedWallet.next') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { DeleteOutlined } from '@ant-design/icons-vue'
import { computed, PropType } from 'vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'
defineOptions({
  name: 'BasicInfo',
})

interface CopayerDraft {
  name?: string
  publickey?: string
  nameValid?: boolean
  pkValid?: boolean
}

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  validLabel: {
    type: Boolean,
    default: true,
  },
  pks: {
    type: Array as PropType<CopayerDraft[]>,
    default: () => [],
  },
})

const emit = defineEmits([
  'update:label',
  'validateLabel',
  'validatePublickey',
  'addPk',
  'removePk',
  'updateCopayerName',
  'updateCopayerPublicKey',
  'cancel',
  'next',
])

const label = computed({
  get: () => props.label,
  set: (value) => emit('update:label', value),
})
</script>

<style scoped>
.shared-create {
  width: min(100%, 880px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-4);
}

.shared-create__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-create__section-copy {
  display: grid;
  gap: 2px;
}

.shared-create__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-create__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-create__wallet-name {
  width: 100%;
}

.shared-create__copayer-list {
  display: grid;
  gap: var(--ow-space-3);
}

.shared-create__copayer-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 40px;
  gap: var(--ow-space-2);
  align-items: start;
}

.shared-create__copayer-fields {
  display: grid;
  grid-template-columns: minmax(160px, 220px) minmax(0, 1fr);
  gap: var(--ow-space-2);
}

.shared-create__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-surface-muted);
  color: var(--ow-color-text-secondary);
  cursor: pointer;
}

.shared-create__delete:hover,
.shared-create__delete:focus-visible {
  border-color: var(--ow-color-brand);
  color: var(--ow-color-brand);
}

.shared-create__error {
  grid-column: 1 / -1;
  margin: 0;
}

.shared-create__add {
  justify-self: flex-start;
}

.shared-create__actions {
  height: 72px;
}

.shared-create__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 700px) {
  .shared-create__copayer-fields {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .shared-create {
    gap: var(--ow-space-3);
  }

  .shared-create__section {
    padding: 12px;
  }

  .shared-create__copayer-row {
    grid-template-columns: 1fr auto;
  }

  .shared-create__actions {
    height: 68px;
  }

  .shared-create__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
