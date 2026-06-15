<template>
  <div class="node-info-panel">
    <div class="node-info-sections">
      <section class="node-info-section ow-panel">
        <div class="ow-panel-header">
          <div class="ow-panel-heading">{{ $t('nodeInfo.sectionIdentity') }}</div>
        </div>
        <div class="ow-panel-body node-info-section__body">
          <div class="node-info-identity">
            <div class="node-info-grid">
              <form-field :label="$t('nodeInfo.name')">
                <a-input
                  class="ow-field-control"
                  v-model:value="info.name"
                  :placeholder="$t('nodeInfo.enterName')"
                ></a-input>
              </form-field>
              <form-field :label="$t('nodeInfo.logo')">
                <a-input
                  class="ow-field-control"
                  v-model:value="info.logoUrl"
                  :placeholder="$t('nodeInfo.enterLogo')"
                ></a-input>
              </form-field>
              <form-field :label="$t('nodeInfo.location')">
                <a-input
                  class="ow-field-control"
                  v-model:value="info.region"
                  :placeholder="$t('nodeInfo.enterLocation')"
                ></a-input>
              </form-field>
              <form-field :label="$t('nodeInfo.ip')">
                <a-input
                  class="ow-field-control"
                  v-model:value="info.ip"
                  :placeholder="$t('nodeInfo.enterIp')"
                ></a-input>
              </form-field>
              <form-field class="node-info-grid__item--full" :label="$t('nodeInfo.description')">
                <a-textarea
                  class="ow-field-control"
                  :rows="2"
                  v-model:value="info.introduction"
                  :placeholder="$t('nodeInfo.enterDesc')"
                ></a-textarea>
              </form-field>
            </div>
            <aside class="node-info-logo">
              <span class="node-info-logo__box">
                <img v-if="showLogo" :src="info.logoUrl" alt="" @error="logoError = true" />
                <span v-else class="node-info-logo__placeholder">{{ logoInitial }}</span>
              </span>
            </aside>
          </div>
        </div>
      </section>

      <section class="node-info-section ow-panel">
        <div class="ow-panel-header">
          <div class="ow-panel-heading">{{ $t('nodeInfo.sectionLinksContact') }}</div>
        </div>
        <div class="ow-panel-body node-info-section__body">
          <div class="node-info-grid node-info-grid--triple">
            <form-field :label="$t('nodeInfo.website')">
              <a-input
                class="ow-field-control"
                v-model:value="info.website"
                :placeholder="$t('nodeInfo.enterWebsite')"
              ></a-input>
            </form-field>
            <form-field :label="$t('nodeInfo.telegram')">
              <a-input
                class="ow-field-control"
                v-model:value="info.telegram"
                :placeholder="$t('nodeInfo.enterTelegram')"
              ></a-input>
            </form-field>
            <form-field :label="$t('nodeInfo.twitter')">
              <a-input
                class="ow-field-control"
                v-model:value="info.twitter"
                :placeholder="$t('nodeInfo.enterTwitter')"
              ></a-input>
            </form-field>
            <form-field :label="$t('nodeInfo.facebook')">
              <a-input
                class="ow-field-control"
                v-model:value="info.facebook"
                :placeholder="$t('nodeInfo.enterFacebook')"
              ></a-input>
            </form-field>
            <form-field :label="$t('nodeInfo.openEmail')">
              <a-input
                class="ow-field-control"
                v-model:value="info.publicEmail"
                :placeholder="$t('nodeInfo.enterOpenEmail')"
              ></a-input>
            </form-field>
            <form-field :label="$t('nodeInfo.contactOntologyEmail')">
              <a-input
                class="ow-field-control"
                v-model:value="info.contactEmail"
                :placeholder="$t('nodeInfo.enterContactEmail')"
              ></a-input>
            </form-field>
          </div>
        </div>
      </section>

      <div class="node-info-visibility">
        <div class="node-info-visibility__text">
          <span class="node-info-visibility__title">{{ $t('nodeInfo.visibilityTitle') }}</span>
          <span class="node-info-visibility__desc">{{ $t('nodeInfo.visibilityDesc') }}</span>
        </div>
        <a-switch v-model:checked="info.isPublic"></a-switch>
      </div>
    </div>

    <page-footer-actions align="center">
      <a-button variant="primary" @click="onSubmit">{{ $t('nodeInfo.submit') }}</a-button>
    </page-footer-actions>
    <sign-send-tx
      v-if="stakeWallet"
      v-model:open="signVisible"
      :tx="tx"
      :wallet="stakeWallet"
      @signClose="handleTxCancel"
      @afterSign="handleAfterSign"
    ></sign-send-tx>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import SignSendTx from './SignSendTxModal.vue'
import {
  createEmptyNodeStakeProfile,
  createNodeStakeProfileDraft,
  loadNodeStakeProfile,
  saveLedgerNodeStakeProfile,
  saveNodeStakeProfile,
} from '../../modules/governance/application/nodeStake/nodeStakeApplicationService'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'
import FormField from '../../shared/ui/forms/FormField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import { useSettingStore } from '../../stores/modules/Setting'
import { useNodeStakeStore } from '../../stores/modules/NodeStake'
import { isCommonWallet } from '../../shared/lib/types'
defineOptions({
  name: 'NodeInfo',
})

