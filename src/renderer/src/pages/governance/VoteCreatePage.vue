<template>
  <div class="vote-create-page ow-page ow-page--flush-top">
    <breadcrumb :routes="page.routes" :current="$t('vote.new')" @backEvent="page.back"></breadcrumb>
    <div class="vote-create-panel ow-panel ow-panel--flat">
      <div class="ow-panel-body vote-create-panel__body">
        <div class="vote-create-section vote-field">
          <p class="ow-form-item__label ow-text-section vote-create-section__label">
            {{ $t('vote.title') }}
          </p>
          <a-textarea
            v-model:value="page.title"
            placeholder="Title of the voted issue"
            :auto-size="{ minRows: 2, maxRows: 6 }"
            @keyup="page.onTitleInput"
            class="ow-field-control vote-create-control"
          >
          </a-textarea>
          <span class="vote-create-counter">{{ page.title.length }}/{{ page.titleLimit }}</span>
        </div>
        <div class="vote-date-grid">
          <div class="vote-date-field">
            <p class="ow-form-item__label ow-text-section vote-create-section__label">
              {{ $t('vote.votingStarts') }}
            </p>
            <div>
              <a-date-picker
                placeholder="Date"
                v-model:value="page.startDate"
                class="vote-date-input"
              />
              <a-time-picker
                placeholder="Time"
                v-model:value="page.startTime"
                class="vote-time-input"
              />
            </div>
          </div>
          <div class="vote-date-field">
            <p class="ow-form-item__label ow-text-section vote-create-section__label">
              {{ $t('vote.votingEnds') }}
            </p>
            <div>
              <a-date-picker
                placeholder="Date"
                v-model:value="page.endDate"
                class="vote-date-input"
              />
              <a-time-picker
                placeholder="Time"
                v-model:value="page.endTime"
                class="vote-time-input"
              />
            </div>
          </div>
        </div>

        <div class="vote-create-section vote-field">
          <p class="ow-form-item__label ow-text-section vote-create-section__label">
            {{ $t('vote.detail') }}
          </p>
          <a-textarea
            v-model:value="page.content"
            placeholder="Detailed information of the voting"
            :rows="6"
            @keyup="page.onDetailInput"
            class="ow-field-control vote-create-control"
          >
          </a-textarea>
          <span class="vote-create-counter">{{ page.content.length }}/{{ page.detailLimit }}</span>
        </div>

        <div class="ow-button-row ow-button-row--center vote-create-actions">
          <a-button type="default" variant="secondary" @click="page.back">{{
            $t('vote.back')
          }}</a-button>
          <a-button type="primary" variant="primary" @click="page.submit">{{
            $t('vote.submit')
          }}</a-button>
        </div>
      </div>
    </div>
    <sign-send-tx
      v-model:open="page.signVisible"
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
import { useVoteCreatePage } from '../../workflows/governance/useVoteCreatePage'

defineOptions({
  name: 'VoteCreatePage',
})

const page = proxyRefs(useVoteCreatePage())
</script>

<style lang="scss" scoped>
.vote-create-panel {
  width: var(--ow-layout-flow-width);
  max-width: calc(100% - var(--ow-layout-gutter));
  margin: var(--ow-space-5) auto 0;
}

.vote-create-panel__body {
  display: grid;
  gap: var(--ow-space-8);
  padding: var(--ow-space-6);
}

.vote-create-section {
  position: relative;
}

.vote-create-section__label {
  margin-bottom: var(--ow-space-2);
}

.vote-create-control {
  border: 1px solid var(--ow-color-border-strong);
  border-radius: var(--ow-radius-control);
}

.vote-create-control:focus {
  box-shadow: var(--ow-shadow-focus);
}

.vote-create-counter {
  position: absolute;
  right: 0;
  bottom: calc(var(--ow-space-5) * -1);
  font-size: var(--ow-font-size-caption);
  font-family: var(--ow-font-regular);
  color: var(--ow-color-text-secondary);
}

.vote-date-input {
  width: 140px;
  margin-right: var(--ow-space-2);
  border-radius: var(--ow-radius-control);
}

.vote-time-input {
  width: 110px;

  input {
    border-radius: var(--ow-radius-control) !important;
  }
}

.vote-date-grid {
  width: 100%;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--ow-space-5);
  margin-bottom: var(--ow-space-8);
}

.vote-create-actions {
  margin-top: calc(var(--ow-space-1) * -1);
}

@media (max-width: 700px) {
  .vote-date-grid {
    grid-template-columns: 1fr;
  }
}
</style>
