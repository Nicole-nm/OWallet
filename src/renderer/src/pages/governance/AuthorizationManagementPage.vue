<template>
  <div class="authorization-management-page ow-page ow-page--flush-top">
    <breadcrumb
      :current="$t('nodeMgmt.stakeAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="ow-two-panel-layout">
      <section class="ow-panel authorization-panel">
        <header class="ow-panel-header panel-header">
          <div>
            <p class="ow-governance-eyebrow">{{ $t('nodeMgmt.nodeName') }}</p>
            <h2 class="ow-governance-title">{{ currentNode.name }}</h2>
          </div>
          <div class="ow-button-row ow-button-row--wrap ow-button-row--end authorization-actions">
            <a-button
              type="primary"
              variant="primary"
              class="new-stake"
              @click="newStakeAuthorization"
              >{{ $t('nodeMgmt.newStakeAuthorization') }}</a-button
            >
            <a-button
              type="default"
              variant="secondary"
              class="cancel-btn"
              @click="cancelAuthorization"
              >{{ $t('nodeMgmt.cancelAuthorization') }}</a-button
            >
          </div>
        </header>

        <div class="ow-panel-body authorization-panel__body">
          <div class="ow-kv-panel authorization-kv">
            <div class="ow-kv-row">
              <span class="ow-kv-label">{{ $t('nodeMgmt.walletAddress') }}</span>
              <div class="ow-kv-value authorization-kv-value">
                <span>{{ stakeWallet?.address }}</span>
                <a-tooltip placement="top" :title="$t('nodeMgmt.switchWallet')">
                  <span class="ow-icon-action" @click="switchWallet"><SyncOutlined /></span>
                </a-tooltip>
              </div>
            </div>
            <div class="ow-kv-row">
              <span class="ow-kv-label">{{ $t('nodeMgmt.inAuthorization') }}</span>
              <div class="ow-kv-value authorization-kv-value">
                <span>{{ authorizationInfo.inAuthorization }} ONT</span>
                <a-tooltip placement="top" :title="$t('nodeMgmt.refresh')">
                  <button type="button" class="ow-icon-action refresh-icon" @click="handleRefresh">
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
                  <a-button type="primary" variant="accent" @click="redeemOnt">{{
                    $t('nodeMgmt.redeem')
                  }}</a-button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
      <section class="ow-panel authorization-panel">
        <header class="ow-panel-header">
          <p class="ow-panel-heading">{{ $t('nodeMgmt.rewards') }}</p>
        </header>

        <div class="ow-panel-body authorization-panel__body">
          <div class="ow-governance-highlight">
            <div class="reward-meta">
              <span class="ow-governance-card__label label-with-icon">
                <a-tooltip placement="right" :title="$t('nodeMgmt.profitONG')">
                  <InfoCircleOutlined />
                </a-tooltip>
                {{ $t('nodeMgmt.profit') }}
              </span>
              <span class="ow-governance-title">{{ splitFee.amount }} ONG</span>
            </div>
            <div class="ow-governance-actions ow-governance-actions--start">
              <a-button type="primary" variant="accent" @click="redeemRewards">{{
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
            <span class="ow-governance-card__value">{{ unboundOng }} ONG</span>
          </div>
        </div>
      </section>
    </div>
    <a-modal
      :title="$t('nodeMgmt.cancelAuthorization')"
      v-model:open="cancelVisible"
      @ok="handleCancelAuthorizationOk"
      @cancel="handleCancelAuthorizationCancel"
    >
      <div>
        <div class="ow-info-row">
          <span class="ow-info-label">{{ $t('nodeMgmt.nodeName') }}: </span>
          <span class="ow-info-value">{{ currentNode.name }}</span>
        </div>
        <div class="in-authorization ow-info-row">
          <span class="ow-info-label">{{ $t('nodeMgmt.inAuthorization') }}: </span>
          <span class="ow-info-value">{{ authorizationInfo.inAuthorization }} ONT</span>
        </div>
        <div class="ow-info-row">
          <span class="ow-info-label">{{ $t('nodeMgmt.unitToCancel') }}: </span>
          <a-input
            class="input cancel-stake-input"
            :class="validCancelAmount ? '' : 'error-input'"
            v-model:value="cancelAmount"
            @change="validateCancelAmount"
          ></a-input>
          <span class="ow-info-value">{{ $t('nodeMgmt.cancelUnits') }}</span>
        </div>
        <div class="ow-info-row">
          <span class="ow-info-label">{{ $t('nodeMgmt.amountToCancel') }}: </span>
          <span class="ow-info-value">{{ cancelAmount }} ONT</span>
        </div>
      </div>
    </a-modal>
    <sign-send-tx
      v-model:open="signVisible"
      :tx="tx"
      :wallet="stakeWallet"
      @signClose="handleCancel"
      @txSent="handleTxSent"
    ></sign-send-tx>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SignSendTx from '../../workflows/governance/SignSendTxModal.vue'
import {
  SyncOutlined,
  ReloadOutlined,
  InfoCircleFilled,
  InfoCircleOutlined,
} from '@ant-design/icons-vue'
import { useAuthorizationManagementPage } from '../../workflows/governance/useAuthorizationManagementPage'

defineOptions({
  name: 'AuthorizationManagementPage',
})

const {
  currentNode,
  stakeWallet,
  splitFee,
  authorizationInfo,
  unboundOng,
  signVisible,
  tx,
  cancelVisible,
  cancelAmount,
  validCancelAmount,
  handleRouteBack,
  newStakeAuthorization,
  switchWallet,
  handleRefresh,
  handleCancel,
  handleTxSent,
  validateCancelAmount,
  handleCancelAuthorizationOk,
  handleCancelAuthorizationCancel,
  redeemRewards,
  cancelAuthorization,
  redeemOnt,
} = useAuthorizationManagementPage()
</script>

<style scoped>
.panel-header {
  align-items: flex-start;
}

.authorization-actions {
  width: min(100%, 380px);
  margin-left: auto;
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

.refresh-icon {
  padding: 0;
}

.new-stake {
  margin: 0;
  border-radius: var(--ow-radius-control);
  flex: 1 1 180px;
  min-width: 180px;
}

.authorize-tip {
  margin-bottom: 0;
}

.cancel-btn {
  margin: 0;
  border-radius: var(--ow-radius-control);
  flex: 1 1 180px;
  min-width: 180px;
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

.reward-secondary {
  margin-top: var(--ow-space-2);
}

.cancel-stake-input {
  width: 200px;
}

@media (max-width: 840px) {
  .panel-header,
  .authorization-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .authorization-actions {
    width: 100%;
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

  .reward-secondary {
    align-items: flex-start;
    flex-direction: column;
  }
}
</style>
