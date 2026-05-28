<template>
  <div class="vote-list-page ow-page ow-page--flush-top">
    <breadcrumb
      :routes="page.routes"
      :current="$t('vote.votingTopics')"
      @backEvent="page.back"
    ></breadcrumb>
    <div class="vote-list-toolbar" v-if="page.isAdmin">
      <a-menu
        class="vote-list-menu"
        :selectedKeys="page.currentMenu"
        mode="horizontal"
        @click="page.handleSelectMenu"
      >
        <a-menu-item v-for="menu in page.menus" :key="menu.key">{{ menu.name }}</a-menu-item>
      </a-menu>
      <div class="ow-icon-action btn-new" @click="page.handleAddVote" v-if="page.isAdmin"></div>
    </div>
    <div class="vote-list-table ow-table-shell">
      <a-table
        :columns="page.columns"
        :dataSource="page.activeVotes"
        :pagination="page.tablePagination"
        :rowKey="page.getVoteRowKey"
        @change="page.handleTableChange"
      >
        <template #bodyCell="{ column, record }">
          <div v-if="column.key === 'title'" class="vote-table-title">
            {{ record.title }}
          </div>

          <div v-else-if="column.key === 'duration'" class="vote-table-duration">
            {{ page.formatDuration(record) }}
          </div>

          <div v-else-if="column.key === 'status'" class="vote-status-cell">
            <p class="vote-status-label">{{ page.formatStatus(record) }}</p>
            <div class="vote-status-detail">
              <div class="status-item">
                <CaretUpFilled class="icon-approve" />
                <span>{{ record.approves }}</span>
              </div>
              <div class="status-item">
                <CaretDownFilled class="icon-reject" />
                <span>{{ record.rejects }}</span>
              </div>
            </div>
          </div>

          <div
            v-else-if="column.key === 'actions'"
            class="vote-actions ow-button-row ow-button-row--end"
          >
            <a-button type="link" @click="page.toDetail(record)">{{
              $t('vote.detailAction')
            }}</a-button>
            <a-button
              v-if="page.currentMenu[0] === 'created' && page.isVoteStoppable(record)"
              type="link"
              class="vote-stop-link"
              @click="page.onStopVote(record)"
              >{{ $t('vote.stopVote') }}</a-button
            >
          </div>
        </template>
      </a-table>
    </div>
    <sign-send-tx
      :open="page.signVisible"
      @update:open="page.setVoteListDialogVisible($event)"
      :tx="page.tx"
      :wallet="page.voteWallet"
      @signClose="page.handleCancel"
      @txSent="page.handleTxSent"
    ></sign-send-tx>
  </div>
</template>

<script setup lang="ts">
import { proxyRefs } from 'vue'
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import SignSendTx from '../../workflows/governance/SignSendTxModal.vue'
import { CaretUpFilled, CaretDownFilled } from '@ant-design/icons-vue'
import { useVoteListPage } from '../../workflows/governance/useVoteListPage'

defineOptions({
  name: 'VoteListPage',
})

const page = proxyRefs(useVoteListPage())
</script>

<style lang="scss" scoped>
.icon-approve {
  color: var(--ow-color-success);
}
.icon-reject {
  color: var(--ow-color-danger);
}

.btn-stop-vote {
  color: var(--ow-color-danger);
}

.vote-list-toolbar {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: var(--ow-space-5);
  margin-bottom: var(--ow-space-5);

  .btn-new {
    background: url('../../assets/icon-add.svg') no-repeat center center;
    background-size: 16px 16px;
  }

  .btn-new:hover {
    opacity: 0.8;
  }
}

.vote-list-menu {
  border-bottom: 0;
}

.vote-list-table :deep(.ant-table-wrapper) {
  width: 100%;
}

.vote-list-table :deep(.ant-table-thead > tr > th) {
  font-family: var(--ow-font-medium);
}

.vote-list-table :deep(.ant-table-pagination) {
  margin: var(--ow-space-4) var(--ow-space-5);
}

.vote-table-title {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  white-space: normal;
  overflow-wrap: anywhere;
  line-height: var(--ow-line-height-body);
}

.vote-table-duration {
  color: var(--ow-color-text-secondary);
  white-space: nowrap;
}

.vote-status-cell {
  color: var(--ow-color-text-primary);
}

.vote-status-label {
  margin: 0;
  font-family: var(--ow-font-medium);
}

.vote-status-detail {
  margin-top: var(--ow-space-1);
  display: flex;
  align-items: center;
  gap: var(--ow-space-3);
}

.status-item {
  display: flex;
  align-items: center;
}

.status-item span {
  margin-left: var(--ow-space-1);
  font-size: var(--ow-font-size-body);
  color: var(--ow-color-text-primary);
}

.vote-actions {
  width: 100%;
  gap: var(--ow-space-2);
}

.vote-stop-link {
  color: var(--ow-color-danger);
}

.vote-actions :deep(.ant-btn-link) {
  padding-inline: 0;
}

@media (max-width: 760px) {
  .vote-list-toolbar {
    flex-direction: column;
    align-items: stretch;
  }
}
</style>
