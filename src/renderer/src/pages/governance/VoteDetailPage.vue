<template>
  <div class="vote-detail-page ow-page ow-page--flush-top">
    <breadcrumb
      :routes="page.routes"
      :current="$t('vote.votingDetail')"
      @backEvent="page.back"
    ></breadcrumb>
    <div class="ow-two-panel-layout vote-detail-layout">
      <div class="left-part">
        <div class="ow-page-title vote-detail-title">
          {{ page.vote.title }}
        </div>
        <vote-result-cards
          :is-voter="page.isVoter"
          :approved="page.myVoted === page.MY_VOTED.APPROVED"
          :rejected="page.myVoted === page.MY_VOTED.REJECTED"
          :approves-display="page.voteApprovesDisplay"
          :rejects-display="page.voteRejectsDisplay"
          :my-weight-display="page.myWeightDisplay"
          @approve="page.onApprove"
          @reject="page.onReject"
        />
        <a-button
          class="stop-btn"
          variant="danger"
          @click="page.onStop"
          v-if="page.vote.admin === page.voteWallet?.address"
        >
          {{ $t('vote.stopVote') }}
        </a-button>
        <div class="ow-panel ow-panel--flat">
          <div class="vote-detail-content ow-panel-body">
            {{ page.vote.content }}
          </div>
        </div>
      </div>
      <div class="right-part">
        <vote-info-panel
          :start-time="page.formatTime(page.vote.startTime)"
          :end-time="page.formatTime(page.vote.endTime)"
          :hash-display="page.reverseHash(page.vote.hash)"
          :admin="page.vote.admin"
          :status-display="page.formatStatus(page.vote)"
          :my-weight-display="page.myWeightDisplay"
          @open-in-explorer="page.openVoteInExplorer"
        />
        <div class="records-container ow-table-shell">
          <a-tabs class="ow-section-tabs vote-detail-tabs" defaultActiveKey="1">
            <a-tab-pane :tab="$t('vote.approval')" key="1">
              <vote-record-table :columns="page.columns" :data-source="page.approveData" />
            </a-tab-pane>
            <a-tab-pane :tab="$t('vote.opposition')" key="2">
              <vote-record-table :columns="page.columns" :data-source="page.rejectData" />
            </a-tab-pane>
          </a-tabs>
        </div>
      </div>
    </div>

    <sign-send-tx
      :open="page.signVisible"
      @update:open="page.setVoteDetailDialogVisible($event)"
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
import VoteResultCards from '../../workflows/governance/voteDetail/VoteResultCards.vue'
import VoteInfoPanel from '../../workflows/governance/voteDetail/VoteInfoPanel.vue'
import VoteRecordTable from '../../workflows/governance/voteDetail/VoteRecordTable.vue'
import { useVoteDetailPage } from '../../workflows/governance/useVoteDetailPage'

defineOptions({
  name: 'VoteDetailPage',
})

const page = proxyRefs(useVoteDetailPage())
</script>

<style lang="scss" scoped>
.vote-detail-layout {
  --ow-two-panel-columns: minmax(0, 1.04fr) minmax(320px, 0.96fr);
  gap: var(--ow-space-8);

  .left-part {
    min-width: 0;
  }

  .right-part {
    min-width: 0;
  }
}

.vote-detail-title {
  margin-bottom: var(--ow-space-6);
}

.stop-btn {
  width: min(100%, 432px);
  margin-bottom: var(--ow-space-4);
}

.vote-detail-content {
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-section);
  line-height: var(--ow-line-height-title);
  color: var(--ow-color-text-primary);
  overflow-wrap: anywhere;
}

.records-container {
  padding: 0 0 var(--ow-space-4);
}

.vote-detail-tabs {
  padding: 0 var(--ow-space-2);
}

.vote-detail-tabs :deep(.ant-tabs-nav) {
  margin-bottom: 0;
}

.records-container {
  :deep(.ant-table) {
    table-layout: fixed;
  }

  :deep(.ant-table-thead > tr > th),
  :deep(.ant-table-tbody > tr > td) {
    padding-left: 10px;
    padding-right: 10px;
  }

  :deep(.ant-table-tbody > tr > td) {
    vertical-align: top;
  }
}

@media (max-width: 900px) {
  .vote-detail-layout {
    --ow-two-panel-columns: 1fr;
  }
}
</style>
