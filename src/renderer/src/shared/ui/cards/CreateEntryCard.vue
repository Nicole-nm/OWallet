<template>
  <ACard
    class="ow-create-card"
    :class="[
      `ow-create-card--${variant}`,
      actionLayout === 'single' ? 'ow-create-card--single' : 'ow-create-card--stacked',
      bordered ? 'ow-create-card--bordered' : '',
    ]"
    :bordered="bordered"
    role="group"
    :aria-label="ariaLabel || undefined"
  >
    <div class="ow-create-card__visual" aria-hidden="true">
      <img class="ow-create-card__icon" :src="resolvedIconSrc" :alt="iconAlt" />
    </div>

    <div
      class="ow-create-card__actions"
      :class="
        actionLayout === 'single'
          ? 'ow-create-card__actions--single'
          : 'ow-create-card__actions--stacked'
      "
    >
      <div
        v-for="(action, index) in actions"
        :key="action.key || action.label || index"
        class="ow-create-card__action"
      >
        <AppButton
          class="ow-create-card__button"
          :variant="action.variant || 'primary'"
          size="compact"
          :to="action.to"
          :disabled="action.disabled"
          :aria-label="action.ariaLabel || action.label"
        >
          {{ action.label }}
        </AppButton>
      </div>
    </div>
  </ACard>
</template>

<script setup lang="ts">
import createWalletIcon from '@/assets/create-wallet.png'
import { Card as ACard } from 'ant-design-vue'
import { computed, type PropType } from 'vue'
import AppButton from '../actions/AppButton.vue'
import type { RouteLocationRaw } from 'vue-router'

defineOptions({
  name: 'CreateEntryCard',
})

interface CreateEntryAction {
  key?: string | number
  label: string
  to?: RouteLocationRaw
  disabled?: boolean
  variant?: 'primary' | 'secondary' | 'accent' | 'ghost' | 'text' | 'contrast' | 'danger'
  ariaLabel?: string
}

const props = defineProps({
  actions: {
    type: Array as PropType<CreateEntryAction[]>,
    default: () => [],
  },
  variant: {
    type: String,
    default: 'wallet',
  },
  actionLayout: {
    type: String,
    default: 'stacked',
  },
  bordered: {
    type: Boolean,
    default: false,
  },
  showActions: {
    type: Boolean,
    required: false,
  },
  iconSrc: {
    type: String,
    default: '',
  },
  iconAlt: {
    type: String,
    default: '',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
})

const resolvedIconSrc = computed(() => props.iconSrc || createWalletIcon)
</script>

<style scoped>
.ow-create-card {
  overflow: hidden;
}

.ow-create-card :deep(.ant-card-body) {
  position: relative;
  width: 100%;
  height: 100%;
  min-height: inherit;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: var(--ow-space-5);
  padding: var(--ow-space-5);
}

.ow-create-card__visual {
  display: flex;
  align-items: center;
  justify-content: center;
  width: var(--ow-space-16);
  height: var(--ow-space-16);
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease;
}

.ow-create-card__icon {
  width: 60px;
  height: 60px;
  object-fit: contain;
}

.ow-create-card__actions {
  position: absolute;
  inset: 0;
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: var(--ow-space-5);
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity 0.15s ease,
    visibility 0.15s ease;
}

.ow-create-card:hover .ow-create-card__visual,
.ow-create-card:focus-within .ow-create-card__visual {
  opacity: 0;
  visibility: hidden;
}

.ow-create-card:hover .ow-create-card__actions,
.ow-create-card:focus-within .ow-create-card__actions {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
}

.ow-create-card__actions--single {
  display: flex;
  justify-content: center;
}

.ow-create-card__actions--stacked {
  display: grid;
  gap: var(--ow-space-3);
  justify-items: center;
}

.ow-create-card__action {
  width: min(100%, 10.625rem);
}

.ow-create-card__button {
  width: 100%;
}
</style>
