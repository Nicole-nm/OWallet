<template>
  <div>
    <breadcrumb
      v-if="!breadcrumb"
      :current="$t('nodeStake.nodeStake')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="nodeStake-container">
      <section class="stake-progress-card ow-panel ow-panel--compact">
        <div class="stake-progress">
          <a-steps progressDot :current="currentStep">
            <a-step></a-step>
            <a-step></a-step>
            <a-step></a-step>
          </a-steps>
          <div class="step-item-container">
            <div>
              {{ statusStep1 }}
            </div>
            <div>
              {{ statusStep2 }}
            </div>
            <div>
              {{ statusStep3 }}
            </div>
          </div>
        </div>
        <div v-if="statusTip" class="stake-status-tip ow-tip-card">
          <InfoCircleOutlined />
          <span class="ow-tip-card__text">{{ statusTip }}</span>
        </div>
      </section>

      <section class="stake-summary-grid ow-stat-grid">
        <article class="stake-summary-card ow-stat-card">
          <span class="ow-stat-label">{{ $t('nodeStake.commitmentQuantity') }}</span>
          <p class="ow-stat-value">{{ detail.commitmentQuantity }}</p>
        </article>
        <article class="stake-summary-card ow-stat-card">
          <span class="ow-stat-label">{{ $t('nodeStake.stakeQuantity') }}</span>
          <p class="ow-stat-value">{{ currentPeer.initPos }}</p>
        </article>
        <article class="stake-summary-card ow-stat-card">
          <span class="ow-stat-label">{{ $t('nodeStake.claimableQuantity') }}</span>
          <p class="ow-stat-value">{{ authorizationInfo.claimable }}</p>
        </article>
      </section>

      <section class="stake-detail-panel ow-panel">
        <div class="ow-panel-body ow-kv-panel">
          <div class="ow-kv-row stake-detail-row">
            <span class="ow-kv-label">{{ $t('nodeStake.stakeWalletAddress') }}</span>
            <span class="ow-kv-value">{{ detail.stakeWalletAddress }}</span>
          </div>
          <div class="ow-kv-row stake-detail-row">
            <span class="ow-kv-label">{{ $t('nodeStake.nodePk') }}</span>
            <span class="ow-kv-value">{{ nodePublicKey }}</span>
          </div>
          <div class="ow-kv-row stake-detail-row">
            <span class="ow-kv-label">{{ $t('nodeStake.contract') }}</span>
            <span class="ow-kv-value">{{ detail.contract }}</span>
          </div>
        </div>
      </section>

      <!-- 只有成为节点后可以操作初始质押部分 -->
      <div
        class="initPos-btns ow-button-row ow-button-row--end ow-button-row--wrap"
        v-if="detail.status === 8"
      >
        <a-button variant="accent" @click="handleAddInitPos">{{
          $t('nodeMgmt.addInitPos')
        }}</a-button>
        <a-button
          variant="accent"
          @click="handleReduceInitPos"
          v-if="currentPeer.initPos > detail.commitmentQuantity"
          >{{ $t('nodeMgmt.reduceInitPos') }}</a-button
        >
        <a-button variant="accent" @click="openRedeemPosModal">{{
          $t('nodeMgmt.redeemInitPos')
        }}</a-button>
      </div>
    </div>
    <page-footer-actions align="between">
      <a-button @click="handleBack" type="default" variant="secondary">{{
        $t('nodeStake.back')
      }}</a-button>
      <div class="ow-button-row ow-button-row--end ow-button-row--wrap">
        <a-button @click="handleRecall" variant="primary" v-if="detail.status === 2">{{
          $t('nodeStake.recall')
        }}</a-button>
        <a-button
          @click="handleRefund"
          variant="primary"
          v-if="detail.status === 4 || detail.status === 3 || detail.status === 7"
          :disabled="refundClicked"
          >{{ $t('nodeStake.refund') }}</a-button
        >
        <a-button @click="handleQuitNode" variant="primary" v-if="detail.status === 8">{{
          $t('nodeStake.quitNode')
        }}</a-button>
        <a-button
          @click="handleNewStake"
          variant="primary"
          v-if="detail.status === 6 || detail.status === 1"
          >{{ $t('nodeStake.newStake') }}</a-button
        >
      </div>
    </page-footer-actions>

    <a-modal
      :title="$t('nodeMgmt.addInitPos')"
      v-model:open="addPosVisible"
      @ok="handleAddPosOk"
      @cancel="handleAddPosCancel"
    >
      <div class="ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.amountToAdd') }}: </span>
        <a-input
          class="input add-pos-input"
          :class="validAddPos ? '' : 'error-input'"
          v-model:value="addPos"
          @change="validateAddPos"
        ></a-input>
        <span class="ow-info-value">ONT</span>
      </div>
    </a-modal>

    <a-modal
      :title="$t('nodeMgmt.reduceInitPos')"
      v-model:open="reducePosVisible"
      @ok="handleReducePosOk"
      @cancel="handleReducePosCancel"
    >
      <div class="ow-info-row">
        <span class="ow-info-label">{{ $t('nodeMgmt.amountToReduce') }}: </span>
        <a-input
          class="input add-pos-input"
          :class="validReducePos ? '' : 'error-input'"
          v-model:value="reducePos"
          @change="validateReducePos"
        ></a-input>
        <span class="ow-info-value">ONT</span>
      </div>
    </a-modal>

    <a-modal
      :title="$t('nodeMgmt.redeemInitPos')"
      v-model:open="redeemPosVisible"
      :okText="$t('nodeMgmt.redeemInitPosOk')"
      @ok="handleRedeemPosOk"
      @cancel="handleRedeemPosCancel"
    >
      <div class="stake-modal-summary ow-kv-panel">
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.initPosInLock') }}</span>
          <span class="ow-kv-value">{{ authorizationInfo.locked }} ONT</span>
        </div>
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.initPosRedeemable') }}</span>
          <span class="ow-kv-value">{{ authorizationInfo.claimable }} ONT</span>
        </div>
      </div>
    </a-modal>

    <a-modal
      :title="$t('nodeStake.signWithWallet')"
      v-model:open="walletPassModal"
      @ok="handleWalletSignOK"
      @cancel="handleWalletSignCancel"
    >
      <div v-if="(stakeWallet as { key?: string })?.key">
        <p v-if="isQuit">{{ $t('nodeStake.quitWarmMsg') }}</p>
        <br />
        <p>{{ $t('nodeStake.enterWalletPass') }}</p>
        <a-input
          class="input"
          v-model:value="walletPassword"
          :placeholder="$t('nodeStake.password')"
          type="password"
        ></a-input>
      </div>
      <div v-if="!(stakeWallet as { key?: string })?.key">
        <ledger-status-notice :status="ledgerStatus" compact />
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useNodeStakeInfoPanel } from './useNodeStakeInfoPanel'
import { InfoCircleOutlined } from '@ant-design/icons-vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'

