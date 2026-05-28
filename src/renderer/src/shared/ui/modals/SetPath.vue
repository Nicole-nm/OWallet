<template>
  <a-modal
    :open="modelValue"
    :title="$t('SetPaths.name')"
    :footer="null"
    :closable="false"
    :maskClosable="false"
    width="25rem"
    centered
    class="set-path-modal"
  >
    <p>{{ $t('SetPaths.tips') }}</p>
    <div class="set-path-footer">
      <a-button type="primary" @click="setSavePath">{{ $t('SetPaths.enter') }}</a-button>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { notifyWarning } from '../feedback'
import { selectAndPersistSavePath } from '../../persistence/savePathService'

defineOptions({
  name: 'SetPathModal',
})

defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['update:modelValue'])

async function setSavePath() {
  const result = await selectAndPersistSavePath()
  if (!result.ok) {
    notifyWarning(result.errorKey || 'common.selectPathFailed')
    return
  }
  window.location.reload()
  emit('update:modelValue', false)
}
</script>

<style scoped>
.set-path-footer {
  text-align: center;
  margin-top: 20px;
}

.set-path-footer .ant-btn {
  width: 6.4rem;
  height: 2.13rem;
  border-radius: var(--ow-radius-control);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
}
</style>
