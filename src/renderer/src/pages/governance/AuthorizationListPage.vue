<template>
  <div class="authorization-page ow-page ow-page--flush-top">
    <breadcrumb
      :current="$t('nodeMgmt.stakeAuthorization')"
      @backEvent="handleRouteBack"
    ></breadcrumb>
    <div class="authorization-list-page">
      <div class="ow-page-header authorization-list-header">
        <div class="block-clock ow-panel ow-panel--flat">
          <div class="ow-panel-body countdown-block">
            <div class="countdown-img">
              <img src="../../assets/countdown.svg" alt="" />
            </div>
            <div class="countdown-text">
              <p>{{ $t('nodeMgmt.toNextRound') }}</p>
              <span class="countdown-value">{{ authorizationListCountdown }}</span>
              <span class="countdown-label">{{ $t('nodeMgmt.blocks') }}</span>
            </div>
            <span class="ow-icon-action question-icon" @click="toQuestion">
              <QuestionCircleOutlined />
            </span>
          </div>
        </div>
        <a-button type="primary" variant="primary" @click="toStakeHistory">{{
          $t('nodeMgmt.stakeHistory')
        }}</a-button>
      </div>
      <div class="authorization-list-table ow-table-shell">
        <a-table
          :columns="columns"
          :dataSource="authorizationListNodes"
          :loading="authorizationListRequesting"
          :pagination="authorizationListPagination"
          @change="handleTableChange"
        >
          <template #headerCell="{ column }">
            <div v-if="column.key === 'nodeProportion'" class="proportion-title">
              <p>
                {{ $t('nodeMgmt.proportionNextRound') }}
                <InfoCircleOutlined class="proportion-info-icon" @click="showProportionTip" />
              </p>
            </div>
          </template>
          <template #bodyCell="{ column, text, record }">
            <template v-if="column.key === 'nodeProportion'"
              >{{ record.nodeProportion }} / {{ record.userProportion }}</template
            >
            <a
              v-else-if="column.key === 'name'"
              class="node-name"
              :class="record.status === 2 ? 'node-consensus' : 'node-candidate'"
              @click="handleNodeDetail(record)"
            >
              <a-tooltip placement="top" :title="$t('nodeMgmt.consensusNode')">
                <StarFilled v-if="record.status === 2" />
              </a-tooltip>
              <a-tooltip placement="top" :title="$t('nodeMgmt.candidateNode')">
                <StarOutlined v-if="record.status === 1" />
              </a-tooltip>
              {{ text }}
            </a>
            <div
              v-else-if="
                column.key === 'action' && record.maxAuthorize > 0 && record.process !== '100.00%'
              "
              class="detail-link ow-icon-action"
            >
              <ArrowRightOutlined
                @click="handleAuthorizeLogin(record)"
                v-if="record.maxAuthorize > 0"
              />
            </div>
          </template>
        </a-table>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import {
  QuestionCircleOutlined,
  InfoCircleOutlined,
  StarFilled,
  StarOutlined,
  ArrowRightOutlined,
} from '@ant-design/icons-vue'
import { useNodeAuthorizationListPage } from '../../workflows/governance/useNodeAuthorizationListPage'

defineOptions({
  name: 'AuthorizationListPage',
})

const {
  columns,
  authorizationListRequesting,
  authorizationListPagination,
  authorizationListNodes,
  authorizationListCountdown,
  handleRouteBack,
  handleAuthorizeLogin,
  handleNodeDetail,
  handleTableChange,
  showProportionTip,
  toStakeHistory,
  toQuestion,
} = useNodeAuthorizationListPage()
</script>

<style scoped>
.authorization-list-page {
  max-width: 900px;
  margin: 0 auto;
  display: grid;
  gap: var(--ow-space-5);
}

.authorization-list-header {
  margin-bottom: 0;
}

.authorization-list-table {
  width: 100%;
}

.block-clock {
  width: 540px;
  min-height: 86px;
  max-width: 100%;
  margin: 0;
  flex-shrink: 0;
}

.countdown-block {
  position: relative;
}

.countdown-img {
  float: left;
  height: 60px;
  line-height: 60px;
}

.countdown-img img {
  width: 60px;
  height: 60px;
}

.countdown-text {
  padding-right: 60px;
  text-align: center;
}

.countdown-text p {
  margin-bottom: var(--ow-space-2);
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-section);
}

.countdown-value {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-primary);
  font-size: var(--ow-font-size-title);
}

.countdown-label {
  font-family: var(--ow-font-medium);
  color: var(--ow-color-text-secondary);
  font-size: var(--ow-font-size-subtitle);
  margin-left: var(--ow-space-3);
}

.detail-link {
  margin: 0 auto;
}

.proportion-title p {
  margin: 0;
}

.proportion-info-icon {
  cursor: pointer;
}

.question-icon {
  position: absolute;
  top: var(--ow-space-3);
  right: var(--ow-space-3);
}

.node-name:hover {
  color: var(--ow-color-brand) !important;
}

@media (max-width: 760px) {
  .authorization-list-header {
    align-items: stretch;
    flex-direction: column;
  }

  .block-clock {
    width: 100%;
  }
}
</style>
