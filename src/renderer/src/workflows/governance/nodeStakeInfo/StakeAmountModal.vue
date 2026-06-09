<template>
  <a-modal :title="$t(titleKey)" v-model:open="openModel" @ok="emit('ok')" @cancel="emit('cancel')">
    <div class="ow-info-row">
      <span class="ow-info-label">{{ $t(labelKey) }}: </span>
      <a-input
        class="input add-pos-input"
        :class="valid ? '' : 'error-input'"
        v-model:value="valueModel"
        @change="emit('validate')"
      ></a-input>
      <span class="ow-info-value">ONT</span>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  titleKey: string
  labelKey: string
  valid: boolean
  value: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:value': [value: number]
  validate: []
  ok: []
  cancel: []
}>()

const openModel = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const valueModel = computed({
  get: () => props.value,
  set: (value) => emit('update:value', value),
})
</script>

<style scoped>
.add-pos-input {
  width: 200px;
}
</style>
