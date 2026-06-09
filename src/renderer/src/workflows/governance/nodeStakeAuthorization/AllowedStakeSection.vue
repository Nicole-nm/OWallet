<template>
  <section class="stake-content ow-panel">
    <div class="ow-panel-header">
      <div class="ow-panel-heading">{{ $t('nodeMgmt.allowStakes') }}</div>
    </div>
    <div class="ow-panel-body stake-content__body">
      <div class="allowed-stake">
        <div class="allowed-stake-row">
          <div class="allowed-stake-input-group">
            <span class="allowed-stake-label">{{ $t('nodeMgmt.allowedStakeUnits') }}: </span>
            <a-input
              class="ow-input unit-input"
              :class="validUnit ? '' : 'ow-error-input'"
              v-model:value="unitModel"
              @change="emit('validateUnit')"
            ></a-input>
            <span class="allowed-stake-suffix">ONT</span>
          </div>
          <a-button
            type="primary"
            variant="primary"
            class="confirm-authorization-btn"
            @click="emit('confirm')"
            >{{ $t('nodeMgmt.confirm') }}</a-button
          >
        </div>
      </div>
      <div class="content-row">
        <div class="content-column">
          <span class="content-column-label">{{ $t('nodeMgmt.yourStakeAmount') }}</span>
          <span class="content-column-value">{{ initPosDisplay }} ONT</span>
        </div>
        <div class="content-column">
          <span class="content-column-label">{{ $t('nodeMgmt.stakeLimit') }}</span>
          <span class="content-column-value">{{ maxStakeLimit }} ONT</span>
        </div>
      </div>
      <div class="content-row">
        <div class="content-column">
          <span class="content-column-label">{{ $t('nodeMgmt.userStakeAmount') }}</span>
          <span class="content-column-value">{{ totalPosDisplay }} ONT</span>
        </div>
        <div class="content-column">
          <span class="content-column-label">{{ $t('nodeMgmt.expectedUserStakeCap') }}</span>
          <span class="content-column-value">{{ maxAuthorizeDisplay }} ONT</span>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { computed } from 'vue'

const props = defineProps<{
  unit: number
  validUnit: boolean
  initPosDisplay: string
  maxStakeLimit: string
  totalPosDisplay: string
  maxAuthorizeDisplay: string
}>()

const emit = defineEmits<{
  'update:unit': [value: number]
  validateUnit: []
  confirm: []
}>()

const unitModel = computed({
  get: () => props.unit,
  set: (value) => emit('update:unit', value),
})
</script>

<style scoped>
.stake-content {
  overflow: hidden;
}

.stake-content .ow-panel-header {
  padding: var(--ow-space-3) var(--ow-space-4);
}

.stake-content__body {
  display: grid;
  gap: var(--ow-space-1);
  padding: var(--ow-space-3) var(--ow-space-4);
}

.allowed-stake {
  margin: 0 0 var(--ow-space-1);
  padding-bottom: var(--ow-space-1);
  border-bottom: 1px solid var(--ow-color-border-default);
}

.content-row {
  display: flex;
  width: 100%;
  margin-bottom: 0;
  padding-bottom: 0;
  border-bottom: 0;
}

.content-row + .content-row {
  margin-top: 2px;
  padding-top: var(--ow-space-1);
  border-top: 1px solid var(--ow-color-border-default);
}

.content-row div:first-child {
  border-right: 1px solid var(--ow-color-border-default);
}

.content-column {
  flex-basis: 50%;
  padding: 1px var(--ow-space-2);
  display: flex;
  flex-direction: column;
  gap: 1px;
}

.content-column-label {
  font-size: var(--ow-font-size-body);
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
}

.allowed-stake-label {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

.content-column-value {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.unit-input {
  width: 180px;
  max-width: 100%;
  height: var(--ow-button-height-compact) !important;
}

.unit-input :deep(.ant-input) {
  font-variant-numeric: tabular-nums;
}

.allowed-stake-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-2);
}

.allowed-stake-input-group {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  flex-wrap: wrap;
  gap: 6px var(--ow-space-2);
}

.allowed-stake-label,
.allowed-stake-suffix {
  font-size: var(--ow-font-size-body);
}

.allowed-stake-suffix {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
}

.confirm-authorization-btn {
  margin-left: auto;
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .allowed-stake-row {
    flex-direction: column;
    align-items: stretch;
  }

  .allowed-stake-input-group {
    width: 100%;
  }

  .confirm-authorization-btn {
    margin-left: auto;
  }
}

@media (max-width: 640px) {
  .content-row {
    flex-direction: column;
  }

  .content-row div:first-child {
    border-right: 0;
    border-bottom: 1px solid var(--ow-color-border-default);
    padding-bottom: var(--ow-space-2);
    margin-bottom: var(--ow-space-2);
  }
}
</style>
