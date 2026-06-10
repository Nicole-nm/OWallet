<template>
  <div class="shared-send-confirm">
    <shared-transfer-review-panel
      :amount="summary.amount"
      :asset="summary.asset"
      :editable="true"
      :fee="summary.fee"
      :payers="payers"
      :recipient="summary.recipient"
      :required-number="sharedWallet.requiredNumber"
      :sponsor-address="sponsorAddress"
      :sponsor-options="localCopayers"
      :title-key="summary.titleKey"
      :total-number="sharedWallet.totalNumber"
      @reorder="handleReorder"
      @sponsor-change="handleChangeSponsor"
    ></shared-transfer-review-panel>

    <page-footer-actions align="between" class="shared-send-confirm__actions">
      <a-button type="default" variant="secondary" @click="back">{{
        $t('sharedWalletHome.back')
      }}</a-button>
      <a-button type="primary" variant="primary" :disabled="!sponsorPayer" @click="next">
        {{ $t('sharedWalletHome.next') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { resolveDefaultTransferFee } from '../../shared/lib/constants'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { loadLocalSharedCopayers } from '../../modules/wallet/application/sharedWallet/sharedWalletOverviewApplicationService'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import SharedTransferReviewPanel from './SharedTransferReviewPanel.vue'
import type { SharedCopayer } from '../../shared/types'
defineOptions({
  name: 'SendConfirm',
})

const emit = defineEmits(['cancelEvent', 'sendConfirmBack', 'sendConfirmNext'])
const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

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
const sponsorAddress = ref('')
const summary = computed(() =>
  transfer.value.isRedeem
    ? {
        amount: redeem.value.claimableOng,
        asset: 'ONG',
        fee: resolveDefaultTransferFee('shared'),
        recipient: '',
        titleKey: 'sharedWalletHome.redeemOng',
      }
    : {
        amount: transfer.value.amount,
        asset: transfer.value.asset,
        fee: transfer.value.gas,
        recipient: transfer.value.to,
        titleKey: 'sharedWalletHome.transaction',
      }
)

onMounted(() => {
  loadLocalCopayers()
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
  sponsorAddress.value = value
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

function handleReorder(oldIndex: number, newIndex: number) {
  const item = payers.value.splice(oldIndex, 1)[0]
  if (!item) {
    return
  }
  payers.value.splice(newIndex, 0, item)
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

<style scoped lang="scss">
.shared-send-confirm {
  width: min(100%, 880px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-3);
}

.shared-send-confirm__actions {
  height: 72px;
  margin-top: 0;
}

.shared-send-confirm__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}
</style>
