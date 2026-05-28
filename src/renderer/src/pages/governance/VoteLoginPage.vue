<template>
  <div>
    <breadcrumb
      :routes="page.routes"
      :current="$t('vote.login')"
      @backEvent="page.back"
    ></breadcrumb>
    <div class="ow-form-panel">
      <form-field :label="$t('vote.selectWallet')" label-tag="p" class="vote-wallet-field">
        <div class="ow-choice-stack">
          <a-radio-group
            @change="page.changeVoteWallet"
            :value="page.voteWalletType"
            class="ow-choice-options vote-wallet-options"
          >
            <a-radio value="commonWallet">{{ $t('createIdentity.commonWallet') }}</a-radio>
            <a-radio value="ledgerWallet">{{ $t('createIdentity.ledgerWallet') }}</a-radio>
          </a-radio-group>

          <div class="ow-choice-panel">
            <wallet-select-field
              v-if="page.voteWalletType === 'commonWallet'"
              :options="page.normalWallet"
              v-model:value="page.voteWalletValue"
              :placeholder="$t('createIdentity.selectCommonWallet')"
              @walletSelected="page.handleChangePayer"
            >
            </wallet-select-field>

            <ledger-status-notice
              v-else
              class="payer-ledger-status"
              :status="page.ledgerStatus"
              compact
            />
          </div>
        </div>
      </form-field>
      <div class="ow-inline-link-tip">
        <span class="ow-inline-link-tip__text">{{ $t('vote.notSeeWallet') }} </span>
        <span class="ow-inline-link-tip__link" @click="page.hereImport">{{
          $t('vote.importHere')
        }}</span>
      </div>
      <page-footer-actions align="between" class="vote-login-actions">
        <a-button type="default" variant="secondary" @click="page.back">{{
          $t('vote.back')
        }}</a-button>
        <a-button type="primary" variant="primary" @click="page.next">{{
          $t('nodeStake.next')
        }}</a-button>
      </page-footer-actions>
    </div>
  </div>
</template>

<script setup lang="ts">
import { proxyRefs } from 'vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import FormField from '../../shared/ui/forms/FormField.vue'
import WalletSelectField from '../../shared/ui/forms/WalletSelectField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useVoteLoginPage } from '../../workflows/governance/useVoteLoginPage'

defineOptions({
  name: 'VoteLoginPage',
})

const page = proxyRefs(useVoteLoginPage())
</script>

<style lang="scss" scoped>
.vote-wallet-field :deep(.ant-form-item-row) {
  flex-wrap: wrap;
}

.vote-wallet-field :deep(.ant-form-item-label) {
  flex: 0 0 100%;
  max-width: 100%;
  padding-bottom: var(--ow-space-2);
  text-align: left;
}

.vote-wallet-field :deep(.ant-form-item-label > label) {
  justify-content: flex-start;
  text-align: left;
}

.vote-wallet-field :deep(.ant-form-item-control) {
  width: 100%;
}

.vote-wallet-options :deep(.ant-radio-wrapper) {
  margin-inline-end: 0;
}

.payer-ledger-status {
  width: 100%;
}

.vote-login-actions {
  margin-top: var(--ow-space-6);
}
</style>
