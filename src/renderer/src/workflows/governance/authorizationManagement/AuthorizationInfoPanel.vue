<template>
  <section class="ow-panel authorization-panel">
    <header class="ow-panel-header panel-header">
      <div>
        <p class="ow-governance-eyebrow">{{ $t('nodeMgmt.nodeName') }}</p>
        <h2 class="ow-governance-title">{{ nodeName }}</h2>
      </div>
      <div class="ow-button-row ow-button-row--wrap ow-button-row--end authorization-actions">
        <a-button type="primary" variant="primary" class="new-stake" @click="emit('newStake')">{{
          $t('nodeMgmt.newStakeAuthorization')
        }}</a-button>
        <a-button
          type="default"
          variant="secondary"
          class="cancel-btn"
          @click="emit('cancelAuthorization')"
          >{{ $t('nodeMgmt.cancelAuthorization') }}</a-button
        >
      </div>
    </header>

    <div class="ow-panel-body authorization-panel__body">
      <div class="ow-kv-panel authorization-kv">
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.walletAddress') }}</span>
          <div class="ow-kv-value authorization-kv-value">
            <span>{{ walletAddress }}</span>
            <a-tooltip placement="top" :title="$t('nodeMgmt.switchWallet')">
              <span class="ow-icon-action" @click="emit('switchWallet')"><SyncOutlined /></span>
            </a-tooltip>
          </div>
        </div>
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.inAuthorization') }}</span>
          <div class="ow-kv-value authorization-kv-value">
            <span>{{ authorizationInfo.inAuthorization }} ONT</span>
            <a-tooltip placement="top" :title="$t('nodeMgmt.refresh')">
              <button
                type="button"
                class="ow-icon-action authorization-refresh-action"
                @click="emit('refresh')"
              >
                <ReloadOutlined />
              </button>
            </a-tooltip>
          </div>
        </div>
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.getProfitPart') }}</span>
          <span class="ow-kv-value">{{ authorizationInfo.receiveProfitPortion }} ONT</span>
        </div>
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.newStakePart') }}</span>
          <span class="ow-kv-value">{{ authorizationInfo.newStakePortion }} ONT</span>
        </div>
      </div>

      <div class="authorize-tip ow-tip-card">
        <InfoCircleFilled />
        <span class="ow-tip-card__text">{{ $t('nodeMgmt.authorizeTip') }}</span>
      </div>

      <div class="panel-section">
        <p class="ow-panel-title authorization-section-title">
          {{ $t('nodeMgmt.claimable') }}
        </p>
        <div class="ow-kv-panel authorization-kv">
          <div class="ow-kv-row">
            <span class="ow-kv-label label-with-icon">
              <a-tooltip placement="right" :title="$t('nodeMgmt.lockedONT')">
                <InfoCircleOutlined />
              </a-tooltip>
              {{ $t('nodeMgmt.locked') }}
            </span>
            <span class="ow-kv-value">{{ authorizationInfo.locked }} ONT</span>
          </div>
          <div class="ow-kv-row">
            <span class="ow-kv-label">{{ $t('nodeMgmt.claimable') }}</span>
            <div class="ow-kv-value authorization-kv-value authorization-kv-value--action">
              <span>{{ authorizationInfo.claimable }} ONT</span>
              <a-button type="primary" variant="accent" @click="emit('redeemOnt')">{{
                $t('nodeMgmt.redeem')
              }}</a-button>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<script setup lang="ts">
import {
  SyncOutlined,
  ReloadOutlined,
  InfoCircleFilled,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'
import type { AuthorizationInfo } from '../../../shared/types'

defineProps<{
  nodeName: unknown
  walletAddress: string | undefined
  authorizationInfo: AuthorizationInfo
}>()

const emit = defineEmits<{
  newStake: []
  cancelAuthorization: []
  switchWallet: []
  refresh: []
  redeemOnt: []
}>()
</script>

<style scoped lang="scss">
.panel-header {
  align-items: flex-start;
}

.authorization-actions {
  width: min(100%, 240px);
  margin-left: auto;
  flex-direction: column;
  align-items: stretch;
}

.authorization-panel__body {
  display: grid;
  gap: var(--ow-space-2);
}

.authorization-kv {
  gap: 0;
}

.authorization-kv :deep(.ow-kv-row) {
  grid-template-columns: minmax(205px, 0.52fr) minmax(0, 1fr);
  gap: var(--ow-space-3);
  padding: 10px 0;
}

.authorization-kv :deep(.ow-kv-label) {
  white-space: nowrap;
}

.authorization-kv-value {
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-2);
  width: 100%;
  min-width: 0;
}

.authorization-kv-value > span:first-child {
  min-width: 0;
  overflow-wrap: anywhere;
}

.authorization-kv-value--action {
  align-items: center;
}

.authorization-kv-value--action .ant-btn {
  flex-shrink: 0;
}

.panel-section {
  padding-top: var(--ow-space-2);
  border-top: 1px solid var(--ow-color-border-subtle);
}

.authorization-section-title {
  margin-bottom: var(--ow-space-1);
}

.authorization-refresh-action {
  padding: 0;
}

.new-stake {
  margin: 0;
  border-radius: var(--ow-radius-control);
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}

.authorize-tip {
  margin-bottom: 0;
}

.cancel-btn {
  margin: 0;
  border-radius: var(--ow-radius-control);
  flex: 0 0 auto;
  width: 100%;
  min-width: 0;
}

.label-with-icon {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
}

@media (max-width: 840px) {
  .panel-header,
  .authorization-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .authorization-actions {
    width: min(100%, 240px);
    justify-content: flex-start;
    margin-left: 0;
  }
}

@media (max-width: 640px) {
  .authorization-kv :deep(.ow-kv-row) {
    grid-template-columns: 1fr;
    gap: var(--ow-space-1);
  }

  .authorization-kv :deep(.ow-kv-label) {
    white-space: normal;
  }
}
</style>
