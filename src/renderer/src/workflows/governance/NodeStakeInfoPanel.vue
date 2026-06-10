<template>
  <div>
    <breadcrumb
      v-if="!breadcrumb"
      :current="$t('nodeStake.nodeStake')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="nodeStake-container">
      <stake-status-card
        :current-step="currentStep"
        :status-step1="statusStep1"
        :status-step2="statusStep2"
        :status-step3="statusStep3"
        :stake-status-loaded="stakeStatusLoaded"
        :status-tip="statusTip"
      />

      <stake-summary-grid
        :commitment-quantity-display="commitmentQuantityDisplay"
        :stake-quantity-display="stakeQuantityDisplay"
        :claimable-quantity-display="claimableQuantityDisplay"
      />

      <stake-detail-panel
        :stake-wallet-address="detail.stakeWalletAddress"
        :node-public-key="nodePublicKey"
        :contract="detail.contract"
      />

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

    <stake-amount-modal
      v-model:open="addPosVisible"
      title-key="nodeMgmt.addInitPos"
      label-key="nodeMgmt.amountToAdd"
      :valid="validAddPos"
      v-model:value="addPos"
      @validate="validateAddPos"
      @ok="handleAddPosOk"
      @cancel="handleAddPosCancel"
    />

    <stake-amount-modal
      v-model:open="reducePosVisible"
      title-key="nodeMgmt.reduceInitPos"
      label-key="nodeMgmt.amountToReduce"
      :valid="validReducePos"
      v-model:value="reducePos"
      @validate="validateReducePos"
      @ok="handleReducePosOk"
      @cancel="handleReducePosCancel"
    />

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
          <span class="ow-kv-value">{{ lockedQuantityDisplay }} ONT</span>
        </div>
        <div class="ow-kv-row">
          <span class="ow-kv-label">{{ $t('nodeMgmt.initPosRedeemable') }}</span>
          <span class="ow-kv-value">{{ claimableQuantityDisplay }} ONT</span>
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
          class="ow-input"
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
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import StakeStatusCard from './nodeStakeInfo/StakeStatusCard.vue'
import StakeSummaryGrid from './nodeStakeInfo/StakeSummaryGrid.vue'
import StakeDetailPanel from './nodeStakeInfo/StakeDetailPanel.vue'
import StakeAmountModal from './nodeStakeInfo/StakeAmountModal.vue'

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
  stakeStatusLoaded,
  detail,
  nodePublicKey,
  currentPeer,
  commitmentQuantityDisplay,
  stakeQuantityDisplay,
  lockedQuantityDisplay,
  claimableQuantityDisplay,
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

<style scoped lang="scss">
.nodeStake-container {
  width: min(100%, 820px);
  margin: 0 auto;
  padding-top: var(--ow-space-1);
  padding-bottom: calc(var(--ow-space-4) + 5.3rem);
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

@media (max-width: 720px) {
  .nodeStake-container {
    width: 100%;
  }

  .initPos-btns {
    justify-content: stretch;
  }

  .initPos-btns button {
    width: 100%;
  }
}
</style>
