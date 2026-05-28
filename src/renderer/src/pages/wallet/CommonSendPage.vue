<template>
  <div class="ow-flow-shell-page">
    <breadcrumb
      :current="$t('sharedWalletHome.send')"
      :routes="routes"
      @backEvent="goBackToWallets"
    ></breadcrumb>

    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__progress" role="list" aria-label="Send progress">
        <div
          class="ow-flow-shell__step"
          :class="{
            'ow-flow-shell__step--active': currentStep === 0,
            'ow-flow-shell__step--complete': currentStep > 0,
          }"
          role="listitem"
        >
          <span class="ow-flow-shell__step-index">1</span>
          <div class="ow-flow-shell__step-copy">
            <span class="ow-flow-shell__step-label">{{ $t('sharedWalletHome.send') }}</span>
            <span class="ow-flow-shell__step-caption"
              >{{ $t('sharedWalletHome.asset') }} / {{ $t('sharedWalletHome.amount') }} /
              {{ $t('sharedWalletHome.recipient') }}</span
            >
          </div>
        </div>

        <div
          class="ow-flow-shell__step"
          :class="{ 'ow-flow-shell__step--active': currentStep === 1 }"
          role="listitem"
        >
          <span class="ow-flow-shell__step-index">2</span>
          <div class="ow-flow-shell__step-copy">
            <span class="ow-flow-shell__step-label">{{ $t('sharedWalletHome.confirmation') }}</span>
            <span class="ow-flow-shell__step-caption"
              >{{ $t('sharedWalletHome.fee') }} / {{ $t('sharedWalletHome.submit') }}</span
            >
          </div>
        </div>
      </div>

      <div class="ow-flow-shell__body">
        <send-asset
          v-if="currentStep === 0"
          @cancelEvent="cancelCommonSend"
          @sendAssetNext="goToCommonSendConfirm"
        >
        </send-asset>

        <send-confirm
          v-if="currentStep === 1"
          @backEvent="goBackToCommonSendAsset"
          @sendConfirmSubmit="finishCommonSend"
        >
        </send-confirm>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SendAsset from '../../workflows/wallet/SendAssetStep.vue'
import SendConfirm from '../../workflows/wallet/CommonSendConfirmStep.vue'
import { useCommonSendPage } from '../../workflows/wallet/useCommonSendPage'

defineOptions({
  name: 'CommonSendPage',
})

const {
  routes,
  currentStep,
  goBackToWallets,
  cancelCommonSend,
  goToCommonSendConfirm,
  goBackToCommonSendAsset,
  finishCommonSend,
} = useCommonSendPage()
</script>
