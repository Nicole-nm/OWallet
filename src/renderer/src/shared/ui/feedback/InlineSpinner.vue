<template>
  <span class="ow-inline-spinner" role="status" aria-live="polite">
    <ASpin :size="size" />
    <span v-if="label" class="ow-inline-spinner__label">{{ label }}</span>
  </span>
</template>

<script setup lang="ts">
import { Spin as ASpin } from 'ant-design-vue'
import type { PropType } from 'vue'

defineOptions({
  name: 'InlineSpinner',
})

defineProps({
  label: {
    type: String,
    default: '',
  },
  size: {
    type: String as PropType<'small' | 'default' | 'large'>,
    default: 'small',
  },
})
</script>

<style scoped>
.ow-inline-spinner {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ow-color-text-secondary);
}

.ow-inline-spinner__label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
}
</style>
