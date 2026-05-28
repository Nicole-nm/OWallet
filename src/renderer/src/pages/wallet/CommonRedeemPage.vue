<template>
  <div>
    <breadcrumb
      :current="$t('commonWalletHome.redeem')"
      :routes="routes"
      @backEvent="goBackToWallets"
    ></breadcrumb>
    <div class="ow-form-panel redeem-panel">
      <div class="ow-panel-title ow-panel-title--large">
        {{ $t('commonWalletHome.redeemCharge') }}
      </div>
      <div class="input-pass" v-if="type === 'commonWallet'">
        <a-input
          type="password"
          class="input"
          :placeholder="$t('commonWalletHome.inputPass')"
          :value="password"
          @update:value="password = $event"
        ></a-input>
      </div>
      <ledger-status-notice
        v-if="type === 'hardwareWallet'"
        class="ledger-status"
        :status="ledgerStatus"
        :show-title="false"
      />
    </div>
    <page-footer-actions align="between">
      <a-button type="default" variant="secondary" @click="cancelRedeem">{{
        $t('commonWalletHome.cancel')
      }}</a-button>
      <a-button type="primary" variant="primary" @click="submit" :disabled="sending">
        {{ $t('commonWalletHome.submit') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useCommonRedeemPage } from '../../workflows/wallet/useCommonRedeemPage'

defineOptions({
  name: 'CommonRedeemPage',
})

const { password, sending, type, routes, ledgerStatus, goBackToWallets, cancelRedeem, submit } =
  useCommonRedeemPage()
</script>

<style scoped>
.redeem-panel {
  margin-top: var(--ow-layout-form-indent);
  margin-bottom: var(--ow-layout-form-indent);
}
.input-pass {
  margin-top: 12px;
  padding-left: var(--ow-layout-form-indent);
}
.ledger-status {
  margin-top: 10px;
  margin-left: var(--ow-layout-form-indent);
}
</style>
