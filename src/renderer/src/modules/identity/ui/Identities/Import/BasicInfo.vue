<template>
  <a-form layout="vertical" class="identity-import" @submit.prevent="emit('next')">
    <section class="identity-import__section">
      <div class="identity-import__section-copy">
        <span class="identity-import__section-title">{{ $t('importIdentity.basicInfo') }}</span>
        <span class="identity-import__section-caption">
          {{ $t('importIdentity.keystoreImport') }} / {{ $t('importIdentity.ontidPassword') }}
        </span>
      </div>

      <form-field
        :label="$t('importIdentity.keystore')"
        :error="validationErrors.keystore"
        required
      >
        <a-textarea
          class="identity-import__keystore ow-field-control"
          id="import-identity-keystore"
          :rows="7"
          :status="validationErrors.keystore ? 'error' : ''"
          :placeholder="$t('importIdentity.keystore')"
          :value="form.keystore"
          @update:value="emit('updateField', { field: 'keystore', value: $event })"
        ></a-textarea>
      </form-field>

      <password-field
        :label="$t('importIdentity.ontidPassword')"
        :error="validationErrors.keystorePassword"
        :model-value="form.keystorePassword"
        @update:model-value="emit('updateField', { field: 'keystorePassword', value: $event })"
        required
      />
    </section>

    <page-footer-actions align="between" class="identity-import__actions">
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
import { PropType } from 'vue'
import FormField from '../../../../../shared/ui/forms/FormField.vue'
import PasswordField from '../../../../../shared/ui/forms/PasswordField.vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'BasicInfo',
})

interface ImportIdentityFormViewModel {
  keystore: string
  keystorePassword: string
}

defineProps({
  form: {
    type: Object as PropType<ImportIdentityFormViewModel>,
    default: () => ({}) as ImportIdentityFormViewModel,
  },
  validationErrors: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({}),
  },
})

const emit = defineEmits(['updateField', 'cancel', 'next'])
</script>

<style scoped>
.identity-import {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.identity-import__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.identity-import__section-copy {
  display: grid;
  gap: 2px;
}

.identity-import__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.identity-import__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.identity-import__keystore {
  resize: none;
}

.identity-import__actions {
  height: 68px;
}

.identity-import__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .identity-import {
    gap: var(--ow-space-2);
  }

  .identity-import__section {
    padding: 12px;
  }

  .identity-import__actions {
    height: 64px;
  }

  .identity-import__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
