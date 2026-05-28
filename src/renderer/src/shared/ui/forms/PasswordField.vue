<template>
  <FormField
    :label="label"
    :name="name"
    :error="error"
    :required="required"
    :compact="compact"
    :inline="inline"
  >
    <a-input-password
      class="ow-field-control"
      :placeholder="placeholder || label"
      :status="error ? 'error' : ''"
      :disabled="disabled"
      :value="modelValue"
      @update:value="onInput"
    />
  </FormField>
</template>

<script setup lang="ts">
import { type PropType } from 'vue'
import FormField from './FormField.vue'

defineOptions({
  name: 'PasswordField',
})

const props = defineProps({
  modelValue: {
    type: String,
    default: '',
  },
  label: {
    type: String,
    default: '',
  },
  name: {
    type: [String, Array] as PropType<string | Array<string | number>>,
    default: '',
  },
  placeholder: {
    type: String,
    default: '',
  },
  error: {
    type: String,
    default: '',
  },
  required: {
    type: Boolean,
    default: false,
  },
  compact: {
    type: Boolean,
    default: false,
  },
  inline: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits<{
  (e: 'update:modelValue', value: string): void
}>()

function onInput(value: string) {
  emit('update:modelValue', value)
}

void props
</script>
