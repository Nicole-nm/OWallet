<template>
  <div>
    <breadcrumb
      :current="$t('nodeMgmt.stakeAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="ow-form-panel stake-authorization-form">
      <form-field :label="$t('nodeStake.selectStakeWallet')" label-tag="p" class="ow-stacked-field">
        <wallet-select-field
          :options="normalWalletAndLedgerWallet"
          v-model:value="selectedWalletValue"
          :placeholder="$t('createIdentity.selectCommonWallet')"
          class="stake-wallet-select"
          @walletSelected="handleChangePayer"
        >
        </wallet-select-field>
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
import { useAuthorizationLoginPage } from '../../workflows/governance/useAuthorizationLoginPage'

defineOptions({
  name: 'AuthorizationLoginPage',
})

const { walletOptions, selectedWalletValue, handleRouteBack, handleChangePayer, next } =
  useAuthorizationLoginPage()

const normalWalletAndLedgerWallet = walletOptions
</script>

<style scoped lang="scss">
.stake-authorization-form {
  width: min(560px, calc(100% - var(--ow-layout-gutter)));
}

.stake-wallet-select {
  width: 100%;
}
</style>
