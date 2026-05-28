<template>
  <div>
    <!-- <div v-if="!stakeWallet.key" class="ledger-not-support">
        <p>{{$t('nodeInfo.ledgerWalletNotSupportForNow')}}
             <a href=mailto:contact@ont.io>contact@ont.io</a>
        </p>
       
    </div> -->
    <div class="node-info-panel">
      <div class="ow-form-split-panel">
        <div class="ow-form-split-panel__column">
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

          <form-field :label="$t('nodeInfo.description')">
            <a-textarea
              class="ow-field-control"
              :rows="4"
              v-model:value="info.introduction"
              :placeholder="$t('nodeInfo.enterDesc')"
            ></a-textarea>
          </form-field>
        </div>
        <div class="ow-form-split-panel__column">
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
          <form-field :label="$t('nodeInfo.contactOntologyEmail')">
            <a-input
              class="ow-field-control"
              v-model:value="info.contactEmail"
              :placeholder="$t('nodeInfo.enterContactEmail')"
            ></a-input>
          </form-field>
          <form-field :label="$t('nodeInfo.openEmail')">
            <a-input
              class="ow-field-control"
              v-model:value="info.publicEmail"
              :placeholder="$t('nodeInfo.enterOpenEmail')"
            ></a-input>
          </form-field>
        </div>
      </div>
      <div class="ow-form-inline-toggle">
        <label class="ow-form-inline-toggle__label">{{ $t('nodeInfo.ifOpenInfo') }}</label>
        <a-switch v-model:checked="info.isPublic"></a-switch>
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
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import SignSendTx from './SignSendTxModal.vue'
import {
  createEmptyNodeStakeProfile,
  createNodeStakeProfileDraft,
  loadNodeStakeProfile,
  saveLedgerNodeStakeProfile,
  saveNodeStakeProfile,
} from '../../modules/governance/application/nodeStakeApplicationService'
import { notifyError, notifySuccess } from '../../shared/ui/feedback'
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

type SignedNodeInfoPayload = string | { serializeHex: () => string }

const nodePublicKey = computed(() => nodeStakeStore.nodePublicKey)
const stakeWallet = computed(() => nodeStakeStore.stakeWallet)

onMounted(() => {
  fetchNodeInfo()
})

async function fetchNodeInfo() {
  const result = await loadNodeStakeProfile({
    network: settingStore.network,
    publicKey: nodePublicKey.value,
  })
  if (!result.ok) {
    notifyError(result.errorKey)
    return
  }

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

  if (result.ok) {
    notifySuccess('nodeInfo.updateSuccess')
  } else {
    notifyError(result.errorKey || 'nodeInfo.updateFailed')
  }
}
</script>

<style lang="scss" scoped>
.node-info-panel {
  width: min(100%, 820px);
  margin: 0 auto;
  padding-top: var(--ow-space-1);
  padding-bottom: 5.3rem;
}

.node-info-panel :deep(.ow-form-item) {
  margin-bottom: var(--ow-space-3);
}

.node-info-panel :deep(.ow-form-item__label) {
  margin-bottom: var(--ow-space-1);
}

.node-info-panel :deep(.ant-input-textarea textarea) {
  min-height: 120px;
}

.ow-form-inline-toggle :deep(.ant-switch) {
  flex-shrink: 0;
}
</style>
