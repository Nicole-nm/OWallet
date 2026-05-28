<template>
  <div class="ow-flow-panel ow-flow-panel--scroll clearfix">
    <p class="ow-flow-title" v-if="!isRedeem">{{ $t('sharedWalletHome.send') }}</p>
    <p class="ow-flow-title" v-if="isRedeem">{{ $t('sharedWalletHome.redeemOng') }}</p>

    <send-asset-summary
      :amount="pendingTx.amount"
      :asset="pendingTx.assetName"
      :recipient="pendingTx.receiveaddress"
      :fee="gas"
    />

    <div>
      <div class="ow-signer-header">
        <span class="ow-flow-title">{{ $t('sharedWalletHome.sponsor') }}</span>
        <span class="ow-flow-title"
          >[{{ sharedWallet.requiredNumber }} - OF - {{ sharedWallet.totalNumber }} ]</span
        >
      </div>
      <div class="ow-signer-row ow-signer-row--sponsor">
        <span
          class="ow-step-circle"
          :class="
            pendingTx.coPayerSignDtos[0] && pendingTx.coPayerSignDtos[0].isSign
              ? 'ow-step-circle--signed'
              : 'ow-step-circle--unsigned'
          "
          >1</span
        >
        <span class="ow-signer-name">{{
          pendingTx.coPayerSignDtos[0] && pendingTx.coPayerSignDtos[0].name
        }}</span>
        <span class="ow-signer-address">{{
          pendingTx.coPayerSignDtos[0] && pendingTx.coPayerSignDtos[0].address
        }}</span>
      </div>

      <p class="ow-flow-title">{{ $t('sharedWalletHome.signSequence') }}</p>
      <div class="ow-signer-sequence">
        <div
          class="ow-draggable"
          v-for="(payer, index) in pendingTx.coPayerSignDtos"
          :key="payer.address"
        >
          <div class="ow-signer-row" v-if="index !== 0">
            <span
              class="ow-step-circle"
              :class="payer.isSign ? 'ow-step-circle--signed' : 'ow-step-circle--unsigned'"
              >{{ Number(index) + 1 }}</span
            >
            <span class="ow-signer-name">{{ payer.name }}</span>
            <span class="ow-signer-address">{{ payer.address }}</span>
          </div>
        </div>
      </div>
    </div>

    <page-footer-actions v-if="showSign" align="center">
      <a-button type="primary" variant="primary" @click="next">{{
        $t('sharedWalletHome.sign')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { BigNumber } from 'bignumber.js'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { findLocalSharedSigner } from '../../modules/wallet/application/sharedWalletOverviewApplicationService'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import SendAssetSummary from '../../shared/ui/cards/SendAssetSummary.vue'
defineOptions({
  name: 'PendingConfirm',
})

const emit = defineEmits(['cancelEvent', 'sendConfirmBack', 'signEvent'])

const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const pendingTx = computed(() => currentWalletStore.pendingTx)
const isRedeem = computed(() => currentWalletStore.transfer)
const gas = computed(() => {
  const gasPrice = new BigNumber(currentWalletStore.pendingTx.gasprice)
  const gasLimit = new BigNumber(currentWalletStore.pendingTx.gaslimit)
  return gasPrice.multipliedBy(gasLimit).div(1e9).toString()
})

const showSign = ref(false)

onMounted(() => {
  updateShowSign()
})

async function updateShowSign() {
  const nextSigner = pendingTx.value.coPayerSignDtos.find(
    (item: { isSign?: boolean }) => item.isSign === false
  )
  if (!nextSigner) {
    return
  }

  const result = await findLocalSharedSigner(nextSigner.address)
  if (result.ok && result.signer) {
    currentWalletStore.setCurrentSigner({ account: result.signer })
    showSign.value = true
  }
}

function next() {
  emit('signEvent')
}
</script>
