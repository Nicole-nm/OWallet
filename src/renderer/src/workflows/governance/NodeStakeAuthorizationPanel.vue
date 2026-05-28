<template>
  <div class="node-authorization-panel">
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
                class="input unit-input"
                :class="validUnit ? '' : 'error-input'"
                v-model:value="unit"
                @change="validateUnit"
              ></a-input>
              <span class="allowed-stake-suffix">ONT</span>
            </div>
            <a-button
              type="primary"
              variant="primary"
              class="confirm-authorization-btn"
              @click="confirmChangeAuthorization"
              >{{ $t('nodeMgmt.confirm') }}</a-button
            >
          </div>
        </div>
        <div class="content-row">
          <div class="content-column">
            <span class="content-column-label">{{ $t('nodeMgmt.yourStakeAmount') }}</span>
            <span class="content-column-value">{{ initPosStr }} ONT</span>
          </div>
          <div class="content-column">
            <span class="content-column-label">{{ $t('nodeMgmt.stakeLimit') }}</span>
            <span class="content-column-value">{{ maxStakeLimit }} ONT</span>
          </div>
        </div>
        <div class="content-row">
          <div class="content-column">
            <span class="content-column-label">{{ $t('nodeMgmt.userStakeAmount') }}</span>
            <span class="content-column-value">{{ currentPeer.totalPosStr }} ONT</span>
          </div>
          <div class="content-column">
            <span class="content-column-label">{{ $t('nodeMgmt.expectedUserStakeCap') }}</span>
            <span class="content-column-value">{{ peerAttributes.maxAuthorizeStr }} ONT</span>
          </div>
        </div>
      </div>
    </section>
    <section class="reward-proportion-section ow-panel">
      <div class="ow-panel-header reward-proportion-header">
        <div class="ow-panel-heading">
          {{ $t('nodeMgmt.rewardProportion') }}
        </div>
        <a-button type="primary" variant="primary" @click="editProportion">{{
          $t('nodeMgmt.edit')
        }}</a-button>
      </div>
      <div class="ow-panel-body reward-proportion-body">
        <div class="reward-proportion-grid">
          <div class="node-reward-proportion ow-panel ow-panel--muted ow-panel--compact">
            <p class="reward-proportion-title">
              {{ $t('nodeMgmt.nodeRewardProportion') }}
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.tPeerCost }}% ({{ $t('nodeMgmt.activeT') }})
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.t1PeerCost }}% ({{ $t('nodeMgmt.activeT1') }})
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.t2PeerCost }}% ({{ $t('nodeMgmt.activeT2') }})
            </p>
          </div>
          <div class="node-reward-proportion ow-panel ow-panel--muted ow-panel--compact">
            <p class="reward-proportion-title">
              {{ $t('nodeMgmt.userRewardProportion') }}
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.tStakeCost }}% ({{ $t('nodeMgmt.activeT') }})
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.t1StakeCost }}% ({{ $t('nodeMgmt.activeT1') }})
            </p>
            <p class="reward-proportion-line">
              {{ peerAttributes.t2StakeCost }}% ({{ $t('nodeMgmt.activeT2') }})
            </p>
          </div>
        </div>
      </div>
    </section>

    <div class="redeem-profit">
      <div class="redeem-item ow-panel ow-panel--compact">
        <span class="ow-info-label">{{ $t('nodeMgmt.profit') }}: </span>
        <span class="ow-info-value">{{ splitFee.amount }} ONG</span>
        <a-button type="primary" variant="accent" @click="redeemRewards">{{
          $t('nodeMgmt.redeem')
        }}</a-button>
      </div>
      <div class="redeem-item ow-panel ow-panel--compact">
        <span class="ow-info-label">{{ $t('nodeMgmt.unboundOng') }}: </span>
        <span class="ow-info-value">{{ peerUnboundOng }} ONG</span>
        <a-button type="primary" variant="accent" @click="redeemPeerUnboundOng">{{
          $t('nodeMgmt.redeem')
        }}</a-button>
      </div>
    </div>

    <sign-send-tx
      v-model:open="signVisible"
      :tx="tx"
      :wallet="stakeWallet"
      @signClose="handleCancel"
      @txSent="handleTxSent"
    ></sign-send-tx>

    <a-modal
      :title="$t('nodeMgmt.changeRewardProportion')"
      v-model:open="showEditProportion"
      @ok="confirmChangeCost"
      @cancel="handleCancelChangeCost"
    >
      <div class="ratio-modal-form">
        <div class="ratio-modal-row">
          <label class="ratio-modal-label">{{ $t('nodeMgmt.nodeRewardProportion') }}:</label>
          <div class="ratio-modal-control">
            <a-input-number :min="0" :max="100" class="reward-input" v-model:value="peerCost" />
            <span>%</span>
          </div>
        </div>
        <div class="ratio-modal-row">
          <label class="ratio-modal-label">{{ $t('nodeMgmt.userRewardProportion') }}:</label>
          <div class="ratio-modal-control">
            <a-input-number :min="0" :max="100" class="reward-input" v-model:value="stakeCost" />
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
  </div>
