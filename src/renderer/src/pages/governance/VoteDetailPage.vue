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
        <div class="voted-container ow-stat-grid">
          <div class="visiter-approve ow-stat-card" v-if="!page.isVoter">
            <CaretUpFilled class="icon-approve" />
            <span class="ow-stat-value">{{ page.vote.approves }}</span>
            <span class="vote-inline-label">votes</span>
          </div>
          <div class="short-line" v-if="!page.isVoter"></div>
          <div class="visiter-reject ow-stat-card" v-if="!page.isVoter">
            <CaretDownFilled class="icon-reject" />
            <span class="ow-stat-value">{{ page.vote.rejects }}</span>
            <span class="vote-inline-label">votes</span>
          </div>

          <div
            class="vote-card ow-stat-card ow-stat-card--interactive"
            v-if="page.isVoter"
            @click="page.onApprove"
            :class="{
              'ow-stat-card--success': page.myVoted === page.MY_VOTED.APPROVED,
              'vote-card--locked': page.myVoted === page.MY_VOTED.APPROVED,
            }"
          >
            <p>
              <CaretUpFilled class="icon-approve" />
              <span
                :class="{
                  'my-voted-text': page.myVoted === page.MY_VOTED.APPROVED,
                }"
                class="ow-stat-value"
                >{{ page.vote.approves }}</span
              >
              <span
                :class="{
                  'my-voted-text': page.myVoted === page.MY_VOTED.APPROVED,
                }"
                class="vote-inline-label"
                >votes</span
              >
            </p>
            <p class="vote-option" v-if="page.myVoted !== page.MY_VOTED.APPROVED">Vote Up</p>
            <p class="my-voted my-voted-approve" v-if="page.myVoted === page.MY_VOTED.APPROVED">
              <span>Voted</span>
              <span class="added-votes"> +{{ page.myWeight }}</span>
            </p>
          </div>
          <div
            class="vote-card ow-stat-card ow-stat-card--interactive"
            v-if="page.isVoter"
            @click="page.onReject"
            :class="{
              'ow-stat-card--danger': page.myVoted === page.MY_VOTED.REJECTED,
              'vote-card--locked': page.myVoted === page.MY_VOTED.REJECTED,
            }"
          >
            <p>
              <CaretDownFilled class="icon-reject" />
              <span
                :class="{
                  'my-voted-text': page.myVoted === page.MY_VOTED.REJECTED,
                }"
                class="ow-stat-value"
                >{{ page.vote.rejects }}</span
              >
              <span
                :class="{
                  'my-voted-text': page.myVoted === page.MY_VOTED.REJECTED,
                }"
                class="vote-inline-label"
                >votes</span
              >
            </p>
            <p class="my-voted my-voted-reject" v-if="page.myVoted === page.MY_VOTED.REJECTED">
              <span>Voted</span>
              <span class="added-votes"> +{{ page.myWeight }}</span>
            </p>
            <p class="vote-option" v-if="page.myVoted !== page.MY_VOTED.REJECTED">Vote Down</p>
          </div>
        </div>
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
        <div class="info-container ow-panel ow-panel--flat">
          <div class="ow-panel-header">
            <p class="ow-panel-heading">{{ $t('vote.info') }}</p>
          </div>
          <div class="ow-panel-body vote-detail-info ow-kv-panel">
            <div class="info-item ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.startTime') }}</span>
              <span class="ow-kv-value">{{ page.formatTime(page.vote.startTime) }}</span>
            </div>
            <div class="info-item ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.endTime') }}</span>
              <span class="ow-kv-value">{{ page.formatTime(page.vote.endTime) }}</span>
            </div>
            <div class="info-item ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.hash') }}</span>
              <span class="hash-link ow-kv-value ow-text-link" @click="page.openVoteInExplorer">{{
                page.reverseHash(page.vote.hash)
              }}</span>
            </div>
            <div class="info-item info-item--creator ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.creatorAddress') }}</span>
              <span class="ow-kv-value">{{ page.vote.admin }}</span>
            </div>
            <div class="info-item ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.votingStatus') }}</span>
              <span class="ow-kv-value">{{ page.formatStatus(page.vote) }}</span>
            </div>
            <div class="info-item ow-kv-row">
              <span class="ow-kv-label">{{ $t('vote.myVotes') }}</span>
              <span class="ow-kv-value">{{ page.myWeight }}</span>
            </div>
          </div>
        </div>
        <div class="records-container ow-table-shell">
          <a-tabs class="ow-section-tabs vote-detail-tabs" defaultActiveKey="1">
            <a-tab-pane :tab="$t('vote.approval')" key="1">
              <a-table
                :columns="page.columns"
                :dataSource="page.approveData"
                :pagination="false"
                :bordered="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'name'" class="vote-record-cell vote-record-cell--name">
                    {{ record.name }}
                  </div>
                  <div
                    v-else-if="column.key === 'address'"
                    class="vote-record-cell vote-record-cell--address"
                  >
                    {{ record.address }}
                  </div>
                  <div
                    v-else-if="column.key === 'weight'"
                    class="vote-record-cell vote-record-cell--weight"
                  >
                    {{ record.weight }}
                  </div>
                </template>
              </a-table>
            </a-tab-pane>
            <a-tab-pane :tab="$t('vote.opposition')" key="2">
              <a-table
                :columns="page.columns"
                :dataSource="page.rejectData"
                :pagination="false"
                :bordered="false"
                size="small"
              >
                <template #bodyCell="{ column, record }">
                  <div v-if="column.key === 'name'" class="vote-record-cell vote-record-cell--name">
                    {{ record.name }}
                  </div>
                  <div
                    v-else-if="column.key === 'address'"
                    class="vote-record-cell vote-record-cell--address"
                  >
                    {{ record.address }}
                  </div>
                  <div
                    v-else-if="column.key === 'weight'"
                    class="vote-record-cell vote-record-cell--weight"
                  >
                    {{ record.weight }}
                  </div>
                </template>
              </a-table>
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
import { CaretUpFilled, CaretDownFilled } from '@ant-design/icons-vue'
import { useVoteDetailPage } from '../../workflows/governance/useVoteDetailPage'

