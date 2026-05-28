<template>
  <div>
    <div v-if="!registerSucceed" class="ow-flow-shell-page">
      <breadcrumb :current="$t('nodeApply.newNodeApply')" @backEvent="back"></breadcrumb>
      <section class="ow-panel ow-flow-shell node-apply-shell">
        <div class="ow-flow-shell__progress" role="list" aria-label="New node apply progress">
          <div
            class="ow-flow-shell__step"
            :class="{
              'ow-flow-shell__step--active': current === 0,
              'ow-flow-shell__step--complete': current > 0,
            }"
            role="listitem"
          >
            <span class="ow-flow-shell__step-index">1</span>
            <div class="ow-flow-shell__step-copy">
              <span class="ow-flow-shell__step-label">{{ $t('createJsonWallet.basicInfo') }}</span>
              <span class="ow-flow-shell__step-caption">
                {{ $t('nodeApply.stakeWallet') }} /
                {{ $t('nodeApply.operationWallet') }}
              </span>
            </div>
          </div>

          <div
            class="ow-flow-shell__step"
            :class="{ 'ow-flow-shell__step--active': current === 1 }"
            role="listitem"
          >
            <span class="ow-flow-shell__step-index">2</span>
            <div class="ow-flow-shell__step-copy">
              <span class="ow-flow-shell__step-label">{{
                $t('sharedWalletHome.confirmation')
              }}</span>
              <span class="ow-flow-shell__step-caption">
                {{ $t('nodeApply.operationWalletPublickey') }} /
                {{ $t('nodeApply.stakeAmount') }}
              </span>
            </div>
          </div>
        </div>

        <div class="ow-flow-shell__body">
          <div v-if="current === 0" class="node-apply-stage">
            <section class="node-apply-card">
              <div class="node-apply-form-stack">
                <section class="node-apply-form-section">
                  <div class="node-apply-form-copy">
                    <span class="node-apply-form-title">{{ $t('nodeApply.stakeWallet') }}</span>
                  </div>
                  <wallet-select-field
                    :options="stakeWalletOptions"
                    v-model:value="stakeWalletValue"
                    :placeholder="$t('createIdentity.selectCommonWallet')"
                    @walletSelected="onWalletSelected"
                  >
                  </wallet-select-field>
                </section>

                <section class="node-apply-form-section">
                  <div class="node-apply-form-copy">
                    <span class="node-apply-form-title">{{ $t('nodeApply.operationWallet') }}</span>
                  </div>

                  <a-tabs class="node-apply-tabs" default-active-key="1" type="card">
                    <a-tab-pane key="1" :tab="$t('nodeApply.selectOperationWallet')">
                      <div class="node-apply-tab-panel">
                        <wallet-select-field
                          :options="normalWalletAndLedgerWallet"
                          v-model:value="operationWallet"
                          @walletSelected="onSelectOperationWallet"
                          :placeholder="$t('nodeApply.selectOperationWallet')"
                        >
                        </wallet-select-field>
                        <p
                          class="ledger-warning"
                          v-show="ledgerList.some((wallet) => wallet.publicKey === operationWallet)"
                        >
                          <CloseCircleFilled class="ow-error-text" />
                          {{ $t('nodeApply.unsupportedLedger') }}
                        </p>
                      </div>
                    </a-tab-pane>
                    <a-tab-pane key="2" :tab="$t('nodeApply.enterOperationPk')">
                      <div class="node-apply-tab-panel">
                        <a-input
                          v-model:value="operationPk"
                          @blur="onSelectOperationWallet"
                          :placeholder="$t('nodeApply.enterOperationPk')"
                        ></a-input>
                      </div>
                    </a-tab-pane>
                  </a-tabs>
                </section>

                <section class="node-apply-form-section">
                  <div class="node-apply-form-copy">
                    <span class="node-apply-form-title">{{ $t('nodeApply.stakeAmount') }}</span>
                  </div>

                  <div class="node-apply-amount-row">
                    <a-input
                      v-model:value="stakeAmount"
                      type="number"
                      :class="validAmount ? '' : 'error-input'"
                      @change="validateAmount"
                      :placeholder="$t('nodeApply.inputStakeAmount')"
                    ></a-input>
                    <span class="node-apply-amount-suffix">ONT</span>
                  </div>

                  <p class="node-apply-helper">
                    {{ $t('nodeApply.minStateAmount') }}
                  </p>
                </section>
              </div>
            </section>

            <page-footer-actions align="between" class="node-apply-actions">
              <a-button type="default" variant="secondary" @click="back">{{
                $t('nodeApply.cancel')
              }}</a-button>
              <a-button type="primary" variant="primary" @click="next">{{
                $t('nodeApply.next')
              }}</a-button>
            </page-footer-actions>
          </div>

          <div v-else class="node-apply-stage node-apply-stage--confirm">
            <section class="node-apply-card node-apply-card--confirm">
              <div class="node-apply-card__copy">
                <span class="node-apply-card__title">{{
                  $t('sharedWalletHome.confirmation')
                }}</span>
                <span class="node-apply-card__caption">{{ $t('common.readyToSubmit') }}</span>
              </div>

              <div class="ow-kv-panel">
                <div class="ow-kv-row">
                  <span class="ow-kv-label">{{ $t('nodeApply.stakeWallet') }}</span>
                  <span class="ow-kv-value"
                    >{{ stakeWallet?.address
                    }}{{ walletType === 'ledgerWallet' ? ' (Ledger)' : '' }}</span
                  >
                </div>
                <div class="ow-kv-row">
                  <span class="ow-kv-label">{{ $t('nodeApply.operationWalletPublickey') }}</span>
                  <span class="ow-kv-value">{{ operationWallet || operationPk }}</span>
                </div>
                <div class="ow-kv-row">
                  <span class="ow-kv-label">{{ $t('nodeApply.stakeAmount') }}</span>
                  <span class="ow-kv-value">{{ stakeAmount }} ONT</span>
                </div>
              </div>
            </section>

            <page-footer-actions align="between" class="node-apply-actions">
              <a-button type="default" @click="cancel" variant="secondary">{{
                $t('nodeApply.cancel')
              }}</a-button>
              <a-button type="primary" variant="primary" @click="confirm">{{
                $t('nodeApply.ok')
              }}</a-button>
            </page-footer-actions>
          </div>
        </div>
      </section>

      <sign-send-tx
        v-if="tx !== null && stakeWallet"
        v-model:open="signVisible"
        :tx="tx"
        :wallet="stakeWallet"
        @signClose="handleTxCancel"
        @txSent="handleTxSent"
      ></sign-send-tx>
    </div>
    <div class="ow-success-state" v-if="registerSucceed">
      <img class="ow-success-state__icon" src="../../assets/success.svg" alt="" />
      <p class="ow-success-state__title">
        {{ $t('nodeApply.registerSuccess') }}
      </p>
      <a-button class="ow-success-state__primary-action" variant="primary" @click="onComplete">{{
        $t('nodeApply.completeNodeInfo')
      }}</a-button>
      <p class="ow-success-state__secondary-action" @click="onLater">
        {{ $t('nodeApply.later') }}
      </p>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SignSendTx from '../../workflows/governance/SignSendTxModal.vue'
