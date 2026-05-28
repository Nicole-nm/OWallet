<template>
  <div>
    <breadcrumb
      :routes="routes"
      :current="$t('sharedWalletHome.send')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="ow-send-flow ow-send-flow--scroll">
      <div class="ow-flow-steps">
        <a-steps :current="current">
          <a-step v-if="!isRedeem" />
          <a-step />
          <a-step />
        </a-steps>
      </div>

      <send-asset
        @cancelEvent="handleCancel"
        @sendAssetNext="handleSendAssetNext"
        v-if="current === 0 && !isRedeem"
      >
      </send-asset>
      <send-confirm
        v-if="current === 1"
        @cancelEvent="handleCancel"
        @sendConfirmNext="handleSendConfirmNext"
        @sendConfirmBack="handleSendConfirmBack"
      ></send-confirm>
      <input-password
        v-if="current === 2"
        @inputPassBack="handleInputPassBack"
        @inputPassNext="handleInputPassNext"
      ></input-password>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SendAsset from '../../workflows/wallet/SendAssetStep.vue'
import SendConfirm from '../../workflows/wallet/SharedSendConfirmStep.vue'
import InputPassword from '../../workflows/wallet/SharedInputPasswordStep.vue'
import { useSharedWalletSendPage } from '../../workflows/wallet/useSharedWalletSendPage'

defineOptions({
  name: 'SharedWalletSendPage',
})

const {
  routes,
  handleRouteBack,
  current,
  isRedeem,
  handleCancel,
  handleSendAssetNext,
  handleSendConfirmNext,
  handleSendConfirmBack,
  handleInputPassBack,
  handleInputPassNext,
} = useSharedWalletSendPage()
</script>
