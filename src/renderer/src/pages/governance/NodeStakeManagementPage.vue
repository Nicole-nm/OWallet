<template>
  <div class="node-stake-management-page">
    <breadcrumb :current="$t('nodeMgmt.nodeStakeMgmt')" @backEvent="handleRouteBack"></breadcrumb>

    <a-tabs
      class="ow-section-tabs node-stake-management-tabs"
      :activeKey="activeTab"
      @update:activeKey="activeTab = $event"
      :animated="false"
    >
      <a-tab-pane key="1" :tab="$t('nodeMgmt.nodeStake')">
        <node-stake-info :showPosBtn="true" :breadcrumb="true"></node-stake-info>
      </a-tab-pane>
      <a-tab-pane key="2" :tab="$t('nodeMgmt.userStakeAuthorization')">
        <node-stake-authorization></node-stake-authorization>
      </a-tab-pane>
      <a-tab-pane key="3" :tab="$t('nodeInfo.nodeInfo')">
        <node-info></node-info>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import Breadcrumb from '../../shared/ui/navigation/Breadcrumb.vue'
import NodeStakeInfo from '../../workflows/governance/NodeStakeInfoPanel.vue'
import NodeStakeAuthorization from '../../workflows/governance/NodeStakeAuthorizationPanel.vue'
import NodeInfo from '../../workflows/governance/NodeInfoPanel.vue'
import { useNodeStakeManagementPage } from '../../workflows/governance/useNodeStakeManagementPage'

defineOptions({
  name: 'NodeStakeManagementPage',
})

const { activeTab, handleRouteBack } = useNodeStakeManagementPage()
</script>

<style scoped>
.node-stake-management-page {
  box-sizing: border-box;
  padding-bottom: 0;
}

.node-stake-management-tabs :deep(.ant-tabs-nav) {
  line-height: normal;
}

.node-stake-management-tabs :deep(.ant-tabs-tab),
.node-stake-management-tabs :deep(.ant-tabs-tab-btn) {
  font-size: var(--ow-font-size-body);
}

.node-stake-management-tabs :deep(.ant-tabs-tab) {
  padding-top: var(--ow-space-2);
  padding-bottom: var(--ow-space-1);
}

.node-stake-management-tabs :deep(.ant-tabs-tab-btn) {
  line-height: var(--ow-line-height-body);
}

.node-stake-management-tabs :deep(.ant-tabs-content-holder),
.node-stake-management-tabs :deep(.ant-tabs-tabpane) {
  padding-bottom: 0;
}
</style>
