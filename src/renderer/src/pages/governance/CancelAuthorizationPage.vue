<template>
  <div>
    <breadcrumb
      :current="$t('nodeMgmt.cancelAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="ow-governance-page">
      <section class="ow-panel ow-governance-shell">
        <div class="ow-governance-hero">
          <div>
            <p class="ow-governance-eyebrow">
              {{ $t('nodeMgmt.stakeAuthorization') }}
            </p>
            <h1 class="ow-governance-title">{{ currentNode.name }}</h1>
          </div>
          <div class="ow-governance-highlight">
            <span class="ow-governance-highlight__label">{{ $t('nodeMgmt.inAuthorization') }}</span>
            <span class="ow-governance-highlight__value"
              >{{ authorizationInfo.inAuthorization }} ONT</span
            >
          </div>
        </div>

        <div class="ow-governance-card-grid">
          <div class="ow-governance-card ow-governance-card--wide">
            <span class="ow-governance-card__label">{{ $t('nodeMgmt.walletAddress') }}</span>
            <span class="ow-governance-card__value">{{ stakeWallet?.address }}</span>
          </div>
        </div>

        <div class="ow-governance-input-panel">
          <label class="ow-governance-field-label" for="cancel-authorization-input">{{
            $t('nodeMgmt.amountToCancel')
          }}</label>
          <div class="ow-governance-input-control">
            <a-input
              id="cancel-authorization-input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              class="ow-input cancel-authorization-input"
              v-model:value="cancelAmount"
              @change="handleChange"
              :class="validCancelAmount ? '' : 'ow-error-input'"
            ></a-input>
            <span class="ow-governance-input-suffix">ONT</span>
          </div>
        </div>

        <div class="ow-governance-input-panel">
          <label class="ow-governance-field-label" for="cancel-authorization-password">{{
            $t('nodeStake.signWithWallet')
          }}</label>
          <div v-if="usesCommonWallet" class="ow-governance-input-control">
            <a-input
              id="cancel-authorization-password"
              type="password"
              class="ow-input cancel-authorization-input"
              :placeholder="$t('nodeStake.password')"
              v-model:value="walletPassword"
            ></a-input>
          </div>
          <ledger-status-notice v-else :status="ledgerStatus" />
        </div>

        <div class="ow-governance-actions">
          <a-button
            type="primary"
            variant="primary"
            class="cancel-authorization-submit"
            @click="submit"
            >{{ $t('nodeMgmt.submit') }}</a-button
          >
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import LedgerStatusNotice from '../../shared/ui/ledger/LedgerStatusNotice.vue'
import { useCancelAuthorizationPage } from '../../workflows/governance/useCancelAuthorizationPage'

defineOptions({
  name: 'CancelAuthorizationPage',
})

const {
  currentNode,
  authorizationInfo,
  stakeWallet,
  cancelAmount,
  validCancelAmount,
  walletPassword,
  usesCommonWallet,
  ledgerStatus,
  handleRouteBack,
  handleChange,
  submit,
} = useCancelAuthorizationPage()
</script>

<style scoped lang="scss">
.cancel-authorization-input {
  width: 200px;
}

.cancel-authorization-amount {
  margin: var(--ow-space-2) 0 0;
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.cancel-authorization-submit {
  min-width: 180px;
}

@media (max-width: 560px) {
  .cancel-authorization-input,
  .cancel-authorization-submit {
    width: 100%;
  }
}
</style>
