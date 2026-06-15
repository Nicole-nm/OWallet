<template>
  <div class="node-authorization-panel">
    <allowed-stake-section
      v-model:unit="unit"
      :valid-unit="validUnit"
      :init-pos-display="initPosDisplay"
      :max-stake-limit="maxStakeLimit"
      :total-pos-display="totalPosDisplay"
      :max-authorize-display="maxAuthorizeDisplay"
      @validate-unit="validateUnit"
      @confirm="confirmChangeAuthorization"
    />

    <reward-proportion-section :peer-attributes="peerAttributes" @edit="editProportion" />

    <redeem-profit-section
      :peer-unbound-ong-display="peerUnboundOngDisplay"
      :split-fee-amount-display="splitFeeAmountDisplay"
      @redeem-unbound-ong="redeemPeerUnboundOng"
      @redeem-rewards="redeemRewards"
    />

    <sign-send-tx
      v-model:open="signVisible"
      :tx="tx"
      :wallet="stakeWallet"
      @signClose="handleCancel"
      @txSent="handleTxSent"
    ></sign-send-tx>

    <edit-reward-proportion-modal
      v-model:open="showEditProportion"
      v-model:peer-cost="peerCost"
      v-model:stake-cost="stakeCost"
      @confirm="confirmChangeCost"
      @cancel="handleCancelChangeCost"
    />
  </div>
</template>

<script setup lang="ts">
import SignSendTx from './SignSendTxModal.vue'
import AllowedStakeSection from './nodeStakeAuthorization/AllowedStakeSection.vue'
import RewardProportionSection from './nodeStakeAuthorization/RewardProportionSection.vue'
import RedeemProfitSection from './nodeStakeAuthorization/RedeemProfitSection.vue'
import EditRewardProportionModal from './nodeStakeAuthorization/EditRewardProportionModal.vue'
import { useNodeStakeAuthorizationPanel } from './useNodeStakeAuthorizationPanel'

defineOptions({
  name: 'NodeStakeAuthorization',
})

const {
  unit,
  validUnit,
  peerAttributes,
  confirmChangeAuthorization,
  initPosDisplay,
  maxStakeLimit,
  totalPosDisplay,
  maxAuthorizeDisplay,
  splitFeeAmountDisplay,
  redeemRewards,
  peerUnboundOngDisplay,
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

<style scoped lang="scss">
.node-authorization-panel {
  width: min(100%, 860px);
  margin: 0 auto;
  padding: var(--ow-space-1) 0 var(--ow-space-1);
  display: flex;
  flex-direction: column;
  gap: var(--ow-space-2);
}
</style>
