<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('createIdentity.create')" @backEvent="back"></breadcrumb>

    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__progress" role="list" aria-label="Create ONT ID progress">
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
            <span class="ow-flow-shell__step-label">{{ $t('createIdentity.basicInfo') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createIdentity.label') }} / {{ $t('createIdentity.selectWallet') }}
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
            <span class="ow-flow-shell__step-label">{{ $t('createIdentity.confirmInfo') }}</span>
            <span class="ow-flow-shell__step-caption">
              {{ $t('createIdentity.label') }} / {{ $t('createIdentity.ontid') }}
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
          v-model:payer-wallet-type="payerWalletType"
          v-model:payer-wallet-value="payerWalletValue"
          v-model:payer-password="payerPassword"
          :local-common-wallet="payerWalletOptions"
          :validation-errors="basicValidationErrors"
          :ledger-status="ledgerStatus"
          @cancel="cancelCreateIdentityBasicStep"
          @next="submitCreateIdentityBasicStep"
          @wallet-selected="handleCreateIdentityPayerSelection"
        />
        <confirm-info
          v-if="currentStep === 1"
          :label="createdLabel"
          :ontid="createdOntid"
          @back="backCreateIdentityConfirmStep"
          @next="submitCreateIdentityConfirmStep"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BasicInfo from '../../modules/identity/ui/Identities/Create/BasicInfo.vue'
import ConfirmInfo from '../../modules/identity/ui/Identities/Create/ConfirmInfo.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useCreateIdentityPage } from '../../workflows/identity/useCreateIdentityPage'

defineOptions({
  name: 'CreateIdentityPage',
})

const {
  currentStep,
  back,
  basicLabel,
  basicPassword,
  basicRePassword,
  payerWalletType,
  payerWalletValue,
  payerWalletOptions,
  payerPassword,
  basicValidationErrors,
  ledgerStatus,
  createdLabel,
  createdOntid,
  cancelCreateIdentityBasicStep,
  handleCreateIdentityPayerSelection,
  submitCreateIdentityBasicStep,
  backCreateIdentityConfirmStep,
  submitCreateIdentityConfirmStep,
} = useCreateIdentityPage()
</script>
