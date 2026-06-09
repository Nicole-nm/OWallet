<template>
  <div class="ow-flow-shell-page">
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.pendingTx')"
      @backEvent="backToWallets"
    ></breadcrumb>
    <section class="ow-panel ow-flow-shell pending-container">
      <div
        class="ow-flow-shell__progress"
        role="list"
        aria-label="Pending shared transaction progress"
      >
        <div
          v-for="(step, index) in progressSteps"
          :key="step.labelKey"
          class="ow-flow-shell__step"
          :class="{
            'ow-flow-shell__step--active': currentStep === index,
            'ow-flow-shell__step--complete': currentStep > index,
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
        <pending-confirm
          v-if="!showInputPass"
          @signEvent="handleSignEvent"
          @cancelEvent="handleCancelEvent"
        ></pending-confirm>
        <pending-tx-sign
          v-if="showInputPass"
          @backEvent="handleBackEvent"
          @submitEvent="handleSubmitEvent"
        ></pending-tx-sign>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import PendingConfirm from '../../workflows/wallet/PendingConfirmStep.vue'
import PendingTxSign from '../../workflows/wallet/PendingTxSignStep.vue'
import { usePendingTxHomePage } from '../../workflows/wallet/usePendingTxHomePage'

defineOptions({
  name: 'PendingTxHomePage',
})

const {
  routes,
  backToWallets,
  currentStep,
  progressSteps,
  showInputPass,
  handleSignEvent,
  handleBackEvent,
  handleSubmitEvent,
  handleCancelEvent,
} = usePendingTxHomePage()
</script>
