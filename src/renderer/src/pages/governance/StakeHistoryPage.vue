<template>
  <div class="stake-history-page ow-page ow-page--flush-top">
    <breadcrumb :current="$t('nodeMgmt.stakeHistory')" @backEvent="handleRouteBack"></breadcrumb>
    <div class="ow-form-panel">
      <form-field :label="$t('nodeStake.selectStakeWallet')" label-tag="p">
        <wallet-select-field
          :options="normalWalletAndLedgerWallet"
          v-model:value="selectedWalletValue"
          :placeholder="$t('createIdentity.selectCommonWallet')"
          @walletSelected="handleChangePayer"
        >
        </wallet-select-field>
      </form-field>
      <page-footer-actions align="center" class="stake-btn-container">
        <a-button
          type="primary"
          variant="primary"
          @click="handleSearch"
          :disabled="historyRequesting"
          >{{ $t('nodeStake.search') }}</a-button
        >
      </page-footer-actions>
    </div>
    <div class="stake-history-table ow-table-shell">
      <a-table :columns="columns" :dataSource="historyRecords" :loading="historyRequesting">
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'action'" class="detail-link ow-icon-action">
            <ArrowRightOutlined @click="handleAuthorizeLogin(record)" />
          </div>
        </template>
      </a-table>
    </div>
  </div>
</template>

<script setup lang="ts">
import { useI18n } from 'vue-i18n'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import { ArrowRightOutlined } from '@ant-design/icons-vue'
import FormField from '../../shared/ui/forms/FormField.vue'
import WalletSelectField from '../../shared/ui/forms/WalletSelectField.vue'
import PageFooterActions from '../../shared/ui/actions/PageFooterActions.vue'
import { useStakeHistoryPage } from '../../workflows/governance/useStakeHistoryPage'

defineOptions({
  name: 'StakeHistoryPage',
})

const { t } = useI18n()
const {
  walletOptions,
  selectedWalletValue,
  historyRequesting,
  historyRecords,
  handleRouteBack,
  handleAuthorizeLogin,
  handleChangePayer,
  handleSearch,
} = useStakeHistoryPage()

const columns = [
  {
    title: t('nodeMgmt.name'),
    dataIndex: 'name',
    key: 'name',
  },
  {
    title: t('nodeMgmt.inAuthorization'),
    dataIndex: 'inAuthorization',
    key: 'inAuthorization',
  },
  {
    title: t('nodeMgmt.locked'),
    dataIndex: 'locked',
    key: 'locked',
  },
  {
    title: t('nodeMgmt.claimableONT'),
    dataIndex: 'claimable',
    key: 'claimable',
  },
  {
    title: '',
    key: 'action',
  },
]

const normalWalletAndLedgerWallet = walletOptions
</script>

<style scoped>
.stake-history-table {
  margin-top: var(--ow-space-5);
  overflow-x: auto;
}

.stake-history-table :deep(.ant-table-wrapper) {
  width: 100%;
}

.detail-link {
  margin: 0 auto;
}

.stake-btn-container {
  margin-top: var(--ow-space-6);
}
</style>
