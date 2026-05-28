<template>
  <div class="shared-join-result">
    <section v-if="sharedWallet" class="shared-join-result__section">
      <div class="shared-join-result__section-copy">
        <span class="shared-join-result__section-title">{{ $t('importSharedWallet.import') }}</span>
        <span class="shared-join-result__section-caption">{{ sharedWallet.sharedWalletName }}</span>
      </div>

      <div class="shared-join-result__summary-card">
        <div class="shared-join-result__summary-row">
          <span class="shared-join-result__label">{{ $t('importSharedWallet.address') }}</span>
          <span class="shared-join-result__value shared-join-result__value--break">{{
            sharedWallet.sharedWalletAddress
          }}</span>
        </div>
        <div class="shared-join-result__summary-row">
          <span class="shared-join-result__label">{{
            $t('importSharedWallet.totalCopayerNumber')
          }}</span>
          <span class="shared-join-result__value">{{ sharedWallet.totalNumber }}</span>
        </div>
        <div class="shared-join-result__summary-row">
          <span class="shared-join-result__label">{{
            $t('importSharedWallet.requiredCopayerNumber')
          }}</span>
          <span class="shared-join-result__value">{{ sharedWallet.requiredNumber }}</span>
        </div>
      </div>

      <div class="shared-join-result__copayers">
        <div
          class="shared-join-result__copayer"
          v-for="(copayer, index) in sharedWallet.coPayers"
          :key="copayer.publickey"
        >
          <span class="ow-step-circle">{{ Number(index) + 1 }}</span>
          <div class="shared-join-result__copayer-copy">
            <span class="shared-join-result__copayer-name">{{ copayer.name }}</span>
            <span class="shared-join-result__copayer-address">{{ copayer.address }}</span>
          </div>
        </div>
      </div>
    </section>

    <section v-else class="shared-join-result__section shared-join-result__section--empty">
      <div class="notfound"></div>
      <div class="shared-join-result__empty-copy">
        <p class="shared-join-result__empty-line">{{ $t('importSharedWallet.sorry') }}</p>
        <p class="shared-join-result__empty-line">{{ $t('importSharedWallet.notFound') }}</p>
      </div>
    </section>

    <page-footer-actions align="between" class="shared-join-result__actions">
      <a-button variant="secondary" type="default" @click="emit('back')">
        {{ $t('importSharedWallet.back') }}
      </a-button>
      <a-button variant="primary" type="primary" @click="emit('next')" :disabled="!sharedWallet">
        {{ $t('importSharedWallet.join') }}
      </a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { PropType } from 'vue'
import PageFooterActions from '../../../../../shared/ui/actions/PageFooterActions.vue'

defineOptions({
  name: 'InputPass',
})

interface SharedWalletCopayer {
  name: string
  publickey: string
  address: string
}

interface ImportSharedWalletSummary {
  sharedWalletName: string
  sharedWalletAddress: string
  totalNumber: string | number
  requiredNumber: string | number
  coPayers: SharedWalletCopayer[]
}

defineProps({
  sharedWallet: {
    type: Object as PropType<ImportSharedWalletSummary | null>,
    default: () => null,
  },
})

const emit = defineEmits(['back', 'next'])
</script>

<style scoped>
.shared-join-result {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-bottom: 96px;
  display: grid;
  gap: var(--ow-space-4);
}

.shared-join-result__section {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-join-result__section--empty {
  justify-items: center;
}

.shared-join-result__section-copy {
  display: grid;
  gap: 2px;
}

.shared-join-result__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-join-result__section-caption,
.shared-join-result__label,
.shared-join-result__copayer-address,
.shared-join-result__empty-line {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-join-result__summary-card {
  display: grid;
  gap: var(--ow-space-2);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-join-result__summary-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-3);
  padding-bottom: 8px;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.shared-join-result__summary-row:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.shared-join-result__value {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
  text-align: right;
}

.shared-join-result__value--break,
.shared-join-result__copayer-address {
  overflow-wrap: anywhere;
}

.shared-join-result__copayers {
  display: grid;
  gap: var(--ow-space-2);
}

.shared-join-result__copayer {
  display: grid;
  grid-template-columns: 24px minmax(0, 1fr);
  gap: var(--ow-space-3);
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-join-result__copayer-copy {
  display: grid;
  gap: 2px;
  min-width: 0;
}

.shared-join-result__copayer-name {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.notfound {
  width: 280px;
  height: 228px;
  margin: 5px auto 15px;
  background: url('../../../../../assets/notfound.png') center center;
  background-size: cover;
}

.shared-join-result__empty-copy {
  display: grid;
  gap: 2px;
  justify-items: center;
}

.shared-join-result__empty-line {
  margin: 0;
  text-align: center;
}

.shared-join-result__actions {
  height: 72px;
}

.shared-join-result__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 560px) {
  .shared-join-result {
    gap: var(--ow-space-3);
  }

  .shared-join-result__section {
    padding: 12px;
  }

  .shared-join-result__summary-row {
    grid-template-columns: 1fr;
  }

  .shared-join-result__value {
    text-align: left;
  }

  .shared-join-result__actions {
    height: 68px;
  }

  .shared-join-result__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
