<template>
  <div class="receive-page ow-page ow-page--flush-top">
    <breadcrumb
      :current="$t('commonWalletHome.receive')"
      :routes="walletContext.routes"
      @backEvent="goBackToWallets"
    ></breadcrumb>
    <section class="ow-panel receive-shell">
      <div class="ow-panel-body receive-shell__body">
        <div class="receive-shell__grid">
          <div class="receive-shell__qr-panel">
            <div class="receive-shell__qr-frame">
              <vue-qrcode :value="walletAddress" :size="220"></vue-qrcode>
            </div>
          </div>

          <div class="receive-shell__content">
            <div class="receive-shell__title-row">
              <h1 class="receive-shell__title">{{ walletName }}</h1>
              <span
                v-if="isSharedWallet"
                class="receive-shell__threshold"
                :title="$t('importSharedWallet.requiredCopayerNumber')"
              >
                {{ requiredNumber }}- OF -{{ totalNumber }}
              </span>
            </div>

            <div class="receive-shell__details">
              <div class="receive-shell__detail">
                <span class="receive-shell__label">{{ $t('commonWalletHome.walletAddress') }}</span>
                <div class="receive-shell__value-bar receive-shell__value-bar--address">
                  <span class="receive-shell__value receive-shell__value--address">{{
                    walletAddress
                  }}</span>
                  <button
                    type="button"
                    class="receive-shell__icon-button ow-icon-action"
                    @click="copy(walletAddress)"
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </div>

              <div class="receive-shell__detail" v-if="walletPublicKey">
                <span class="receive-shell__label">{{ $t('commonWalletHome.publicKey') }}</span>
                <div class="receive-shell__value-bar">
                  <span class="receive-shell__value">{{ walletPublicKey }}</span>
                  <button
                    type="button"
                    class="receive-shell__icon-button ow-icon-action"
                    @click="copy(walletPublicKey)"
                  >
                    <CopyOutlined />
                  </button>
                </div>
              </div>
            </div>

            <div v-if="isSharedWallet && coPayers.length" class="receive-shell__copayers">
              <span class="receive-shell__label">{{ $t('sharedWalletHome.copayers') }}</span>
              <div class="ow-copayer-list receive-shell__copayer-list">
                <div
                  v-for="(copayer, index) in coPayers"
                  :key="copayer.publickey || copayer.publicKey || copayer.address"
                  class="ow-copayer-row receive-shell__copayer-row"
                >
                  <span class="ow-step-circle">{{ index + 1 }}</span>
                  <div class="receive-shell__copayer-copy">
                    <span class="ow-copayer-name receive-shell__copayer-name">
                      {{ copayer.name }}
                      <span
                        v-if="isLocalCopayer(copayer.address)"
                        class="receive-shell__local-marker"
                        :aria-label="$t('sharedWalletHome.localWallet')"
                        :title="$t('sharedWalletHome.localWallet')"
                      >
                        <UserOutlined />
                      </span>
                    </span>
                    <span class="ow-copayer-address receive-shell__copayer-address">{{
                      copayer.address
                    }}</span>
                    <span
                      v-if="copayer.publickey || copayer.publicKey"
                      class="ow-copayer-public-key receive-shell__copayer-key"
                    >
                      {{ copayer.publickey || copayer.publicKey }}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import VueQrcode from 'qrcode.vue'
import { CopyOutlined, UserOutlined } from '@ant-design/icons-vue'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'
import { useCommonReceivePage } from '../../workflows/wallet/useCommonReceivePage'

defineOptions({
  name: 'CommonReceivePage',
})

const {
  walletContext,
  goBackToWallets,
  isSharedWallet,
  coPayers,
  requiredNumber,
  totalNumber,
  isLocalCopayer,
} = useCommonReceivePage()
const { copyText } = useClipboardNotice()

const walletName = computed(() => String(walletContext.value.walletName || ''))
const walletAddress = computed(() => String(walletContext.value.address || ''))
const walletPublicKey = computed(() => String(walletContext.value.pk || ''))

async function copy(value: string) {
  await copyText(value)
}
</script>

<style scoped>
.receive-page {
  display: grid;
  gap: var(--ow-space-4);
}

.receive-shell {
  width: min(100%, 860px);
  margin: 0 auto;
}

.receive-shell__body {
  display: grid;
}

.receive-shell__grid {
  display: grid;
  grid-template-columns: 280px minmax(360px, 460px);
  gap: var(--ow-space-5);
  align-items: start;
  justify-content: center;
}

.receive-shell__qr-panel {
  display: grid;
  gap: var(--ow-space-2);
  justify-items: center;
}

.receive-shell__title-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-3);
}

.receive-shell__title {
  margin: 0;
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
  line-height: var(--ow-line-height-title);
  color: var(--ow-color-text-primary);
}

.receive-shell__threshold {
  flex-shrink: 0;
  padding: 4px 10px;
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-surface-muted);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-brand);
  white-space: nowrap;
}

.receive-shell__copayers {
  display: grid;
  gap: var(--ow-space-2);
}

.receive-shell__copayer-list {
  width: 100%;
  max-width: none;
  display: grid;
  gap: var(--ow-space-2);
  margin: 0;
}

.receive-shell__copayer-row {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: var(--ow-space-3);
  align-items: start;
  margin: 0;
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.receive-shell__copayer-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.receive-shell__copayer-name {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  width: auto;
  margin: 0;
  overflow: visible;
  white-space: normal;
}

.receive-shell__local-marker {
  display: inline-flex;
  color: var(--ow-color-brand);
}

.receive-shell__copayer-address,
.receive-shell__copayer-key {
  width: auto;
  margin: 0;
  overflow-wrap: anywhere;
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  text-align: left;
  white-space: normal;
}

.receive-shell__qr-frame {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 280px;
  height: 280px;
  padding: var(--ow-space-3);
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.receive-shell__content {
  display: grid;
  gap: var(--ow-space-4);
}

.receive-shell__details {
  display: grid;
  gap: var(--ow-space-3);
}

.receive-shell__detail {
  display: grid;
  gap: var(--ow-space-1);
}

.receive-shell__label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.receive-shell__value-bar {
  display: flex;
  align-items: center;
  gap: var(--ow-space-3);
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.receive-shell__value {
  flex: 1;
  min-width: 0;
  overflow-wrap: anywhere;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.receive-shell__value--address {
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  font-size: 12px;
  letter-spacing: -0.015em;
}

.receive-shell__icon-button {
  flex-shrink: 0;
  color: var(--ow-color-brand);
}

@media (max-width: 860px) {
  .receive-shell__grid {
    grid-template-columns: 1fr;
  }

  .receive-shell__qr-panel {
    order: 2;
  }
}

@media (max-width: 560px) {
  .receive-shell__qr-frame {
    width: min(100%, 260px);
    height: auto;
    min-height: 260px;
  }

  .receive-shell__value-bar {
    align-items: flex-start;
  }
}
</style>