const settingStore = useSettingStore()
const nodeStakeStore = useNodeStakeStore()

const info = ref(createEmptyNodeStakeProfile())
const tx = ref<string | null>('')
const signVisible = ref(false)
const nodeInfo = ref('')
const logoError = ref(false)

type SignedNodeInfoPayload = string | { serializeHex: () => string }

const nodePublicKey = computed(() => nodeStakeStore.nodePublicKey)
const stakeWallet = computed(() => nodeStakeStore.stakeWallet)
const showLogo = computed(() => Boolean(info.value.logoUrl) && !logoError.value)
const logoInitial = computed(() => (info.value.name || '?').trim().charAt(0).toUpperCase() || '?')

// A new logo URL deserves a fresh chance to load.
watch(
  () => info.value.logoUrl,
  () => {
    logoError.value = false
  }
)

onMounted(() => {
  fetchNodeInfo()
})

async function fetchNodeInfo() {
  const result = await loadNodeStakeProfile({
    network: settingStore.network,
    publicKey: nodePublicKey.value,
  })
  if (notifyFailure(result)) return

  info.value = Object.assign({}, info.value, result.info)
}

async function onSubmit() {
  const wallet = stakeWallet.value
  if (!wallet?.address) {
    notifyError('nodeStake.selectIndividualWallet')
    return
  }

  const draft = createNodeStakeProfileDraft({
    info: info.value,
    nodePublicKey: nodePublicKey.value,
    address: wallet.address,
  })
  nodeInfo.value = draft.nodeInfo
  tx.value = draft.tx
  signVisible.value = true
}

function handleTxCancel() {
  signVisible.value = false
  tx.value = null
}

async function handleAfterSign(signed: SignedNodeInfoPayload) {
  let result
  const wallet = stakeWallet.value
  if (!wallet?.address) {
    notifyError('nodeStake.selectIndividualWallet')
    return
  }

  if (isCommonWallet(wallet)) {
    result = await saveNodeStakeProfile({
      network: settingStore.network,
      nodeInfo: nodeInfo.value,
      walletPublicKey: wallet.publicKey || '',
      address: wallet.address,
      signature: typeof signed === 'string' ? signed : signed.serializeHex(),
    })
  } else {
    result = await saveLedgerNodeStakeProfile({
      network: settingStore.network,
      nodeInfo: signed,
      walletPublicKey: wallet.publicKey || '',
    })
  }

  signVisible.value = false
  tx.value = null

  if (!notifyFailure(result, 'nodeInfo.updateFailed')) {
    notifySuccess('nodeInfo.updateSuccess')
  }
}
</script>

<style lang="scss" scoped>
.node-info-panel {
  width: min(100%, 860px);
  margin: 0 auto;
  padding-top: var(--ow-space-1);
  padding-bottom: 4.5rem;
}

.node-info-sections {
  display: flex;
  flex-direction: column;
  gap: var(--ow-space-2);
}

.node-info-section .ow-panel-header {
  padding: var(--ow-space-3) var(--ow-space-4);
}

.node-info-section__body {
  padding: var(--ow-space-3) var(--ow-space-4);
}

.node-info-identity {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 140px;
  gap: var(--ow-space-4);
  align-items: start;
}

.node-info-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-3) var(--ow-space-4);
}

.node-info-grid--triple {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.node-info-grid__item--full {
  grid-column: 1 / -1;
}

.node-info-grid :deep(.ow-form-item),
.node-info-grid :deep(.ow-form-item.ant-form-item) {
  margin-bottom: 0;
}

.node-info-grid :deep(.ow-form-item .ant-form-item-label) {
  padding-bottom: 2px;
}

.node-info-grid :deep(.ant-input-textarea textarea) {
  min-height: 56px;
}

.node-info-logo {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: var(--ow-space-2);
}

.node-info-logo__box {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 140px;
  height: 140px;
  overflow: hidden;
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-card);
  background: var(--ow-color-surface-muted);
}

.node-info-logo__box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.node-info-logo__placeholder {
  font-family: var(--ow-font-semibold);
  font-size: var(--ow-font-size-display);
  color: var(--ow-color-text-subtle);
}

.node-info-visibility {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: var(--ow-space-4);
  padding: var(--ow-space-2) var(--ow-space-3);
  border: 1px solid var(--ow-color-border-subtle);
  border-radius: var(--ow-radius-panel);
  background: var(--ow-color-surface-muted);
}

.node-info-visibility__text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.node-info-visibility__title {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
}

.node-info-visibility__desc {
  font-size: var(--ow-font-size-caption);
  line-height: var(--ow-line-height-caption);
  color: var(--ow-color-text-muted);
}

.node-info-visibility :deep(.ant-switch) {
  flex-shrink: 0;
}

@media (max-width: 720px) {
  .node-info-identity,
  .node-info-grid,
  .node-info-grid--triple {
    grid-template-columns: 1fr;
  }

  .node-info-logo {
    flex-direction: row;
    justify-content: flex-start;
  }
}
</style>
