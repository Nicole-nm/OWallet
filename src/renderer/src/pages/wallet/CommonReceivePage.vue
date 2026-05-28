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
            <h1 class="receive-shell__title">{{ walletName }}</h1>

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
import { CopyOutlined } from '@ant-design/icons-vue'
import { useClipboardNotice } from '../../shared/composables/useClipboardNotice'
import { useCommonReceivePage } from '../../workflows/wallet/useCommonReceivePage'

defineOptions({
  name: 'CommonReceivePage',
})

const { walletContext, goBackToWallets } = useCommonReceivePage()
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
}

.receive-shell__body {
  display: grid;
}

.receive-shell__grid {
  display: grid;
  grid-template-columns: 280px minmax(360px, 460px);
  gap: var(--ow-space-5);
  align-items: center;
  justify-content: center;
}

.receive-shell__qr-panel {
  display: grid;
  gap: var(--ow-space-2);
  justify-items: center;
}

.receive-shell__title {
  margin: 0;
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
  line-height: var(--ow-line-height-title);
  color: var(--ow-color-text-primary);
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

.receive-shell__value--address::-webkit-scrollbar {
  height: 4px;
}

.receive-shell__value--address::-webkit-scrollbar-thumb {
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-border-default);
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
