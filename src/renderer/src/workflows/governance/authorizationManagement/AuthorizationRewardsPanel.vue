<template>
  <section class="ow-panel authorization-panel">
    <header class="ow-panel-header">
      <p class="ow-panel-heading">{{ $t('nodeMgmt.rewards') }}</p>
    </header>

    <div class="ow-panel-body authorization-panel__body">
      <div class="ow-governance-highlight reward-primary">
        <div class="reward-meta">
          <span class="ow-governance-card__label label-with-icon">
            <a-tooltip placement="right" :title="$t('nodeMgmt.profitONG')">
              <InfoCircleOutlined />
            </a-tooltip>
            {{ $t('nodeMgmt.profit') }}
          </span>
          <span class="ow-governance-title reward-primary__amount">
            {{ splitFeeAmountDisplay }} ONG
          </span>
        </div>
        <div class="reward-primary__actions">
          <a-button type="primary" variant="accent" @click="emit('redeemRewards')">{{
            $t('nodeMgmt.redeem')
          }}</a-button>
        </div>
      </div>

      <div class="authorize-tip ow-tip-card">
        <InfoCircleFilled />
        <span class="ow-tip-card__text">{{ $t('nodeMgmt.rewardTip') }}</span>
      </div>

      <div class="ow-governance-card ow-governance-card--row reward-secondary">
        <span class="ow-governance-card__label label-with-icon">
          <a-tooltip placement="right" :title="$t('nodeMgmt.unboundONG')">
            <InfoCircleOutlined />
          </a-tooltip>
          {{ $t('nodeMgmt.unboundOng') }}
        </span>
        <span class="ow-governance-card__value">{{ unboundOngDisplay }} ONG</span>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import { InfoCircleFilled, InfoCircleOutlined } from '@ant-design/icons-vue'

defineProps<{
  splitFeeAmountDisplay: string
  unboundOngDisplay: string
}>()

const emit = defineEmits<{
  redeemRewards: []
}>()
</script>

<style scoped>
.authorization-panel__body {
  display: grid;
  gap: var(--ow-space-2);
}

.authorize-tip {
  margin-bottom: 0;
}

.label-with-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
}

.reward-meta {
  display: flex;
  flex-direction: column;
  gap: var(--ow-space-1);
}

.reward-primary {
  justify-items: stretch;
}

.reward-primary__actions {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ow-space-2);
  min-width: 0;
  text-align: right;
}

.reward-primary__amount {
  align-self: flex-end;
  text-align: right;
  white-space: nowrap;
}

.reward-secondary {
  margin-top: var(--ow-space-2);
}

@media (max-width: 840px) {
  .reward-primary__actions {
    width: 100%;
  }
}

@media (max-width: 640px) {
  .reward-secondary {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