defineOptions({
  name: 'NodeStakeInfo',
})

defineProps({
  showPosBtn: {
    type: Boolean,
    default: false,
  },
  breadcrumb: {
    type: Boolean,
    default: false,
  },
})

const {
  handleRouteBack,
  currentStep,
  statusStep1,
  statusStep2,
  statusStep3,
  detail,
  nodePublicKey,
  currentPeer,
  authorizationInfo,
  handleAddInitPos,
  handleReduceInitPos,
  openRedeemPosModal,
  redeemPosVisible,
  statusTip,
  handleBack,
  handleRecall,
  handleRefund,
  refundClicked,
  handleQuitNode,
  handleNewStake,
  addPosVisible,
  handleAddPosOk,
  handleAddPosCancel,
  validAddPos,
  addPos,
  validateAddPos,
  reducePosVisible,
  handleReducePosOk,
  handleReducePosCancel,
  validReducePos,
  reducePos,
  validateReducePos,
  handleRedeemPosOk,
  handleRedeemPosCancel,
  walletPassModal,
  handleWalletSignOK,
  handleWalletSignCancel,
  stakeWallet,
  isQuit,
  walletPassword,
  ledgerStatus,
} = useNodeStakeInfoPanel()
</script>

<style scoped>
.nodeStake-container {
  width: min(100%, 820px);
  margin: 0 auto;
  padding-top: var(--ow-space-1);
  padding-bottom: calc(var(--ow-space-4) + 5.3rem);
}

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

.stake-progress :deep(.ant-steps) {
  margin-bottom: 0;
}

.stake-summary-grid {
  grid-template-columns: repeat(3, minmax(0, 1fr));
  margin-bottom: var(--ow-space-2);
}

.stake-summary-card {
  display: flex;
  flex-direction: column;
  gap: 6px;
  min-height: 92px;
}

.stake-detail-panel {
  margin-bottom: var(--ow-space-2);
}

.stake-status-tip {
  margin-top: var(--ow-space-2);
}

.stake-modal-summary {
  gap: 0;
}

.initPos-btns {
  margin: var(--ow-space-2) auto 0;
  width: 100%;
  max-width: 820px;
  padding-bottom: var(--ow-space-1);
}

.initPos-btns button {
  margin-right: 0;
  margin-bottom: 0;
}

.stake-status-tip :deep(.anticon) {
  margin-top: 2px;
  color: var(--ow-color-info);
}

.add-pos-input {
  width: 200px;
}

@media (max-width: 720px) {
  .nodeStake-container {
    width: 100%;
  }

  .stake-summary-grid {
    grid-template-columns: 1fr;
  }

  .initPos-btns {
    justify-content: stretch;
  }

  .initPos-btns button {
    width: 100%;
  }

  .step-item-container {
    flex-direction: column;
    gap: var(--ow-space-1);
  }

  .step-item-container div {
    width: 100%;
  }
}
</style>
