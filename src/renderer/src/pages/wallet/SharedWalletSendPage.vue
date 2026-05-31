<template>
  <div class="ow-flow-shell-page">
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.send')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <section class="ow-panel ow-flow-shell shared-wallet-send-shell">
      <div
        class="ow-flow-shell__progress"
        :class="{ 'shared-wallet-send-shell__progress--triple': progressSteps.length === 3 }"
        role="list"
        aria-label="Shared wallet send progress"
      >
        <div
          v-for="(step, index) in progressSteps"
          :key="step.workflowStep"
          class="ow-flow-shell__step"
          :class="{
            'ow-flow-shell__step--active': current === step.workflowStep,
            'ow-flow-shell__step--complete': current > step.workflowStep,
          }"
          role="listitem"
        >
          <span class="ow-flow-shell__step-index">{{ index + 1 }}</span>
          <div class="ow-flow-shell__step-copy">
            <span class="ow-flow-shell__step-label">{{ $t(step.labelKey) }}</span>
          </div>
        </div>
      </div>

      <div class="ow-flow-shell__body">
        <send-asset
          v-if="current === 0 && !isRedeem"
          @cancelEvent="handleCancel"
          @sendAssetNext="handleSendAssetNext"
        >
        </send-asset>
        <send-confirm
          v-if="current === 1"
          @cancelEvent="handleCancel"
          @sendConfirmNext="handleSendConfirmNext"
          @sendConfirmBack="handleSendConfirmBack"
        ></send-confirm>
        <input-password
          v-if="current === 2"
          @inputPassBack="handleInputPassBack"
          @inputPassNext="handleInputPassNext"
        ></input-password>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SendAsset from '../../workflows/wallet/SendAssetStep.vue'
import SendConfirm from '../../workflows/wallet/SharedSendConfirmStep.vue'
import InputPassword from '../../workflows/wallet/SharedInputPasswordStep.vue'
import { useSharedWalletSendPage } from '../../workflows/wallet/useSharedWalletSendPage'

defineOptions({
  name: 'SharedWalletSendPage',
})

const {
  routes,
  handleRouteBack,
  current,
  isRedeem,
  progressSteps,
  handleCancel,
  handleSendAssetNext,
  handleSendConfirmNext,
  handleSendConfirmBack,
  handleInputPassBack,
  handleInputPassNext,
} = useSharedWalletSendPage()
</script>

<style scoped>
.shared-wallet-send-shell__progress--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

@media (max-width: 700px) {
  .shared-wallet-send-shell__progress--triple {
    grid-template-columns: 1fr;
  }
}
</style>
