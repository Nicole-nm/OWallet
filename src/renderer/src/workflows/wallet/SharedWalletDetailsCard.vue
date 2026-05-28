<template>
  <div class="ow-detail-card">
    <div class="ow-detail-main" @click="toSharedWalletHome(wallet)">
      <div class="ow-detail-kind">{{ $t('common.sharedWallet') }}</div>
      <div class="ow-detail-name ow-detail-name--link">{{ wallet.sharedWalletName }}</div>
      <!--<img class="img-wallet-edit" src="./../assets/edit.png" alt="">-->
      <div class="ow-detail-address">
        <div>Wallet Address:</div>
        <span class="ow-detail-address-text">{{ wallet.sharedWalletAddress }}</span>
      </div>
    </div>
    <div v-show="addressCopied" class="ow-copied-label">Copied</div>
    <img class="ow-detail-copy" src="../../assets/copy.png" @click="copyAddress(wallet)" alt="" />
    <div class="ow-detail-actions">
      <span class="ow-icon-delete" @click="deleteWallet()"></span>
    </div>

    <a-modal
      :title="$t('common.confirmation')"
      v-model:open="showModal"
      @ok="handleDelete"
      @cancel="handleCancel"
    >
      <div>
        <p class="shared-wallet-details__modal-copy">
          {{ $t('wallets.deleteingWallet') }}
          {{ wallet.sharedWalletAddress }}
        </p>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, PropType } from 'vue'
import { useRouter } from 'vue-router'
import { deleteStoredSharedWallet } from '../../modules/wallet/application/walletDetailApplicationService'
import { useCopyFeedback } from '../../shared/composables/useCopyFeedback'
import { useLoadingModalStore } from '../../shared/composables/useGlobalLoading'
import { useSharedWalletSessionStore } from '../../stores/modules/SharedWalletSession'
import { useWalletsStore } from '../../stores/modules/Wallets'
import { ROUTE_PATHS } from '../../router/routes'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
defineOptions({
  name: 'SharedWalletDetails',
})

const props = defineProps({
  wallet: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
})

const router = useRouter()
const loadingStore = useLoadingModalStore()
const sharedWalletSessionStore = useSharedWalletSessionStore()
const walletsStore = useWalletsStore()

const addressCopied = ref(false)
const showModal = ref(false)
const { copied, copyText } = useCopyFeedback()

watch(copied, (value) => {
  addressCopied.value = value
})

function toSharedWalletHome(wallet: Record<string, unknown>) {
  sharedWalletSessionStore.setSharedWallet({ wallet })
  router.push({ path: ROUTE_PATHS.sharedWalletHome })
}

async function copyAddress(wallet: Record<string, unknown>) {
  await copyText(String(wallet.sharedWalletAddress || ''))
}

function deleteWallet() {
  showModal.value = true
}

async function handleDelete() {
  loadingStore.showLoadingModals()
  const result = await deleteStoredSharedWallet(String(props.wallet.sharedWalletAddress || ''))
  if (!result.ok) {
    loadingStore.hideLoadingModals()
    notifyError(result.errorKey || 'wallets.deleteFailed')
    return
  }

  walletsStore.deleteSharedWallet(String(props.wallet.sharedWalletAddress || ''))
  notifySuccess('wallets.deleteSucceess')
  showModal.value = false
  loadingStore.hideLoadingModals()
}

function handleCancel() {
  showModal.value = false
}
</script>

<style scoped>
.shared-wallet-details__modal-copy {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}
</style>
