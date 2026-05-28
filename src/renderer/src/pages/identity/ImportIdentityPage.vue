<template>
  <div class="ow-flow-shell-page">
    <breadcrumb :current="$t('importIdentity.import')" @backEvent="back"></breadcrumb>

    <section class="ow-panel ow-flow-shell">
      <div class="ow-flow-shell__body">
        <basic-info
          :form="form"
          :validation-errors="validationErrors"
          @update-field="updateImportIdentityField"
          @cancel="cancelImportIdentity"
          @next="submitImportIdentity"
        />
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import BasicInfo from '../../modules/identity/ui/Identities/Import/BasicInfo.vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useImportIdentityPage } from '../../workflows/identity/useImportIdentityPage'

defineOptions({
  name: 'ImportIdentityPage',
})

const {
  back,
  form,
  validationErrors,
  updateImportIdentityField,
  submitImportIdentity,
  cancelImportIdentity,
} = useImportIdentityPage()
</script>
