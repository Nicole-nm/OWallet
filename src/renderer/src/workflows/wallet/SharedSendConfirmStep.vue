<template>
  <div class="ow-flow-panel clearfix">
    <p class="ow-flow-title" v-if="transfer.isRedeem">{{ $t('sharedWalletHome.redeemOng') }}</p>
    <send-asset-summary
      v-if="transfer.isRedeem"
      :amount="redeem.claimableOng"
      asset="ONG"
      :fee="TRANSFER_GAS_MIN"
    />

    <p class="ow-flow-title" v-if="!transfer.isRedeem">{{ $t('sharedWalletHome.send') }}</p>
    <send-asset-summary
      v-if="!transfer.isRedeem"
      :amount="transfer.amount"
      :asset="transfer.asset"
      :recipient="transfer.to"
      :fee="transfer.gas"
    />

    <div>
      <div class="ow-signer-header">
        <span class="ow-flow-title">{{ $t('sharedWalletHome.sponsor') }}</span>
        <span class="ow-flow-title"
          >[{{ sharedWallet.requiredNumber }} - OF - {{ sharedWallet.totalNumber }} ]</span
        >
      </div>
      <div class="ow-signer-select">
        <span class="ow-step-circle ow-step-circle--bordered">1</span>
        <a-select :options="localCopayers" @change="handleChangeSponsor"></a-select>
      </div>

      <p class="ow-flow-title">{{ $t('sharedWalletHome.dragDecide') }}</p>
      <div ref="dragContainer" class="ow-signer-sequence">
        <div class="ow-draggable" v-for="(payer, index) in payers" :key="payer.address">
          <div class="ow-signer-row ow-signer-row--hover">
            <span class="ow-step-circle ow-step-circle--bordered">{{ Number(index) + 2 }}</span>
            <span class="ow-signer-name">{{ payer.name }}</span>
            <span class="ow-signer-address">{{ payer.address }}</span>
          </div>
        </div>
      </div>
    </div>

    <page-footer-actions align="between">
      <a-button type="default" variant="secondary" @click="back">{{
        $t('sharedWalletHome.back')
      }}</a-button>
      <a-button type="primary" variant="primary" @click="next">{{
        $t('sharedWalletHome.next')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Sortable from 'sortablejs'
import { TRANSFER_GAS_MIN } from '../../shared/lib/constants'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { loadLocalSharedCopayers } from '../../modules/wallet/application/sharedWalletOverviewApplicationService'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import SendAssetSummary from '../../shared/ui/cards/SendAssetSummary.vue'
import type { SharedCopayer } from '../../shared/types'
defineOptions({
  name: 'SendConfirm',
})

const emit = defineEmits(['cancelEvent', 'sendConfirmBack', 'sendConfirmNext'])
const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const dragContainer = ref<HTMLElement | null>(null)
const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const transfer = computed(() => currentWalletStore.transfer)
const redeem = computed(() => currentWalletStore.redeem)
const localCopayers = computed(() => {
  const copayers = [...currentWalletStore.localCopayers]
  return copayers.map(
    (copayer): SharedCopayer => ({
      ...copayer,
      address: copayer.address,
      name: copayer.name,
      value: copayer.address,
      label: copayer.name,
    })
  )
})

const payers = ref<SharedCopayer[]>([...sharedWallet.value.coPayers])
const sponsorPayer = ref<SharedCopayer | null>(null)
let sortable: Sortable | null = null

onMounted(() => {
  loadLocalCopayers()
  if (!dragContainer.value) {
    return
  }

  sortable = Sortable.create(dragContainer.value, {
    animation: 150,
    onEnd: (evt: { oldIndex?: number; newIndex?: number }) => {
      if (evt.oldIndex === undefined || evt.newIndex === undefined) {
        return
      }
      const item = payers.value.splice(evt.oldIndex, 1)[0]
      if (!item) {
        return
      }
      payers.value.splice(evt.newIndex, 0, item)
    },
  })
})

onBeforeUnmount(() => {
  sortable?.destroy()
})

async function loadLocalCopayers() {
  const coPayers = sharedWallet.value.coPayers
  const result = await loadLocalSharedCopayers(coPayers)
  if (result.ok && result.copayers.length > 0) {
    currentWalletStore.setLocalCopayers({
      localCopayers: result.copayers as unknown as SharedCopayer[],
    })
  }
}

function handleChangeSponsor(value: string) {
  const nextPayers: SharedCopayer[] = []
  for (const payer of sharedWallet.value.coPayers) {
    if (payer.address !== value) {
      nextPayers.push(payer)
    } else {
      sponsorPayer.value = localCopayers.value.find((item) => item.address === value) || null
    }
  }
  payers.value = nextPayers
}

function back() {
  emit('sendConfirmBack')
}

function next() {
  const sponsor = sponsorPayer.value
  if (!sponsor) {
    return
  }

  currentWalletStore.setTransfer({
    transfer: {
      coPayers: [sponsor, ...payers.value],
    },
  })
  emit('sendConfirmNext')
}
</script>
