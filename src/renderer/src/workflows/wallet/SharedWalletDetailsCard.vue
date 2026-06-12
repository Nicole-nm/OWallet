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
    <CopyOutlined class="ow-detail-copy" :title="$t('common.copy')" @click="copyAddress(wallet)" />
    <div class="ow-detail-actions">
      <DeleteOutlined
        class="ow-icon-delete"
        :title="$t('common.deleteWallet')"
        @click="openDeleteModal()"
      />
    </div>

    <a-modal
      :title="$t('common.confirmation')"
      v-model:open="showModal"
      @ok="handleDelete(String(wallet.sharedWalletAddress || ''))"
      @cancel="closeDeleteModal()"
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
import { PropType } from 'vue'
import { CopyOutlined, DeleteOutlined } from '@ant-design/icons-vue'
import { useSharedWalletDetailsCard } from './useSharedWalletDetailsCard'
import type { SharedWalletSession } from '../../shared/types'

defineOptions({
  name: 'SharedWalletDetails',
})

defineProps({
  wallet: {
    type: Object as PropType<SharedWalletSession>,
    required: true,
  },
})

const {
  addressCopied,
  showModal,
  toSharedWalletHome,
  copyAddress,
  openDeleteModal,
  closeDeleteModal,
  handleDelete,
} = useSharedWalletDetailsCard()
</script>

<style scoped lang="scss">
.shared-wallet-details__modal-copy {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}
</style>
