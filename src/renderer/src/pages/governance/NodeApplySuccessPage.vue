<template>
  <div class="ow-success-state">
    <img class="ow-success-state__icon" src="../../assets/success.svg" alt="" />
    <p class="ow-success-state__title">{{ $t('nodeApply.registerSuccess') }}</p>
    <a-button class="ow-success-state__primary-action" variant="primary" @click="onComplete">{{
      $t('nodeApply.completeNodeInfo')
    }}</a-button>
    <p class="ow-success-state__secondary-action" @click="onLater">{{ $t('nodeApply.later') }}</p>
  </div>
</template>

<script setup lang="ts">
import { useNodeApplySuccessPage } from '../../workflows/governance/useNodeApplySuccessPage'

defineOptions({
  name: 'NodeApplySuccessPage',
})

const { onComplete, onLater } = useNodeApplySuccessPage()
</script>
