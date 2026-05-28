<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('importSharedWallet.import')" @backEvent="back"></breadcrumb>
    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__progress" role="list" aria-label="Import shared wallet progress">
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
            <span class="ow-flow-shell__step-label">{{ $t('importSharedWallet.import') }}</span>
            <span class="ow-flow-shell__step-caption">{{
              $t('importSharedWallet.inputAddress')
            }}</span>
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
              {{ $t('importSharedWallet.totalCopayerNumber') }} /
              {{ $t('importSharedWallet.requiredCopayerNumber') }}
            </span>
          </div>
        </div>
      </div>

      <div class="ow-flow-shell__body">
        <query-shared-wallet
          v-if="currentStep === 0"
          v-model:search-text="searchText"
          @cancel="cancelImportSharedWalletQueryStep"
          @next="submitImportSharedWalletQueryStep"
        />
        <input-pass
          v-if="currentStep === 1"
          :shared-wallet="sharedWalletView"
          @back="backImportSharedWalletConfirmStep"
          @next="submitImportSharedWalletConfirmStep"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import QuerySharedWallet from '../../modules/wallet/ui/SharedWallet/Import/QuerySharedWallet.vue'
import InputPass from '../../modules/wallet/ui/SharedWallet/Import/InputPass.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useImportSharedWalletPage } from '../../workflows/wallet/useImportSharedWalletPage'

defineOptions({
  name: 'ImportSharedWalletPage',
})

const {
  currentStep,
  back,
  searchText,
  sharedWallet,
  cancelImportSharedWalletQueryStep,
  submitImportSharedWalletQueryStep,
  backImportSharedWalletConfirmStep,
  submitImportSharedWalletConfirmStep,
} = useImportSharedWalletPage()

const sharedWalletView = computed(() => sharedWallet.value as never)
</script>
