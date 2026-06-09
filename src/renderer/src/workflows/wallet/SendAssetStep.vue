<template>
  <div class="send-step">
    <section class="send-step__section">
      <div class="send-step__section-header">
        <div class="send-step__section-copy">
          <span class="send-step__section-title">{{ $t('sharedWalletHome.send') }}</span>
        </div>
        <div class="send-step__balance-pill">
          <span class="send-step__balance-label">{{ $t('sharedWalletHome.balance') }}</span>
          <span class="send-step__balance-value">{{ availableBalance }}</span>
        </div>
      </div>

      <div class="ow-flow-grid send-step__asset-grid">
        <div class="send-step__field-group">
          <label class="send-step__label">{{ $t('sharedWalletHome.asset') }}</label>
          <a-select v-model:value="scriptHash" @change="changeAsset" class="send-step__select">
            <a-select-option value="ONT">ONT</a-select-option>
            <a-select-option value="ONG">ONG</a-select-option>
            <a-select-option
              v-for="oep4 of oep4s"
              :key="oep4.contract_hash"
              :value="oep4.contract_hash"
            >
              {{ oep4.symbol }}
            </a-select-option>
          </a-select>
        </div>

        <div class="send-step__field-group">
          <label class="send-step__label">{{ $t('sharedWalletHome.amount') }}</label>
          <a-input-search
            v-model:value="amount"
            :placeholder="$t('sharedWalletHome.amount')"
            class="send-step__amount"
            :class="validAmount ? '' : 'error-amount'"
            type="number"
            :enterButton="$t('sharedWalletHome.max')"
            @change="validateAmount"
            @search="maxAmount"
          />
        </div>
      </div>
    </section>

    <section class="send-step__section">
      <div class="send-step__section-header">
        <div class="send-step__section-copy">
          <span class="send-step__section-title">{{ $t('sharedWalletHome.fee') }}</span>
        </div>
      </div>

      <div class="send-step__fee-card">
        <a-slider
          :min="TRANSFER_GAS_MIN"
          :max="TRANSFER_GAS_MAX"
          v-model:value="gas"
          :step="TRANSFER_GAS_STEP"
        />

        <div class="send-step__fee-input-row">
          <a-input-number
            :min="TRANSFER_GAS_MIN"
            :max="TRANSFER_GAS_MAX"
            :step="TRANSFER_GAS_STEP"
            v-model:value="gas"
            class="send-step__fee-input"
          />
          <label class="send-step__fee-unit">ONG</label>
        </div>
      </div>
    </section>

    <section class="send-step__section">
      <div class="send-step__section-header">
        <div class="send-step__section-copy">
          <span class="send-step__section-title">{{ $t('sharedWalletHome.to') }}</span>
        </div>
      </div>

      <a-input
        v-model:value="to"
        class="input send-step__recipient-input"
        :class="validToAddress ? '' : 'error-to'"
        :placeholder="$t('sharedWalletHome.recipient')"
        @change="validateToAddress"
      ></a-input>
    </section>

    <page-footer-actions align="between" class="send-step__actions">
      <a-button type="default" variant="secondary" @click="cancel">{{
        $t('sharedWalletHome.cancel')
      }}</a-button>
      <a-button type="primary" variant="primary" @click="next">{{
        $t('sharedWalletHome.next')
      }}</a-button>
    </page-footer-actions>
  </div>
</template>

<script setup lang="ts">
import { TRANSFER_GAS_MAX, TRANSFER_GAS_MIN, TRANSFER_GAS_STEP } from '../../shared/lib/constants'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import { useSendAsset } from './useSendAsset'

defineOptions({
  name: 'SendAsset',
})

const emit = defineEmits(['cancelEvent', 'sendAssetNext'])

const {
  gas,
  scriptHash,
  amount,
  to,
  validToAddress,
  validAmount,
  oep4s,
  availableBalance,
  changeAsset,
  validateAmount,
  validateToAddress,
  maxAmount,
  cancel,
  next,
} = useSendAsset(emit)
</script>

<style scoped>
.send-step {
  display: grid;
  gap: var(--ow-space-3);
}

.send-step__section {
  display: grid;
  gap: var(--ow-space-2);
  padding: 14px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.send-step__section-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: var(--ow-space-2);
}

.send-step__section-copy {
  display: grid;
  gap: 2px;
}

.send-step__section-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.send-step__balance-label,
.send-step__label,
.send-step__fee-unit {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.send-step__balance-pill {
  display: inline-grid;
  gap: 2px;
  padding: 8px 10px;
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
  text-align: right;
}

.send-step__balance-value {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.send-step__asset-grid {
  --ow-flow-grid-columns: minmax(180px, 220px) minmax(0, 1fr);
  --ow-flow-grid-gap: var(--ow-space-2);
}

.send-step__field-group {
  display: grid;
  gap: var(--ow-space-1);
  min-width: 0;
}

.send-step__select,
.send-step__amount,
.send-step__recipient-input {
  width: 100%;
}

.send-step__select :deep(.ant-select-selector),
.send-step__fee-input :deep(.ant-input-number-input-wrap) {
  min-height: 40px;
}

.send-step__amount :deep(.ant-input),
.send-step__amount :deep(.ant-input-group-addon),
.send-step__select :deep(.ant-select-selector),
.send-step__fee-input :deep(.ant-input-number),
.send-step__recipient-input {
  border-color: var(--ow-color-border-default);
  border-radius: var(--ow-radius-control);
  background: var(--ow-color-surface-card);
}

.send-step__amount :deep(.ant-input),
.send-step__amount :deep(.ant-input-search-button) {
  height: 40px;
}

.send-step__recipient-input,
.send-step__fee-input :deep(.ant-input-number) {
  min-height: 40px;
}

.send-step__fee-card {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  gap: var(--ow-space-2);
  align-items: center;
}

.send-step__fee-input-row {
  display: inline-flex;
  align-items: center;
  gap: var(--ow-space-2);
}

.send-step__fee-input {
  width: 84px;
}

.send-step__actions {
  height: 72px;
  margin-top: 0;
}

.send-step__actions :deep(.ow-footer-actions) {
  margin: 12px auto;
  gap: var(--ow-space-3);
}

@media (max-width: 700px) {
  .send-step__asset-grid,
  .send-step__fee-card {
    grid-template-columns: 1fr;
  }

  .send-step__section-header {
    flex-direction: column;
  }

  .send-step__balance-pill {
    width: 100%;
    text-align: left;
  }
}

@media (max-width: 560px) {
  .send-step__section {
    padding: 10px 12px;
  }

  .send-step__actions {
    height: 68px;
  }

  .send-step__actions :deep(.ow-footer-actions) {
    margin: 10px auto;
  }
}
</style>
