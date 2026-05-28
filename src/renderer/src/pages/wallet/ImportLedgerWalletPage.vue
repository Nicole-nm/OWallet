<template>
  <div>
    <breadcrumb :current="$t('importLedgerWallet.import')" @backEvent="back"></breadcrumb>
    <div class="shared-container">
      <div class="steps-content">
        <connect-ledger
          v-if="step === 1"
          :ledger-status="ledgerStatus"
          :public-key="publicKey"
          @cancel="cancelImportLedgerWallet"
          @next="nextStep"
          @support="openLedgerSupport"
        />
        <basic-info
          v-if="step === 2"
          :form="formView"
          :add-disabled="addDisabled"
          @entered="loadInitialLedgerAccounts"
          @update-field="updateImportLedgerField"
          @toggle-mode="toggleImportLedgerMode"
          @select-address="selectImportLedgerAddress"
          @prev-page="prevImportLedgerPage"
          @next-page="nextImportLedgerPage"
          @cancel="cancelImportLedgerWallet"
          @next="submitImportLedgerWallet"
        />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasicInfo from '../../modules/wallet/ui/LedgerWallet/Import/BasicInfo.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import ConnectLedger from '../../modules/wallet/ui/LedgerWallet/Import/ConnectLedger.vue'
import { useImportLedgerWalletPage } from '../../workflows/wallet/useImportLedgerWalletPage'

defineOptions({
  name: 'ImportLedgerWalletPage',
})

const {
  back,
  step,
  form,
  ledgerStatus,
  publicKey,
  addDisabled,
  nextStep,
  openLedgerSupport,
  loadInitialLedgerAccounts,
  updateImportLedgerField,
  toggleImportLedgerMode,
  selectImportLedgerAddress,
  prevImportLedgerPage,
  nextImportLedgerPage,
  submitImportLedgerWallet,
  cancelImportLedgerWallet,
} = useImportLedgerWalletPage()

const formView = computed(() => form as never)
</script>
