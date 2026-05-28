<template>
  <section class="ow-app-state" :aria-busy="loading || undefined">
    <div v-if="loading" class="ow-app-state__loading" role="status" aria-live="polite">
      <ASkeleton active :title="skeletonTitle" :paragraph="{ rows: skeletonRows }" />
      <span class="ow-visually-hidden">{{ loadingLabel }}</span>
    </div>

    <AResult
      v-else-if="error"
      class="ow-app-state__result"
      :status="errorStatus"
      :title="errorTitle"
      :sub-title="errorDescription"
    >
      <template v-if="$slots.actions" #extra>
        <slot name="actions" />
      </template>
    </AResult>

    <AEmpty v-else-if="empty" class="ow-app-state__empty">
      <template #description>
        <div class="ow-app-state__empty-text">
          <strong>{{ emptyTitle }}</strong>
          <span v-if="emptyDescription">{{ emptyDescription }}</span>
        </div>
      </template>
      <template v-if="$slots.actions">
        <div class="ow-app-state__actions">
          <slot name="actions" />
        </div>
      </template>
    </AEmpty>

    <slot v-else />
  </section>
</template>

<script setup lang="ts">
import { Empty as AEmpty, Result as AResult, Skeleton as ASkeleton } from 'ant-design-vue'
import type { PropType } from 'vue'

defineOptions({
  name: 'AppState',
})

defineProps({
  loading: {
    type: Boolean,
    default: false,
  },
  error: {
    type: Boolean,
    default: false,
  },
  empty: {
    type: Boolean,
    default: false,
  },
  loadingLabel: {
    type: String,
    default: 'Loading',
  },
  errorTitle: {
    type: String,
    default: 'Unable to load data',
  },
  errorDescription: {
    type: String,
    default: '',
  },
  errorStatus: {
    type: String as PropType<'success' | 'error' | 'info' | 'warning' | '404' | '403' | '500'>,
    default: 'warning',
  },
  emptyTitle: {
    type: String,
    default: 'No data',
  },
  emptyDescription: {
    type: String,
    default: '',
  },
  skeletonRows: {
    type: Number,
    default: 3,
  },
  skeletonTitle: {
    type: Boolean,
    default: true,
  },
})
</script>

<style scoped>
.ow-app-state {
  width: 100%;
  min-width: 0;
}

.ow-app-state__loading,
.ow-app-state__empty,
.ow-app-state__result {
  width: min(100%, 680px);
  margin: 24px auto;
  padding: 24px;
}

.ow-app-state__empty-text {
  display: grid;
  gap: 6px;
  color: var(--ow-color-text-secondary);
}

.ow-app-state__empty-text strong {
  color: var(--ow-color-text-primary);
  font-family: var(--ow-font-medium);
}

.ow-app-state__actions {
  margin-top: 16px;
}

.ow-visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}
</style>