import WalletSelectField from '../../shared/ui/forms/WalletSelectField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import { useNodeApplyPage } from '../../workflows/governance/useNodeApplyPage'
import { CloseCircleFilled } from '@ant-design/icons-vue'

defineOptions({
  name: 'NodeApplyPage',
})

const {
  registerSucceed,
  back,
  current,
  stakeWalletOptions,
  stakeWalletValue,
  onWalletSelected,
  normalWalletAndLedgerWallet,
  operationWallet,
  onSelectOperationWallet,
  ledgerList,
  operationPk,
  stakeAmount,
  validateAmount,
  next,
  stakeWallet,
  walletType,
  cancel,
  confirm,
  signVisible,
  tx,
  handleTxCancel,
  handleTxSent,
  onComplete,
  onLater,
  validAmount,
} = useNodeApplyPage()
</script>

<style lang="scss" scoped>
.node-apply-shell {
  width: min(100%, 860px);
}

.node-apply-stage {
  width: min(100%, 760px);
  margin: 0 auto;
  display: grid;
  gap: var(--ow-space-3);
}

.node-apply-card {
  display: grid;
  gap: var(--ow-space-3);
  padding: var(--ow-space-4);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-card);
}

.node-apply-card--confirm {
  gap: var(--ow-space-2);
}

.node-apply-card__copy {
  display: grid;
  gap: 2px;
}

.node-apply-card__title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.node-apply-card__caption,
.node-apply-helper {
  margin: 0;
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.node-apply-form-stack {
  display: grid;
  gap: var(--ow-space-3);
}

.node-apply-form-section {
  display: grid;
  gap: var(--ow-space-2);
}

.node-apply-form-section + .node-apply-form-section {
  padding-top: var(--ow-space-3);
  border-top: 1px solid var(--ow-color-border-subtle);
}

.node-apply-form-copy {
  display: grid;
  gap: 2px;
}

.node-apply-form-title {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.node-apply-form-caption {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-secondary);
}

.node-apply-tabs :deep(.ant-tabs-nav) {
  margin-bottom: var(--ow-space-3);
}

.node-apply-tabs :deep(.ant-tabs-tab) {
  padding: 8px 12px;
}

.node-apply-tab-panel {
  display: grid;
  gap: var(--ow-space-2);
}

.node-apply-amount-row {
  display: grid;
  grid-template-columns: minmax(0, 1fr) auto;
  align-items: center;
  gap: var(--ow-space-2);
}

.node-apply-amount-suffix {
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-secondary);
}

.node-apply-actions {
  margin-top: var(--ow-space-1);
}

.ledger-warning {
  margin: 0;
  display: flex;
  align-items: flex-start;
  column-gap: var(--ow-space-2);
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
}

@media (max-width: 560px) {
  .node-apply-card {
    padding: var(--ow-space-3);
  }

  .node-apply-amount-row {
    grid-template-columns: 1fr;
  }
}
</style>
