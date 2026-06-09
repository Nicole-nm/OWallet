<template>
  <div class="voted-container ow-stat-grid">
    <template v-if="!isVoter">
      <div class="visiter-approve ow-stat-card">
        <CaretUpFilled class="icon-approve" />
        <span class="ow-stat-value">{{ approvesDisplay }}</span>
        <span class="vote-inline-label">votes</span>
      </div>
      <div class="short-line"></div>
      <div class="visiter-reject ow-stat-card">
        <CaretDownFilled class="icon-reject" />
        <span class="ow-stat-value">{{ rejectsDisplay }}</span>
        <span class="vote-inline-label">votes</span>
      </div>
    </template>

    <template v-if="isVoter">
      <div
        class="vote-card ow-stat-card ow-stat-card--interactive"
        @click="emit('approve')"
        :class="{
          'ow-stat-card--success': approved,
          'vote-card--locked': approved,
        }"
      >
        <p>
          <CaretUpFilled class="icon-approve" />
          <span :class="{ 'my-voted-text': approved }" class="ow-stat-value">{{
            approvesDisplay
          }}</span>
          <span :class="{ 'my-voted-text': approved }" class="vote-inline-label">votes</span>
        </p>
        <p class="vote-option" v-if="!approved">Vote Up</p>
        <p class="my-voted my-voted-approve" v-if="approved">
          <span>Voted</span>
          <span class="added-votes"> +{{ myWeightDisplay }}</span>
        </p>
      </div>
      <div
        class="vote-card ow-stat-card ow-stat-card--interactive"
        @click="emit('reject')"
        :class="{
          'ow-stat-card--danger': rejected,
          'vote-card--locked': rejected,
        }"
      >
        <p>
          <CaretDownFilled class="icon-reject" />
          <span :class="{ 'my-voted-text': rejected }" class="ow-stat-value">{{
            rejectsDisplay
          }}</span>
          <span :class="{ 'my-voted-text': rejected }" class="vote-inline-label">votes</span>
        </p>
        <p class="my-voted my-voted-reject" v-if="rejected">
          <span>Voted</span>
          <span class="added-votes"> +{{ myWeightDisplay }}</span>
        </p>
        <p class="vote-option" v-if="!rejected">Vote Down</p>
      </div>
    </template>
  </div>
</template>

<script setup lang="ts">
import { CaretUpFilled, CaretDownFilled } from '@ant-design/icons-vue'

defineProps<{
  isVoter: boolean
  approved: boolean
  rejected: boolean
  approvesDisplay: string | number
  rejectsDisplay: string | number
  myWeightDisplay: string | number
}>()

const emit = defineEmits<{
  approve: []
  reject: []
}>()
</script>

<style lang="scss" scoped>
.icon-approve {
  color: var(--ow-color-success);
}
.icon-reject {
  color: var(--ow-color-danger);
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

.my-voted-text {
  opacity: 1 !important;
}
</style>
