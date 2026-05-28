<template>
  <AFormItem
    :class="formItemClasses"
    :label="label || undefined"
    :name="name || undefined"
    :required="required"
    :validate-status="resolvedValidateStatus"
    :help="resolvedHelp"
    :colon="false"
  >
    <slot />
    <div v-if="$slots.help && !resolvedHelp" class="ow-form-item__help">
      <slot name="help" />
    </div>
  </AFormItem>
</template>

<script setup lang="ts">
import { computed, type PropType } from 'vue'
import { FormItem as AFormItem } from 'ant-design-vue'

defineOptions({
  name: 'FormField',
})

const props = defineProps({
  label: {
    type: String,
    default: '',
  },
  name: {
    type: [String, Array] as PropType<string | Array<string | number>>,
    default: '',
  },
  labelTag: {
    type: String,
    default: 'label',
  },
  inline: {
    type: Boolean,
    default: false,
  },
  required: {
    type: Boolean,
    default: false,
  },
  error: {
    type: String,
    default: '',
  },
  help: {
    type: String,
    default: '',
  },
  validateStatus: {
    type: String as PropType<'success' | 'warning' | 'error' | 'validating' | ''>,
    default: '',
  },
  compact: {
    type: Boolean,
    default: false,
  },
  readonly: {
    type: Boolean,
    default: false,
  },
})

const resolvedValidateStatus = computed(() => {
  if (props.validateStatus) {
    return props.validateStatus
  }

  return props.error ? 'error' : ''
})

const resolvedHelp = computed(() => props.error || props.help || undefined)

const formItemClasses = computed(() => [
  'ow-form-item',
  {
    'ow-form-item--inline': props.inline,
    'ow-form-item--compact': props.compact,
    'ow-form-item--readonly': props.readonly,
  },
])
</script>
