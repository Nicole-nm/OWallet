<template>
  <section class="ow-panel wallet-dashboard__toolbar">
    <div class="wallet-dashboard__toolbar-copy">
      <div class="wallet-dashboard__address-row">
        <span class="wallet-dashboard__address-label">{{ $t('sharedWalletHome.address') }}</span>
        <div class="wallet-dashboard__address-bar">
          <span class="wallet-dashboard__address">{{ address }}</span>
          <slot name="address-actions"></slot>
          <div class="wallet-dashboard__qr-trigger">
            <button type="button" class="wallet-dashboard__icon-button">
              <QrcodeOutlined />
            </button>
            <div class="wallet-dashboard__qr-preview">
              <vue-qrcode :value="address" :size="168"></vue-qrcode>
            </div>
          </div>
          <button type="button" class="wallet-dashboard__icon-button" @click="$emit('copy')">
            <CopyOutlined />
          </button>
        </div>
      </div>
    </div>

    <div v-if="showActions" class="wallet-dashboard__toolbar-actions">
      <a-button class="wallet-dashboard__action" type="primary" @click="$emit('send')">
        <SendOutlined />
        {{ $t('sharedWalletHome.send') }}
      </a-button>
      <a-button class="wallet-dashboard__action" type="primary" @click="$emit('receive')">
        <QrcodeOutlined />
        {{ $t('sharedWalletHome.receive') }}
      </a-button>
      <slot name="extra-actions"></slot>
    </div>
  </section>
</template>

<script setup lang="ts">
import VueQrcode from 'qrcode.vue'
import { CopyOutlined, QrcodeOutlined, SendOutlined } from '@ant-design/icons-vue'

withDefaults(
  defineProps<{
    address: string
    showActions?: boolean
  }>(),
  {
    showActions: true,
  }
)

defineEmits<{
  copy: []
  receive: []
  send: []
}>()
</script>

<style scoped lang="scss">
.wallet-dashboard__toolbar {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: var(--ow-space-3);
  padding: var(--ow-space-3);
}

.wallet-dashboard__toolbar-copy {
  min-width: 0;
  flex: 0 1 560px;
  width: min(100%, 560px);
}

.wallet-dashboard__address-row {
  display: grid;
  gap: var(--ow-space-1);
}

.wallet-dashboard__address-label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.wallet-dashboard__address-bar {
  display: flex;
  align-items: center;
  gap: var(--ow-space-3);
  min-width: 0;
  padding: 10px 12px;
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.wallet-dashboard__address {
  flex: 1;
  min-width: 0;
  white-space: nowrap;
  overflow-x: auto;
  overflow-y: hidden;
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.wallet-dashboard__qr-trigger {
  position: relative;
  display: inline-flex;
  flex-shrink: 0;
}

.wallet-dashboard__qr-preview {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 20;
  display: flex;
  padding: var(--ow-space-2);
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
  box-shadow: var(--ow-shadow-card);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
}

.wallet-dashboard__qr-trigger:hover .wallet-dashboard__qr-preview,
.wallet-dashboard__qr-trigger:focus-within .wallet-dashboard__qr-preview {
  opacity: 1;
  visibility: visible;
}

.wallet-dashboard__toolbar-actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--ow-space-2);
}

.wallet-dashboard__action {
  min-width: 132px;
  height: var(--ow-button-height);
  border: none;
  border-radius: var(--ow-radius-control);
  background: var(--ow-color-brand);
  font-family: var(--ow-font-medium);
}

.wallet-dashboard__address-bar :global(.wallet-dashboard__icon-button) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: var(--ow-button-height-compact);
  height: var(--ow-button-height-compact);
  padding: 0;
  border: 1px solid var(--wallet-dashboard-icon-button-border-color, var(--ow-color-border-subtle));
  border-radius: var(--ow-radius-pill);
  background: var(--wallet-dashboard-icon-button-background, var(--ow-color-surface-muted));
  color: var(--wallet-dashboard-icon-button-color, var(--ow-color-brand));
  cursor: pointer;
  transition:
    border-color var(--ow-duration) var(--ow-ease),
    background-color var(--ow-duration) var(--ow-ease),
    color var(--ow-duration) var(--ow-ease);
}

.wallet-dashboard__address-bar :global(.wallet-dashboard__icon-button:hover),
.wallet-dashboard__address-bar :global(.wallet-dashboard__icon-button:focus-visible) {
  border-color: var(--wallet-dashboard-icon-button-hover-border-color, var(--ow-color-brand));
  background: var(
    --wallet-dashboard-icon-button-hover-background,
    var(--ow-color-surface-selected)
  );
  color: var(--wallet-dashboard-icon-button-hover-color, var(--ow-color-brand));
}

.wallet-dashboard__address-bar :global(.wallet-dashboard__icon-button:disabled) {
  cursor: default;
  opacity: 1;
}
</style>
