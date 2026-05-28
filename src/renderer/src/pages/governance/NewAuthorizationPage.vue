<template>
  <div>
    <breadcrumb
      :current="$t('nodeMgmt.newStakeAuthorization')"
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
            <span class="ow-governance-highlight__label">{{
              $t('nodeMgmt.allowedStakeAmount')
            }}</span>
            <span class="ow-governance-highlight__value"
              >{{ currentNode.maxAuthorizeStr }} ONT</span
            >
          </div>
        </div>

        <div class="ow-governance-card-grid">
          <div class="ow-governance-card">
            <span class="ow-governance-card__label">{{ $t('nodeMgmt.totalStakeAmount') }}</span>
            <span class="ow-governance-card__value">{{ currentNode.totalPosStr }} ONT</span>
          </div>
          <div class="ow-governance-card ow-governance-card--wide">
            <span class="ow-governance-card__label">{{ $t('nodeMgmt.walletAddress') }}</span>
            <span class="ow-governance-card__value">{{ stakeWallet?.address }}</span>
          </div>
        </div>

        <div class="ow-governance-input-panel">
          <label class="ow-governance-field-label" for="new-authorization-input">{{
            $t('nodeMgmt.stakeAuthorization')
          }}</label>
          <div class="ow-governance-input-control">
            <a-input
              id="new-authorization-input"
              type="text"
              inputmode="numeric"
              autocomplete="off"
              class="input new-authorization-input"
              v-model:value="units"
              @change="handleChange"
              :class="validInput ? '' : 'error-input'"
            ></a-input>
            <span class="ow-governance-input-suffix">ONT</span>
          </div>
        </div>

        <div class="ow-governance-actions">
          <a-button
            type="primary"
            variant="primary"
            class="new-authorization-submit"
            @click="submit"
            >{{ $t('nodeMgmt.submit') }}</a-button
          >
        </div>
      </section>
    </div>

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
import { useNewAuthorizationPage } from '../../workflows/governance/useNewAuthorizationPage'

defineOptions({
  name: 'NewAuthorizationPage',
})

const {
  currentNode,
  stakeWallet,
  units,
  validInput,
  signVisible,
  tx,
  handleRouteBack,
  handleChange,
  handleCancel,
  handleTxSent,
  submit,
} = useNewAuthorizationPage()
</script>

<style scoped>
.new-authorization-input {
  width: 160px;
}

.new-authorization-submit {
  min-width: 180px;
}

@media (max-width: 560px) {
  .new-authorization-input,
  .new-authorization-submit {
    width: 100%;
  }
}
</style>
