<template>
  <div class="json-import__tab-panel">
    <text-field
      compact
      :label="$t('importJsonWallet.label')"
      :error="labelError"
      :model-value="labelValue"
      @update:model-value="emit('updateField', { field: labelKey, value: $event })"
      required
    />

    <form-field compact :label="$t(secretLabelKey)" :error="secretError" required>
      <a-textarea
        class="json-import__multiline-secret ow-field-control"
        :id="secretId"
        :rows="3"
        :status="secretError ? 'error' : ''"
        :placeholder="$t(secretPlaceholderKey)"
        :value="secretValue"
        @update:value="emit('updateField', { field: secretKey, value: $event })"
      ></a-textarea>
    </form-field>

    <password-field
      compact
      :label="$t('importJsonWallet.setPassword')"
      :error="passwordError"
      :model-value="passwordValue"
      @update:model-value="emit('updateField', { field: passwordKey, value: $event })"
      required
    />

    <password-field
      compact
      :label="$t(rePasswordLabelKey)"
      :error="rePasswordError"
      :model-value="rePasswordValue"
      @update:model-value="emit('updateField', { field: rePasswordKey, value: $event })"
      required
    />
  </div>
</template>

<script setup lang="ts">
import FormField from '../../../../../shared/ui/forms/FormField.vue'
import TextField from '../../../../../shared/ui/forms/TextField.vue'
import PasswordField from '../../../../../shared/ui/forms/PasswordField.vue'

defineProps<{
  labelKey: string
  labelValue: string
  labelError?: string
  secretKey: string
  secretValue: string
  secretError?: string
  secretLabelKey: string
  secretPlaceholderKey: string
  secretId: string
  passwordKey: string
  passwordValue: string
  passwordError?: string
  rePasswordKey: string
  rePasswordValue: string
  rePasswordError?: string
  rePasswordLabelKey: string
}>()

const emit = defineEmits<{
  updateField: [payload: { field: string; value: unknown }]
}>()
</script>

<style scoped>
.json-import__tab-panel {
  display: grid;
  gap: var(--ow-space-1);
}

.json-import__tab-panel :deep(.ow-form-item.ant-form-item) {
  margin-bottom: var(--ow-space-2);
}

.json-import__multiline-secret {
  resize: none;
}
</style>
