<template>
  <div>
    <breadcrumb
      :current="$t('sharedWalletHome.copayers')"
      :routes="routes"
      @backEvent="backToWallets"
    ></breadcrumb>
    <div>
      <div class="ow-wallet-summary" v-if="sharedWallet">
        <div class="ow-wallet-title">{{ sharedWallet.sharedWalletName }}</div>
        <div class="ow-wallet-title ow-wallet-address">
          {{ sharedWallet.sharedWalletAddress }}
        </div>

        <div class="ow-wallet-meta">
          <div class="ow-wallet-meta-row">
            <span class="shared-wallet-meta__label">{{
              $t('importSharedWallet.totalCopayerNumber')
            }}</span>
            <span class="shared-wallet-meta__value">{{ sharedWallet.totalNumber }}</span>
          </div>
          <div class="ow-wallet-meta-row">
            <span class="shared-wallet-meta__label">{{
              $t('importSharedWallet.requiredCopayerNumber')
            }}</span>
            <span class="shared-wallet-meta__value">{{ sharedWallet.requiredNumber }}</span>
          </div>
        </div>
        <div class="ow-copayer-list">
          <div
            class="ow-copayer-row"
            v-for="(copayer, index) in sharedWallet.coPayers"
            :key="copayer.publickey"
          >
            <span class="ow-step-circle">{{ Number(index) + 1 }}</span>
            <span class="ow-copayer-name">{{ copayer.name }}</span>
            <span class="ow-copayer-address">{{ copayer.address }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useSharedWalletCopayerPage } from '../../workflows/wallet/useSharedWalletCopayerPage'

defineOptions({
  name: 'SharedWalletCopayerPage',
})

const { routes, backToWallets, sharedWallet } = useSharedWalletCopayerPage()
</script>

<style scoped>
.shared-wallet-meta__label {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
}

.shared-wallet-meta__value {
  font-family: var(--ow-font-bold);
  color: var(--ow-color-text-primary);
}
</style>
