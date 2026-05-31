<template>
  <div class="shared-transfer-review">
    <section class="shared-transfer-review__section">
      <div class="shared-transfer-review__section-copy">
        <span class="shared-transfer-review__section-title">{{ $t(titleKey) }}</span>
        <span class="shared-transfer-review__section-caption">{{
          $t('sharedWalletHome.reviewTransaction')
        }}</span>
      </div>

      <div class="shared-transfer-review__summary-card">
        <send-asset-summary :amount="amount" :asset="asset" :recipient="recipient" :fee="fee" />
      </div>
    </section>

    <section class="shared-transfer-review__section">
      <div class="shared-transfer-review__section-header">
        <span class="shared-transfer-review__section-title">{{
          $t('sharedWalletHome.sponsor')
        }}</span>
        <span class="shared-transfer-review__threshold">
          {{ requiredNumber }} - OF - {{ totalNumber }}
        </span>
      </div>

      <div class="shared-transfer-review__signer-card">
        <div v-if="editable" class="shared-transfer-review__sponsor-row">
          <span class="shared-transfer-review__step-circle">1</span>
          <a-select
            class="shared-transfer-review__sponsor-select"
            :options="sponsorOptions"
            :placeholder="$t('sharedWalletHome.sponsor')"
            :value="sponsorAddress || undefined"
            @change="$emit('sponsor-change', String($event))"
          ></a-select>
        </div>

        <div v-else-if="payers[0]" class="shared-transfer-review__signer-row">
          <span class="shared-transfer-review__step-circle" :class="signedStateClass(payers[0])">
            1
          </span>
          <span class="shared-transfer-review__signer-name">{{ payers[0].name }}</span>
          <span class="shared-transfer-review__signer-address">{{ payers[0].address }}</span>
        </div>

        <div class="shared-transfer-review__sequence-header">
          {{ $t(editable ? 'sharedWalletHome.dragDecide' : 'sharedWalletHome.signSequence') }}
        </div>

        <div ref="sequenceElement" class="shared-transfer-review__sequence">
          <div
            v-for="(payer, index) in sequencePayers"
            :key="payer.address"
            class="shared-transfer-review__signer-row"
            :class="{ 'shared-transfer-review__signer-row--draggable': editable }"
          >
            <span class="shared-transfer-review__step-circle" :class="signedStateClass(payer)">
              {{ index + 2 }}
            </span>
            <span class="shared-transfer-review__signer-name">{{ payer.name }}</span>
            <span class="shared-transfer-review__signer-address">{{ payer.address }}</span>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import Sortable from 'sortablejs'
import SendAssetSummary from '../../shared/ui/cards/SendAssetSummary.vue'
import type { SharedCopayer } from '../../shared/types'

defineOptions({
  name: 'SharedTransferReviewPanel',
})

const props = withDefaults(
  defineProps<{
    amount: string | number
    asset?: string
    editable?: boolean
    fee: string | number
    payers: SharedCopayer[]
    recipient?: string
    requiredNumber: string | number
    sponsorAddress?: string
    sponsorOptions?: SharedCopayer[]
    titleKey: string
    totalNumber: string | number
  }>(),
  {
    asset: '',
    editable: false,
    recipient: '',
    sponsorAddress: '',
    sponsorOptions: () => [],
  }
)

const emit = defineEmits<{
  reorder: [oldIndex: number, newIndex: number]
  'sponsor-change': [address: string]
}>()

const sequenceElement = ref<HTMLElement | null>(null)
const sequencePayers = computed(() => (props.editable ? props.payers : props.payers.slice(1)))
let sortable: Sortable | null = null

onMounted(() => {
  if (!props.editable || !sequenceElement.value) {
    return
  }

  sortable = Sortable.create(sequenceElement.value, {
    animation: 150,
    onEnd: (event: { oldIndex?: number; newIndex?: number }) => {
      if (event.oldIndex === undefined || event.newIndex === undefined) {
        return
      }
      emit('reorder', event.oldIndex, event.newIndex)
    },
  })
})

onBeforeUnmount(() => {
  sortable?.destroy()
})

function signedStateClass(payer: SharedCopayer): string {
  if (props.editable || payer.isSign === undefined) {
    return ''
  }
  return payer.isSign
    ? 'shared-transfer-review__step-circle--signed'
    : 'shared-transfer-review__step-circle--unsigned'
}
</script>

<style scoped>
.shared-transfer-review {
  display: grid;
  gap: var(--ow-space-3);
}

.shared-transfer-review__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.shared-transfer-review__section-copy {
  display: grid;
  gap: 2px;
}

.shared-transfer-review__section-header,
.shared-transfer-review__sponsor-row,
.shared-transfer-review__signer-row {
  display: flex;
  align-items: center;
  gap: var(--ow-space-2);
}

.shared-transfer-review__section-header {
  justify-content: space-between;
}

.shared-transfer-review__section-title,
.shared-transfer-review__sequence-header {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-transfer-review__section-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-transfer-review__threshold {
  padding: 4px 8px;
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-surface-card);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-brand);
}

.shared-transfer-review__summary-card,
.shared-transfer-review__signer-card {
  padding: 12px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.shared-transfer-review__summary-card :deep(.ow-summary-table) {
  display: grid;
  gap: var(--ow-space-2);
  padding: 0;
}

.shared-transfer-review__summary-card :deep(.ow-summary-row) {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-2);
  padding: 0 0 6px;
  border-bottom: 1px solid var(--ow-color-border-subtle);
}

.shared-transfer-review__summary-card :deep(.ow-summary-label) {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.shared-transfer-review__summary-card :deep(.ow-summary-value) {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.shared-transfer-review__signer-card {
  display: grid;
  gap: var(--ow-space-2);
}

.shared-transfer-review__sponsor-select {
  flex: 1;
  min-width: 0;
}

.shared-transfer-review__sequence-header {
  padding-top: var(--ow-space-1);
  color: var(--ow-color-text-secondary);
}

.shared-transfer-review__sequence {
  display: grid;
  gap: var(--ow-space-1);
}

.shared-transfer-review__signer-row {
  min-width: 0;
  padding: 8px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-control);
}

.shared-transfer-review__signer-row--draggable {
  cursor: grab;
}

.shared-transfer-review__signer-row--draggable:hover {
  border-color: var(--ow-color-brand);
  background: var(--ow-color-surface-muted);
}

.shared-transfer-review__step-circle {
  display: inline-flex;
  flex: 0 0 24px;
  align-items: center;
  justify-content: center;
  width: 24px;
  height: 24px;
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-pill);
  background: var(--ow-color-surface-muted);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-caption);
  color: var(--ow-color-text-primary);
}

.shared-transfer-review__step-circle--signed {
  border-color: var(--ow-color-brand);
  background: var(--ow-color-brand);
  color: var(--ow-color-text-on-brand);
}

.shared-transfer-review__step-circle--unsigned {
  color: var(--ow-color-text-secondary);
}

.shared-transfer-review__signer-name {
  flex: 0 0 150px;
  min-width: 0;
  overflow: hidden;
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shared-transfer-review__signer-address {
  flex: 1;
  min-width: 0;
  overflow: hidden;
  color: var(--ow-color-text-secondary);
  text-align: right;
  text-overflow: ellipsis;
  white-space: nowrap;
}

@media (max-width: 560px) {
  .shared-transfer-review__section {
    padding: 10px 12px;
  }

  .shared-transfer-review__summary-card :deep(.ow-summary-row) {
    grid-template-columns: 1fr;
  }

  .shared-transfer-review__signer-name {
    flex-basis: 90px;
  }
}
</style>