defineOptions({
  name: 'VoteDetailPage',
})

const page = proxyRefs(useVoteDetailPage())
</script>

<style lang="scss" scoped>
.icon-approve {
  color: var(--ow-color-success);
}
.icon-reject {
  color: var(--ow-color-danger);
}

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

.visiter-approve,
.visiter-reject {
  display: flex;
  align-items: baseline;
  gap: var(--ow-space-1);
  min-width: 120px;
}

.short-line {
  display: none;
}

.voted-container {
  margin-bottom: var(--ow-space-5);

  .my-voted {
    margin-top: var(--ow-space-1);

    span {
      font-size: var(--ow-font-size-body);
      font-family: var(--ow-font-regular);
    }

    span:last-child {
      color: var(--ow-color-text-secondary);
    }
  }

  .my-voted-approve {
    span:first-child {
      color: var(--ow-color-success);
    }
  }

  .my-voted-reject {
    span:first-child {
      color: var(--ow-color-danger);
    }
  }

  .vote-card {
    min-width: 180px;
    cursor: pointer;
  }

  .vote-card > p:first-child {
    display: flex;
    align-items: baseline;
    gap: var(--ow-space-1);
    margin: 0;
    flex-wrap: wrap;
  }

  .vote-card--locked {
    cursor: default;
  }

  .vote-inline-label {
    margin: 0;
    font-family: var(--ow-font-regular);
    font-size: var(--ow-font-size-body);
    line-height: var(--ow-line-height-body);
    color: var(--ow-color-text-secondary);
  }

  .vote-option {
    margin-top: var(--ow-space-1);
    font-family: var(--ow-font-regular);
    font-size: var(--ow-font-size-body);
    color: var(--ow-color-text-secondary);
  }
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

.info-container {
  margin-bottom: var(--ow-space-5);
}

.vote-detail-info {
  padding-top: 0;

  .info-item {
    grid-template-columns: minmax(88px, 0.24fr) minmax(0, 1fr);
    gap: var(--ow-space-2);
    align-items: start;
    word-break: normal;
  }

  .ow-kv-label {
    white-space: nowrap;
  }

  .ow-kv-value {
    overflow-wrap: anywhere;
  }

  .info-item--creator .ow-kv-value {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
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

.vote-record-cell {
  min-width: 0;
  font-family: var(--ow-font-regular);
  font-size: var(--ow-font-size-body);
  line-height: var(--ow-line-height-body);
  color: var(--ow-color-text-primary);
}

.vote-record-cell--name {
  white-space: normal;
  overflow-wrap: anywhere;
}

.vote-record-cell--address {
  display: -webkit-box;
  overflow: hidden;
  white-space: normal;
  overflow-wrap: anywhere;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.vote-record-cell--weight {
  white-space: nowrap;
  text-align: right;
  font-variant-numeric: tabular-nums;
}

.my-voted-text {
  opacity: 1 !important;
}

.hash-link {
  word-break: break-all;
}

@media (max-width: 900px) {
  .vote-detail-layout {
    --ow-two-panel-columns: 1fr;
  }
}
</style>
