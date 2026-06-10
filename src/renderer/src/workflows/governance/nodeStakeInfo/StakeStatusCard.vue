<template>
  <section class="stake-progress-card ow-panel ow-panel--compact">
    <div class="stake-progress">
      <a-steps progressDot :current="currentStep">
        <a-step></a-step>
        <a-step></a-step>
        <a-step></a-step>
      </a-steps>
      <div
        class="step-item-container"
        :class="{ 'step-item-container--loading': !stakeStatusLoaded }"
      >
        <div>{{ statusStep1 }}</div>
        <div>{{ statusStep2 }}</div>
        <div>{{ statusStep3 }}</div>
      </div>
    </div>
    <div v-if="statusTip" class="stake-status-tip ow-tip-card">
      <InfoCircleOutlined />
      <span class="ow-tip-card__text">{{ statusTip }}</span>
    </div>
  </section>
</template>

<script setup lang="ts">
import { InfoCircleOutlined } from '@ant-design/icons-vue'

defineProps<{
  currentStep: number
  statusStep1: string
  statusStep2: string
  statusStep3: string
  stakeStatusLoaded: boolean
  statusTip: string
}>()
</script>

<style scoped lang="scss">
.stake-progress-card {
  margin-bottom: var(--ow-space-2);
}

.stake-progress {
  margin-bottom: 0;
}

.step-item-container {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-top: 6px;
  margin-bottom: var(--ow-space-2);
  min-height: 20px;
}

.step-item-container div {
  width: 30%;
  min-height: 20px;
  display: flex;
  align-items: flex-start;
  justify-content: center;
  text-align: center;
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-small);
  line-height: 1.25;
}

.step-item-container--loading div {
  visibility: hidden;
}

.stake-progress :deep(.ant-steps) {
  margin-bottom: 0;
}

.stake-status-tip {
  margin-top: var(--ow-space-2);
}

.stake-status-tip :deep(.anticon) {
  margin-top: 2px;
  color: var(--ow-color-info);
}

@media (max-width: 720px) {
  .step-item-container {
    flex-direction: column;
    gap: var(--ow-space-1);
  }

  .step-item-container div {
    width: 100%;
  }
}
</style>
