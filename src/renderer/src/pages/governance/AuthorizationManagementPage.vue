<template>
  <div class="authorization-management-page ow-page ow-page--flush-top">
    <breadcrumb
      :current="$t('nodeMgmt.stakeAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="ow-two-panel-layout">
      <authorization-info-panel
        :node-name="currentNode.name"
        :wallet-address="stakeWallet?.address"
        :authorization-info="authorizationInfo"
        @new-stake="newStakeAuthorization"
        @cancel-authorization="cancelAuthorization"
        @switch-wallet="switchWallet"
        @refresh="handleRefresh"
        @redeem-ont="redeemOnt"
      />
      <authorization-rewards-panel
        :split-fee-amount-display="splitFeeAmountDisplay"
        :unbound-ong-display="unboundOngDisplay"
        @redeem-rewards="redeemRewards"
      />
    </div>
    <cancel-authorization-modal
      v-model:open="cancelVisible"
      :node-name="currentNode.name"
      :in-authorization="authorizationInfo.inAuthorization"
      v-model:cancel-amount="cancelAmount"
      :valid-cancel-amount="validCancelAmount"
      :cancel-unit-label="cancelUnitLabel"
      :cancel-amount-display="cancelAmountDisplay"
      @validate="validateCancelAmount"
      @ok="handleCancelAuthorizationOk"
      @cancel="handleCancelAuthorizationCancel"
    />
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
import AuthorizationInfoPanel from '../../workflows/governance/authorizationManagement/AuthorizationInfoPanel.vue'
import AuthorizationRewardsPanel from '../../workflows/governance/authorizationManagement/AuthorizationRewardsPanel.vue'
import CancelAuthorizationModal from '../../workflows/governance/authorizationManagement/CancelAuthorizationModal.vue'
import { useAuthorizationManagementPage } from '../../workflows/governance/useAuthorizationManagementPage'

defineOptions({
  name: 'AuthorizationManagementPage',
})

const {
  currentNode,
  stakeWallet,
  authorizationInfo,
  splitFeeAmountDisplay,
  unboundOngDisplay,
  signVisible,
  tx,
  cancelVisible,
  cancelAmount,
  cancelAmountDisplay,
  cancelUnitLabel,
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
