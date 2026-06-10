<template>
  <a-modal
    :title="$t('nodeMgmt.cancelAuthorization')"
    v-model:open="openModel"
    @ok="emit('ok')"
    @cancel="emit('cancel')"
  >
    <div>
      <div class="ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.nodeName') }}: </span>
        <span class="ow-info-value">{{ nodeName }}</span>
      </div>
      <div class="in-authorization ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.inAuthorization') }}: </span>
        <span class="ow-info-value">{{ inAuthorization }} ONT</span>
      </div>
      <div class="ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.unitToCancel') }}: </span>
        <a-input
          class="ow-input cancel-stake-input"
          :class="validCancelAmount ? '' : 'ow-error-input'"
          v-model:value="cancelAmountModel"
          @change="emit('validate')"
        ></a-input>
        <span class="ow-info-value">{{ cancelUnitLabel }}</span>
      </div>
      <div class="ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.amountToCancel') }}: </span>
        <span class="ow-info-value">{{ cancelAmountDisplay }} ONT</span>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  open: boolean
  nodeName: unknown
  inAuthorization: unknown
  cancelAmount: number
  validCancelAmount: boolean
  cancelUnitLabel: string
  cancelAmountDisplay: string
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:cancelAmount': [value: number]
  validate: []
  ok: []
  cancel: []
}>()

const openModel = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const cancelAmountModel = computed({
  get: () => props.cancelAmount,
  set: (value) => emit('update:cancelAmount', value),
})
</script>

<style scoped lang="scss">
.cancel-stake-input {
  width: 200px;
}
</style>
