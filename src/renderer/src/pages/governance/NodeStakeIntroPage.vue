<template>
  <div>
    <breadcrumb :current="$t('nodeStake.nodeStake')" @backEvent="handleRouteBack"></breadcrumb>
    <div class="ow-form-panel intro-content">
      <form-field :label="$t('nodeStake.selectOntid')" label-tag="p">
        <a-select
          :options="identities"
          class="ow-field-control"
          @change="changeIdentity"
        ></a-select>
      </form-field>
      <form-field :label="$t('nodeStake.selectStakeWallet')" label-tag="p">
        <div class="ow-choice-stack">
          <a-radio-group
            @change="changePayerWallet"
            v-model:value="payerWalletType"
            class="ow-choice-options payer-wallet-options"
          >
            <a-radio value="commonWallet">{{ $t('createIdentity.commonWallet') }}</a-radio>
            <a-radio value="ledgerWallet">{{ $t('createIdentity.ledgerWallet') }}</a-radio>
          </a-radio-group>

          <div class="ow-choice-panel">
            <wallet-select-field
              v-if="payerWalletType === 'commonWallet'"
              :options="normalWallet"
              v-model:value="payerWalletValue"
              :placeholder="$t('createIdentity.selectCommonWallet')"
              @walletSelected="handleChangePayer"
            >
            </wallet-select-field>

            <ledger-status-notice
              v-else
              class="payer-ledger-status"
              :status="ledgerStatus"
              compact
            />
          </div>
        </div>
      </form-field>
    </div>
    <page-footer-actions align="center">
      <a-button type="primary" variant="primary" @click="next">{{ $t('nodeStake.next') }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import FormField from '../../shared/ui/forms/FormField.vue'
import WalletSelectField from '../../shared/ui/forms/WalletSelectField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useNodeStakeIntroPage } from '../../workflows/governance/useNodeStakeIntroPage'

defineOptions({
  name: 'NodeStakeIntroPage',
})

const {
  handleRouteBack,
  identities,
  changeIdentity,
  payerWalletType,
  payerWalletValue,
  changePayerWallet,
  normalWallet,
  handleChangePayer,
  ledgerStatus,
  next,
} = useNodeStakeIntroPage()
</script>

<style scoped>
.intro-content {
  margin-top: 0;
}
.payer-wallet-options :deep(.ant-radio-wrapper) {
  margin-inline-end: 0;
}

.payer-ledger-status {
  width: 100%;
}
</style>
