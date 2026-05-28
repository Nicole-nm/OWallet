<template>
  <div class="ow-detail-card">
    <div>
      <div class="ow-detail-kind">
        <span>{{ isCommonWallet ? $t('common.normalWallet') : $t('common.hardwareWallet') }}</span>
        <p class="ow-detail-kind-note" v-if="!isCommonWallet && wallet.neo">
          {{ $t('common.neoCompatible') }}
        </p>
      </div>
      <div class="ow-detail-name ow-detail-name--link" @click="toWalletHome(wallet)">
        {{ wallet.label }}
      </div>
      <!--<img class="img-wallet-edit" src="./../assets/edit.png" alt="">-->
      <div class="ow-detail-address">
        <div>{{ $t('common.walletAddress') }}:</div>
        <span class="ow-detail-address-text">{{ wallet.address }}</span>
      </div>
    </div>
    <div v-show="addressCopied" class="ow-copied-label">Copied</div>
    <img class="ow-detail-copy" src="../../assets/copy.png" @click="copyAddress(wallet)" alt="" />
    <div class="ow-detail-actions">
      <span class="ow-icon-delete" @click="deleteWallet()" v-if="!isCommonWallet"></span>
      <a-dropdown v-if="isCommonWallet">
        <template #overlay>
          <a-menu>
            <a-menu-item key="1" @click="handleExportWallet()">
              <span>{{ $t('common.exportDat') }}</span>
            </a-menu-item>
            <a-menu-item key="2" @click="handleExportWIF()">
              <span>{{ $t('common.exportWIF') }}</span>
            </a-menu-item>
            <a-menu-item key="3" @click="handleChangePassword()">
              <span>{{ $t('common.changePassword') }}</span>
            </a-menu-item>
            <a-menu-item key="4" @click="deleteWallet()">
              <span>{{ $t('common.deleteWallet') }}</span>
            </a-menu-item>
          </a-menu>
        </template>
        <a-button variant="ghost" size="compact">
          {{ $t('common.more') }}<DownOutlined />
        </a-button>
      </a-dropdown>
    </div>

    <a-modal
      :title="modalTitle"
      v-model:open="passModal"
      @ok="handleValidatePasswordFromExport"
      @cancel="handleCancel"
    >
      <div>
        <p class="wallet-details__modal-copy">
          {{ option === 'TO_DELETE' ? $t('wallets.deleteingWallet') : '' }}
          {{ option === 'TO_EXPORT' ? $t('wallets.exportingWallet') : '' }}
          {{ option === 'EXPORT_WIF' ? $t('wallets.exportingWIF') : '' }}
          {{ wallet.address }}
        </p>
        <div v-if="isCommonWallet">
          <p>{{ $t('common.enterWalletPassword') }}</p>
          <a-input
            class="input"
            v-model:value="password"
            :placeholder="$t('common.password')"
            type="password"
          ></a-input>
        </div>
      </div>
    </a-modal>

    <a-modal
      :title="$t('common.changePassword')"
      v-model:open="changePassModal"
      @ok="handleChangePassOk"
      @cancel="handleChangePassCancel"
    >
      <div class="change-password-input">
        <div>
          <a-input
            type="password"
            class="input change-password"
            :status="changePassErrors.oldPassword ? 'error' : ''"
            v-model:value="oldPassword"
            :placeholder="$t('wallets.oldPassword')"
          ></a-input>
          <span class="v-validate-span-errors" v-show="changePassErrors.oldPassword">{{
            changePassErrors.oldPassword
          }}</span>
        </div>

        <div>
          <a-input
            type="password"
            class="input change-password"
            :status="changePassErrors.newPassword ? 'error' : ''"
            v-model:value="newPassword"
            :placeholder="$t('wallets.newPassword')"
          ></a-input>
          <span class="v-validate-span-errors" v-show="changePassErrors.newPassword">{{
            changePassErrors.newPassword
          }}</span>
        </div>

        <div>
          <a-input
            type="password"
            class="input change-password"
            :status="changePassErrors.reNewPassword ? 'error' : ''"
            v-model:value="reNewPassword"
            :placeholder="$t('wallets.reNewPassword')"
          ></a-input>
          <span class="v-validate-span-errors" v-show="changePassErrors.reNewPassword">{{
            changePassErrors.reNewPassword
          }}</span>
        </div>
      </div>
    </a-modal>

    <a-modal
      :title="$t('common.changePassSuccess')"
      v-model:open="showChangePassTip"
      @ok="handleShowChangePassTipOk"
    >
      <div class="change-pass-success">
        <p class="change-pass-success__tip">
          <WarningFilled /> {{ $t('common.changePassSuccessTip') }}
        </p>
        <a-button type="primary" @click="exportWallet(wallet)">{{
          $t('common.download')
        }}</a-button>
      </div>
    </a-modal>
  </div>
</template>

<script setup lang="ts">
import { computed, ref, watch, PropType } from 'vue'
import { useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { useCopyFeedback } from '../../shared/composables/useCopyFeedback'
import { useCurrentWalletStore } from '../../stores/modules/CurrentWallet'
import { ROUTE_NAMES } from '../../router/routes'
import { DownOutlined, WarningFilled } from '@ant-design/icons-vue'
import { usePasswordChange } from './usePasswordChange'
import { useWalletExport } from './useWalletExport'
import { useWalletDeletion } from './useWalletDeletion'

defineOptions({
  name: 'JsonWalletDetails',
})

const props = defineProps({
  wallet: {
    type: Object as PropType<Record<string, unknown>>,
    default: () => ({}),
  },
})

const { t } = useI18n()
const router = useRouter()
const currentWalletStore = useCurrentWalletStore()

const isCommonWallet = computed(() => Boolean(props.wallet.key))
const modalTitle = computed(() =>
  isCommonWallet.value ? t('common.authentication') : t('common.confirmation')
)

const addressCopied = ref(false)
const { copied, copyText } = useCopyFeedback()

watch(copied, (value) => {
  addressCopied.value = value
})

function toWalletHome(wallet: Record<string, unknown>) {
  currentWalletStore.setCurrentWallet({ wallet })
  router.push({ name: ROUTE_NAMES.WALLET_DASHBOARD })
}

async function copyAddress(wallet: Record<string, unknown>) {
  await copyText(String(wallet.address || ''))
}

const {
  oldPassword,
  newPassword,
  reNewPassword,
  changePassErrors,
  changePassModal,
  showChangePassTip,
  handleChangePassword,
  handleChangePassOk,
  handleChangePassCancel,
  handleShowChangePassTipOk,
} = usePasswordChange(() => props.wallet)

const {
  passModal,
  password,
  option,
  openModal,
  handleExportWallet,
  handleExportWIF,
  exportWallet,
  handleCancel,
  handleValidatePassword: handleValidatePasswordFromExport,
} = useWalletExport(
  () => props.wallet,
  () => isCommonWallet.value,
  () => handleDelete(),
  () => {
    showChangePassTip.value = false
  }
)

const { deleteWallet, handleDelete } = useWalletDeletion(
  () => props.wallet,
  () => isCommonWallet.value,
  openModal,
  () => {
    passModal.value = false
  }
)
</script>

<style scoped>
.wallet-details__modal-copy {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

.change-password-input div {
  margin-bottom: 15px;
}
.change-password-input :last-child {
  margin: 0;
}
.change-pass-success button {
  display: block;
  margin: 0 auto;
}

.change-pass-success__tip {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}
</style>
