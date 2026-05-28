<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('importJsonWallet.create')" @backEvent="back"></breadcrumb>

    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__body">
        <basic-info
          :form="formView"
          :validation-errors="validationErrors"
          @update-field="updateImportJsonField"
          @file-change="handleImportJsonFileChange"
          @dat-label-change="updateImportJsonDatLabel"
          @dat-password-change="updateImportJsonDatPassword"
          @cancel="cancelImportJsonWallet"
          @next="submitImportJsonWallet"
          @confirm-ok="handleImportJsonConfirmOk"
          @confirm-cancel="handleImportJsonConfirmCancel"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import BasicInfo from '../../modules/wallet/ui/JsonWallet/Import/BasicInfo.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useImportJsonWalletPage } from '../../workflows/wallet/useImportJsonWalletPage'

defineOptions({
  name: 'ImportJsonWalletPage',
})

const {
  back,
  form,
  validationErrors,
  updateImportJsonField,
  updateImportJsonDatLabel,
  updateImportJsonDatPassword,
  submitImportJsonWallet,
  handleImportJsonFileChange,
  cancelImportJsonWallet,
  handleImportJsonConfirmOk,
  handleImportJsonConfirmCancel,
} = useImportJsonWalletPage()

const formView = computed(() => form as never)
</script>
