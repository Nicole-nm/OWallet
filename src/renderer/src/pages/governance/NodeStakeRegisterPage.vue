<template>
  <div>
    <breadcrumb :current="$t('nodeStake.nodeStake')" @backEvent="handleRouteBack"></breadcrumb>
    <div class="nodeStake-container ow-form-panel">
      <form-field :label="$t('nodeStake.ontid')" label-tag="p">
        <p>{{ stakeDetail.ontid }}</p>
      </form-field>
      <form-field :label="$t('nodeStake.stakeWalletAddress')" label-tag="p">
        <p>{{ stakeDetail.stakeWalletAddress }}</p>
      </form-field>
      <form-field :label="$t('nodeStake.nodePk')" label-tag="p">
        <p>{{ stakeDetail.publicKey }}</p>
      </form-field>
      <form-field :label="$t('nodeStake.contract')" label-tag="p">
        <p>{{ stakeDetail.contract }}</p>
      </form-field>
      <form-field :label="$t('nodeStake.commitmentQuantity')" label-tag="p">
        <p>{{ stakeDetail.commitmentQuantity }}</p>
      </form-field>
      <form-field :label="$t('nodeStake.stakeQuantity')" label-tag="p">
        <a-input class="input ow-field-control" v-model:value="stakeQuantity"></a-input>
      </form-field>
    </div>
    <page-footer-actions align="center">
      <div class="btn-stake">
        <p class="stake-fee-tip"><InfoCircleOutlined /> {{ $t('nodeStake.feeTip') }}</p>
        <a-button type="primary" variant="primary" @click="handleStake">{{
          $t('nodeStake.stake')
        }}</a-button>
      </div>
    </page-footer-actions>
    <a-modal
      :title="$t('nodeStake.signWithOntid')"
      v-model:open="ontidPassModal"
      @ok="handleOntidSignOK"
      @cancel="handleOntidSignCancel"
    >
      <div>
        <p>{{ $t('nodeStake.enterOntidPass') }}</p>
        <a-input
          class="input"
          v-model:value="ontidPassword"
          :placeholder="$t('nodeStake.password')"
          type="password"
        ></a-input>
      </div>
    </a-modal>

    <a-modal
      :title="$t('nodeStake.signWithWallet')"
      v-model:open="walletPassModal"
      @ok="handleWalletSignOK"
      @cancel="handleWalletSignCancel"
    >
      <div v-if="(stakeWallet as { key?: string })?.key">
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
import FormField from '../../shared/ui/forms/FormField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useNodeStakeRegisterPage } from '../../workflows/governance/useNodeStakeRegisterPage'
import { InfoCircleOutlined } from '@ant-design/icons-vue'

defineOptions({
  name: 'NodeStakeRegisterPage',
})

const {
  handleRouteBack,
  stakeDetail,
  stakeQuantity,
  handleStake,
  ontidPassModal,
  handleOntidSignOK,
  handleOntidSignCancel,
  ontidPassword,
  walletPassModal,
  handleWalletSignOK,
  handleWalletSignCancel,
  walletPassword,
  stakeWallet,
  ledgerStatus,
} = useNodeStakeRegisterPage()
</script>

<style scoped>
.nodeStake-container :deep(.ow-form-item .ant-form-item-row) {
  flex-wrap: nowrap;
  align-items: flex-start;
}

.nodeStake-container :deep(.ow-form-item .ant-form-item-label) {
  flex: 0 0 180px;
  max-width: 180px;
}

.nodeStake-container :deep(.ow-form-item .ant-form-item-control) {
  min-width: 0;
}

.nodeStake-container :deep(.ow-form-item .ant-form-item-control-input-content > p) {
  margin: 0;
  overflow-wrap: anywhere;
}

.btn-stake {
  text-align: center;
  margin: 0 auto;
}

.btn-stake p {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-caption);
  margin-bottom: var(--ow-space-3);
  margin-top: var(--ow-space-1);
}
</style>
