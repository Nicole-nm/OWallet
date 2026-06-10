<template>
  <a-modal
    :title="$t('nodeMgmt.changeRewardProportion')"
    v-model:open="openModel"
    @ok="emit('confirm')"
    @cancel="emit('cancel')"
  >
    <div class="ratio-modal-form">
      <div class="ratio-modal-row">
        <label class="ratio-modal-label">{{ $t('nodeMgmt.nodeRewardProportion') }}:</label>
        <div class="ratio-modal-control">
          <a-input-number :min="0" :max="100" class="reward-input" v-model:value="peerCostModel" />
          <span>%</span>
        </div>
      </div>
      <div class="ratio-modal-row">
        <label class="ratio-modal-label">{{ $t('nodeMgmt.userRewardProportion') }}:</label>
        <div class="ratio-modal-control">
          <a-input-number :min="0" :max="100" class="reward-input" v-model:value="stakeCostModel" />
          <span>%</span>
        </div>
      </div>
    </div>
    <div class="ratio-modal-tips">
      <div class="ow-tip-card">
        <ExclamationCircleOutlined />
        <span class="ow-tip-card__text">{{ $t('nodeMgmt.nodeRewardProportionTip') }}</span>
      </div>
      <div class="ow-tip-card">
        <ExclamationCircleOutlined />
        <span class="ow-tip-card__text">{{ $t('nodeMgmt.userRewardProportionTip') }}</span>
      </div>
      <div class="ow-tip-card">
        <ExclamationCircleOutlined />
        <span class="ow-tip-card__text">{{ $t('nodeMgmt.changesTakeEffect') }}</span>
      </div>
    </div>
  </a-modal>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'

const props = defineProps<{
  open: boolean
  peerCost: number
  stakeCost: number
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  'update:peerCost': [value: number]
  'update:stakeCost': [value: number]
  confirm: []
  cancel: []
}>()

const openModel = computed({
  get: () => props.open,
  set: (value) => emit('update:open', value),
})

const peerCostModel = computed({
  get: () => props.peerCost,
  set: (value) => emit('update:peerCost', value),
})

const stakeCostModel = computed({
  get: () => props.stakeCost,
  set: (value) => emit('update:stakeCost', value),
})
</script>

<style scoped lang="scss">
.reward-input {
  width: 60px;
}

.ratio-modal-form {
  display: flex;
  flex-direction: column;
  gap: var(--ow-space-4);
  margin-bottom: var(--ow-space-4);
}

.ratio-modal-row {
  display: flex;
  align-items: center;
  gap: var(--ow-space-3);
  flex-wrap: wrap;
}

.ratio-modal-label {
  min-width: 190px;
  margin: 0;
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

.ratio-modal-control {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-2);
}

.ratio-modal-tips {
  display: grid;
  gap: var(--ow-space-2);
}

.ratio-modal-tips :deep(.anticon) {
  margin-top: 2px;
  color: var(--ow-color-info);
}

@media (max-width: 720px) {
  .ratio-modal-label {
    min-width: 0;
  }
}
</style>
