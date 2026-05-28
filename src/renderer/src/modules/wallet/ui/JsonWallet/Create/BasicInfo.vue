<template>
  <a-form layout="vertical" class="json-create" @submit.prevent="emit('next')">
    <section class="json-create__section">
      <div class="json-create__section-copy">
        <span class="json-create__section-title">{{ $t('createJsonWallet.basicInfo') }}</span>
        <span class="json-create__section-caption">
          {{ $t('createJsonWallet.label') }} / {{ $t('createJsonWallet.password') }}
        </span>
      </div>

      <div class="json-create__field-grid">
        <text-field
          :label="$t('createJsonWallet.label')"
          :error="validationErrors.label"
          v-model="label"
          required
        />

        <password-field
          :label="$t('createJsonWallet.password')"
          :error="validationErrors.password"
          v-model="password"
          required
        />

        <password-field
          :label="$t('createJsonWallet.rePassword')"
          :error="validationErrors.rePassword"
          v-model="rePassword"
          required
        />
      </div>
    </section>

    <page-footer-actions align="between" class="json-create__actions">
      <a-button type="default" html-type="button" @click="emit('cancel')" variant="secondary">{{
        $t('createJsonWallet.cancel')
      }}</a-button>
      <a-button type="primary" html-type="submit" variant="primary">{{
        $t('createJsonWallet.next')
      }}</a-button>
    </page-footer-actions>
  </a-form>
</template>

<script setup lang="ts">
import { computed, PropType } from 'vue'
import TextField from '../../../../../shared/ui/forms/TextField.vue'
import PasswordField from '../../../../../shared/ui/forms/PasswordField.vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'BasicInfo',
})

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
  validationErrors: {
    type: Object as PropType<Record<string, string>>,
    default: () => ({
      label: '',
      password: '',
      rePassword: '',
    }),
  },
})

const emit = defineEmits(['update:label', 'update:password', 'update:rePassword', 'cancel', 'next'])

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
</script>

<style scoped>
.json-create {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 84px;
  display: grid;
  gap: var(--ow-space-3);
}

.json-create__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.json-create__section-copy {
  display: grid;
  gap: 2px;
}

.json-create__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.json-create__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.json-create__field-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-2);
}

.json-create__field-grid > :first-child {
  grid-column: 1 / -1;
}

.json-create__actions {
  height: 68px;
}

.json-create__actions :deep(.ow-footer-actions) {
  margin: 10px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 700px) {
  .json-create__field-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 560px) {
  .json-create {
    gap: var(--ow-space-2);
  }

  .json-create__section {
    padding: 12px;
  }

  .json-create__actions {
    height: 64px;
  }

  .json-create__actions :deep(.ow-footer-actions) {
    margin: 8px auto;
  }
}
</style>
