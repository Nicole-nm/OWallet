<template>
  <div class="ow-page-shell shared-wallet-copayers">
    <breadcrumb
      :current="$t('sharedWalletHome.copayers')"
      :routes="routes"
      @backEvent="backToWallets"
    ></breadcrumb>

    <section v-if="sharedWallet" class="ow-panel shared-wallet-copayers__panel">
      <header class="ow-panel-header shared-wallet-copayers__header">
        <div class="shared-wallet-copayers__header-copy">
          <h1 class="shared-wallet-copayers__title">{{ sharedWallet.sharedWalletName }}</h1>
          <p class="shared-wallet-copayers__address">
            {{ sharedWallet.sharedWalletAddress }}
          </p>
        </div>
      </header>

      <div class="ow-panel-body shared-wallet-copayers__body">
        <div class="shared-wallet-copayers__stats">
          <div class="shared-wallet-copayers__stat">
            <span class="shared-wallet-meta__label">{{
              $t('importSharedWallet.totalCopayerNumber')
            }}</span>
            <span class="shared-wallet-meta__value">{{ sharedWallet.totalNumber }}</span>
          </div>
          <div class="shared-wallet-copayers__stat">
            <span class="shared-wallet-meta__label">{{
              $t('importSharedWallet.requiredCopayerNumber')
            }}</span>
            <span class="shared-wallet-meta__value">{{ sharedWallet.requiredNumber }}</span>
          </div>
        </div>

        <section class="shared-wallet-copayers__section">
          <h2 class="shared-wallet-copayers__section-title">
            {{ $t('sharedWalletHome.copayers') }}
          </h2>

          <div class="ow-copayer-list shared-wallet-copayers__list">
            <div
              v-for="(copayer, index) in sharedWallet.coPayers"
              :key="copayer.publickey"
              class="ow-copayer-row shared-wallet-copayers__row"
            >
              <span class="ow-step-circle">{{ Number(index) + 1 }}</span>
              <div class="shared-wallet-copayers__copayer-copy">
                <span class="ow-copayer-name shared-wallet-copayers__copayer-name">
                  {{ copayer.name }}
                  <span
                    v-if="isLocalCopayer(copayer.address)"
                    class="shared-wallet-copayers__local-marker"
                    :aria-label="$t('sharedWalletHome.localWallet')"
                    :title="$t('sharedWalletHome.localWallet')"
                  >
                    <UserOutlined />
                  </span>
                </span>
                <span class="ow-copayer-address shared-wallet-copayers__copayer-address">
                  {{ copayer.address }}
                </span>
                <span class="ow-copayer-public-key shared-wallet-copayers__copayer-key">
                  {{ copayer.publickey }}
                </span>
              </div>
            </div>
          </div>
        </section>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { UserOutlined } from '@ant-design/icons-vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { useSharedWalletCopayerPage } from '../../workflows/wallet/useSharedWalletCopayerPage'

defineOptions({
  name: 'SharedWalletCopayerPage',
})

const { routes, backToWallets, isLocalCopayer, sharedWallet } = useSharedWalletCopayerPage()
</script>

<style scoped>
.shared-wallet-copayers {
  display: grid;
  gap: var(--ow-space-3);
}

.shared-wallet-copayers__panel {
  width: min(100%, 900px);
  margin: 0 auto;
}

.shared-wallet-copayers__header-copy,
.shared-wallet-copayers__body,
.shared-wallet-copayers__section,
.shared-wallet-copayers__list,
.shared-wallet-copayers__copayer-copy {
  display: grid;
}

.shared-wallet-copayers__header-copy,
.shared-wallet-copayers__copayer-copy {
  gap: 2px;
}

.shared-wallet-copayers__title,
.shared-wallet-copayers__address,
.shared-wallet-copayers__section-title {
  margin: 0;
}

.shared-wallet-copayers__title {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-title);
  color: var(--ow-color-text-primary);
}

.shared-wallet-copayers__address,
.shared-wallet-copayers__copayer-address,
.shared-wallet-copayers__copayer-key {
  overflow-wrap: anywhere;
  color: var(--ow-color-text-secondary);
}

.shared-wallet-copayers__body {
  gap: var(--ow-space-4);
}

.shared-wallet-copayers__stats {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-3);
}

.shared-wallet-copayers__stat {
  display: grid;
  gap: 4px;
  padding: var(--ow-space-3);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-wallet-meta__label {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-secondary);
}

.shared-wallet-meta__value {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-subtitle);
  color: var(--ow-color-text-primary);
}

.shared-wallet-copayers__section {
  gap: var(--ow-space-2);
}

.shared-wallet-copayers__section-title {
  font-family: var(--ow-font-bold);
  font-size: var(--ow-font-size-section);
  color: var(--ow-color-text-primary);
}

.shared-wallet-copayers__list {
  width: 100%;
  max-width: none;
  gap: var(--ow-space-2);
  margin: 0;
}

.shared-wallet-copayers__row {
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

.shared-wallet-copayers__copayer-name,
.shared-wallet-copayers__copayer-address,
.shared-wallet-copayers__copayer-key {
  width: auto;
  margin: 0;
}

.shared-wallet-copayers__copayer-name {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-1);
  overflow: visible;
  white-space: normal;
}

.shared-wallet-copayers__local-marker {
  display: inline-flex;
  color: var(--ow-color-brand);
}

.shared-wallet-copayers__copayer-address,
.shared-wallet-copayers__copayer-key {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  text-align: left;
  white-space: normal;
}

@media (max-width: 560px) {
  .shared-wallet-copayers {
    padding: 0 var(--ow-space-3);
  }

  .shared-wallet-copayers__body {
    padding: var(--ow-space-3);
  }

  .shared-wallet-copayers__stats {
    grid-template-columns: 1fr;
  }
}
</style>
