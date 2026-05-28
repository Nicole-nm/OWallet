<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('createSharedWallet.create')" @backEvent="back"></breadcrumb>
    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__progress" role="list" aria-label="Create shared wallet progress">
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
            <span class="ow-flow-shell__step-label">{{ $t('createSharedWallet.basicInfo') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createSharedWallet.label') }} / {{ $t('createSharedWallet.copayers2_12') }}
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
            <span class="ow-flow-shell__step-label">{{ $t('sharedWalletHome.confirmation') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createSharedWallet.copayers') }} /
              {{ $t('createSharedWallet.requiredSigNum') }}
            </span>
          </div>
        </div>
      </div>

      <div class="ow-flow-shell__body">
        <basic-info
          v-if="currentStep === 0"
          v-model:label="basicLabel"
          :valid-label="validLabel"
          :pks="pks"
          @validate-label="validateCreateSharedWalletLabel"
          @validate-publickey="validateCreateSharedWalletPublicKey"
          @add-pk="addCreateSharedWalletCopayer"
          @remove-pk="removeCreateSharedWalletCopayer"
          @update-copayer-name="updateCreateSharedWalletCopayerName"
          @update-copayer-public-key="updateCreateSharedWalletCopayerPublicKey"
          @cancel="cancelCreateSharedWalletBasicStep"
          @next="submitCreateSharedWalletBasicStep"
        />
        <confirm-sig-num
          v-if="currentStep === 1"
          :processing="processing"
          :label="createdLabel"
          :copayers="confirmCopayers"
          :options="options"
          v-model:required-sig-num="requiredSigNum"
          @back="backCreateSharedWalletConfirmStep"
          @next="submitCreateSharedWalletConfirmStep"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasicInfo from '../../modules/wallet/ui/SharedWallet/Create/BasicInfo.vue'
import ConfirmSigNum from '../../modules/wallet/ui/SharedWallet/Create/ConfirmSigNum.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useCreateSharedWalletPage } from '../../workflows/wallet/useCreateSharedWalletPage'

defineOptions({
  name: 'CreateSharedWalletPage',
})

const {
  currentStep,
  back,
  basicLabel,
  validLabel,
  pks,
  processing,
  createdLabel,
  copayers,
  options,
  requiredSigNum,
  addCreateSharedWalletCopayer,
  removeCreateSharedWalletCopayer,
  updateCreateSharedWalletCopayerName,
  updateCreateSharedWalletCopayerPublicKey,
  validateCreateSharedWalletLabel,
  validateCreateSharedWalletPublicKey,
  cancelCreateSharedWalletBasicStep,
  submitCreateSharedWalletBasicStep,
  backCreateSharedWalletConfirmStep,
  submitCreateSharedWalletConfirmStep,
} = useCreateSharedWalletPage()

const confirmCopayers = computed(() => copayers.value as never)
</script>
