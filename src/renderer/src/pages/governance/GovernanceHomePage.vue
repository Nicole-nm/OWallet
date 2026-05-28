<template>
  <div class="negative-margin-top">
    <a-tabs class="ow-section-tabs">
      <a-tab-pane key="governance" :tab="$t('vote.node')">
        <div class="ow-card-grid ow-card-grid--padded">
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">{{ $t('nodeMgmt.nodeStakeMgmt') }}</p>
            <p class="ow-action-card__meta">{{ $t('nodeMgmt.nodeUser') }}</p>
            <div class="ow-action-card__control" @click="handleNodeStake">
              <ArrowRightOutlined />
            </div>
          </div>
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">{{ $t('nodeMgmt.stakeAuthorizaton') }}</p>
            <p class="ow-action-card__meta">{{ $t('nodeMgmt.normalUser') }}</p>
            <div class="ow-action-card__control" @click="handleAuthorization">
              <ArrowRightOutlined />
            </div>
          </div>
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">{{ $t('vote.vote') }}</p>
            <p class="ow-action-card__meta">{{ $t('vote.voteTip') }}</p>
            <div class="ow-icon-action governance-policy" @click="openPolicyPage">
              <QuestionCircleOutlined class="policy-icon" />
            </div>
            <div class="ow-action-card__control" @click="handleVote">
              <ArrowRightOutlined />
            </div>
          </div>
          <div class="ow-action-card ow-action-card--tile">
            <p class="ow-action-card__title">{{ $t('nodeMgmt.newNodeApply') }}</p>
            <p class="ow-action-card__meta">{{ $t('nodeMgmt.nodeApplyTip') }}</p>
            <div class="ow-action-card__control" @click="handleNodeApply">
              <ArrowRightOutlined />
            </div>
          </div>
        </div>
      </a-tab-pane>
    </a-tabs>
  </div>
</template>

<script setup lang="ts">
import { ArrowRightOutlined, QuestionCircleOutlined } from '@ant-design/icons-vue'
import { useGovernanceHomePage } from '../../workflows/governance/useGovernanceHomePage'

defineOptions({
  name: 'GovernanceHomePage',
})

const { handleNodeStake, handleAuthorization, openPolicyPage, handleVote, handleNodeApply } =
  useGovernanceHomePage()
</script>

<style scoped>
.governance-policy {
  position: absolute;
  top: var(--ow-space-4);
  right: var(--ow-space-5);
  cursor: pointer;
}
</style>
