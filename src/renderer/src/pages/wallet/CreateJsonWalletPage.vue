<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('createJsonWallet.create')" @backEvent="back"></breadcrumb>

    <section class="ow-panel ow-flow-shell">
      <div
        class="ow-flow-shell__progress"
        role="list"
        aria-label="Create individual wallet progress"
      >
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
            <span class="ow-flow-shell__step-label">{{ $t('createJsonWallet.basicInfo') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createJsonWallet.label') }} / {{ $t('createJsonWallet.password') }}
            </span>
          </div>
        </div>

        <div
          class="ow-flow-shell__step"
          :class="{ 'ow-flow-shell__step--active': currentStep === 1 }"
          role="listitem"
        >
          <span class="ow-flow-shell__step-index">2</span>
          <div class="ow-flow-shell__step-copy">
            <span class="ow-flow-shell__step-label">{{ $t('createJsonWallet.confirmInfo') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createJsonWallet.addressN') }} / {{ $t('createJsonWallet.wif') }}
            </span>
          </div>
        </div>
      </div>

      <div class="ow-flow-shell__body">
        <basic-info
          v-if="currentStep === 0"
          v-model:label="basicLabel"
          v-model:password="basicPassword"
          v-model:re-password="basicRePassword"
          :validation-errors="basicValidationErrors"
          @cancel="cancelCreateJsonWalletBasicStep"
          @next="submitCreateJsonWalletBasicStep"
        />
        <confirm-info
          v-if="currentStep === 1"
          :label="createdLabel"
          :address="createdAddress"
          :public-key="createdPublicKey"
          :wif="createdWif"
          @back="backCreateJsonWalletConfirmStep"
          @download-wallet="downloadCreateJsonWalletBackup"
          @next="submitCreateJsonWalletConfirmStep"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BasicInfo from '../../modules/wallet/ui/JsonWallet/Create/BasicInfo.vue'
import ConfirmInfo from '../../modules/wallet/ui/JsonWallet/Create/ConfirmInfo.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useCreateJsonWalletPage } from '../../workflows/wallet/useCreateJsonWalletPage'

defineOptions({
  name: 'CreateJsonWalletPage',
})

const {
  currentStep,
  back,
  basicLabel,
  basicPassword,
  basicRePassword,
  basicValidationErrors,
  createdLabel,
  createdAddress,
  createdPublicKey,
  createdWif,
  cancelCreateJsonWalletBasicStep,
  submitCreateJsonWalletBasicStep,
  backCreateJsonWalletConfirmStep,
  downloadCreateJsonWalletBackup,
  submitCreateJsonWalletConfirmStep,
} = useCreateJsonWalletPage()
</script>