</template>

<script setup lang="ts">
import SignSendTx from './SignSendTxModal.vue'
import { useNodeStakeAuthorizationPanel } from './useNodeStakeAuthorizationPanel'
import { ExclamationCircleOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'NodeStakeAuthorization',
})

const {
  unit,
  validUnit,
  peerAttributes,
  confirmChangeAuthorization,
  initPosStr,
  maxStakeLimit,
  currentPeer,
  splitFee,
  redeemRewards,
  peerUnboundOng,
  redeemPeerUnboundOng,
  signVisible,
  tx,
  stakeWallet,
  handleCancel,
  handleTxSent,
  showEditProportion,
  peerCost,
  stakeCost,
  confirmChangeCost,
  handleCancelChangeCost,
  editProportion,
  validateUnit,
} = useNodeStakeAuthorizationPanel()
</script>

<style scoped>
.node-authorization-panel {
  width: min(100%, 820px);
  margin: 0 auto;
  padding: var(--ow-space-1) 0 var(--ow-space-1);
  display: flex;
  flex-direction: column;
  gap: var(--ow-space-2);
}

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

.reward-input {
  width: 60px;
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

.reward-proportion-section {
  overflow: hidden;
}

.reward-proportion-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-2);
  padding: var(--ow-space-3) var(--ow-space-4);
}

.reward-proportion-body {
  display: grid;
  gap: var(--ow-space-1);
  padding: var(--ow-space-3) var(--ow-space-4);
}

.reward-proportion-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-1);
}

.node-reward-proportion {
  padding: 10px 12px;
}

.redeem-profit {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
  gap: var(--ow-space-2);
}
.redeem-profit p {
  margin-bottom: 0;
}
.redeem-item {
  display: grid;
  grid-template-columns: max-content minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ow-space-2);
  width: 100%;
}
.redeem-item span:first-child {
  white-space: nowrap;
}

.redeem-item .ow-info-label {
  font-size: var(--ow-font-size-body);
}

.redeem-item .ow-info-value {
  min-width: 0;
  text-align: right;
  overflow-wrap: anywhere;
  word-break: break-word;
  font-variant-numeric: tabular-nums;
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.redeem-item button {
  margin-left: 0;
  white-space: nowrap;
}

.node-reward-proportion p {
  margin: 0;
}

.reward-proportion-title {
  margin-bottom: 1px !important;
  font-family: var(--ow-font-bold);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.reward-proportion-line {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
}

.reward-proportion-line + .reward-proportion-line {
  margin-top: 1px;
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

  .reward-proportion-header {
    flex-direction: column;
    align-items: stretch;
  }

  .reward-proportion-grid {
    grid-template-columns: 1fr;
  }

  .redeem-profit {
    grid-template-columns: 1fr;
  }

  .ratio-modal-label {
    min-width: 0;
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

  .redeem-item {
    grid-template-columns: 1fr;
    justify-items: flex-start;
  }
}
</style>
