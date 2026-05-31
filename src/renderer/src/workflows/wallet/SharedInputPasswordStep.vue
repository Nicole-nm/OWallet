<template>
  <shared-signature-approval-panel
    v-model:checked="checked"
    v-model:password="password"
    :ledger-ready="Boolean(ledgerPk)"
    :ledger-status="ledgerStatus"
    :sending="sending"
    :signer-type="sponsorWallet.type"
    @back="back"
    @submit="submit"
  ></shared-signature-approval-panel>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { createAndSubmitSharedTransfer } from '../../modules/wallet/application/sharedWallet/sharedWalletTransactionApplicationService'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import { useSettingStore } from '../../stores/modules/Setting'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { useLedgerStatusMonitor } from '../../modules/wallet/composables/useLedgerStatusMonitor'
import SharedSignatureApprovalPanel from './SharedSignatureApprovalPanel.vue'
import type { SharedCopayer, SharedWalletSigner } from '../../shared/types'

defineOptions({
  name: 'InputPassword',
})

const emit = defineEmits(['inputPassBack', 'inputPassNext'])
const settingStore = useSettingStore()
const loadingStore = useLoadingModalStore()
const currentWalletStore = useCurrentWalletStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()

const sharedWallet = computed(() => sharedWalletSessionStore.wallet)
const transfer = computed(() => currentWalletStore.transfer)
const redeem = computed(() => currentWalletStore.redeem)
const payers = ref<SharedCopayer[]>([])
const password = ref('')
const sponsorWallet = ref<SharedWalletSigner>({ type: '', address: '', publicKey: '' })
const checked = ref(false)
const sending = ref(false)
const { ledgerStatus, ledgerPk } = useLedgerStatusMonitor({
  shouldPoll: computed(() => sponsorWallet.value.type === 'HardwareWallet'),
})

function isSharedCopayer(payer: unknown): payer is SharedCopayer {
  return Boolean(payer && typeof payer === 'object' && 'address' in payer && 'name' in payer)
}

onMounted(() => {
  const coPayers = transfer.value.coPayers.filter(isSharedCopayer)
  payers.value = coPayers
  const sponsor = coPayers[0] || { address: '', name: '' }
  sponsorWallet.value = {
    ...sponsor,
    type: String(sponsor?.type || ''),
    address: sponsor?.address || '',
    publicKey: sponsor?.publicKey || sponsor?.publickey || '',
  }
})

function back() {
  emit('inputPassBack')
}

async function submit() {
  if (sending.value) {
    return
  }

  sending.value = true
  loadingStore.showLoadingModals()
  const result = await createAndSubmitSharedTransfer({
    network: settingStore.network,
    sharedWallet: sharedWallet.value,
    transfer: transfer.value,
    redeem: redeem.value,
    sponsorWallet: sponsorWallet.value,
    password: password.value,
  })

  if (!result.ok) {
    if ('cancelled' in result && result.cancelled) {
      loadingStore.hideLoadingModals()
      sending.value = false
      return
    }

    notifyError(result.errorKey || 'common.networkErr')
    loadingStore.hideLoadingModals()
    sending.value = false
    return
  }

  sending.value = false
  emit('inputPassNext')
  notifySuccess('sharedWalletHome.createTransferSuccess')
  loadingStore.hideLoadingModals()
}
</script>
