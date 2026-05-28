<template>
  <AntButton
    v-bind="forwardedAttrs"
    :type="antButtonType"
    :html-type="htmlType"
    :loading="loading"
    :disabled="disabled || loading"
    :danger="isDanger"
    :block="block"
    :aria-busy="loading || undefined"
    :aria-disabled="disabled || loading || undefined"
    :class="buttonClasses"
    @click="handleClick"
  >
    <slot />
  </AntButton>
</template>

<script setup lang="ts">
import { computed, inject, type PropType, useAttrs } from 'vue'
import { routerKey, type RouteLocationRaw } from 'vue-router'
import { Button as AntButton } from 'ant-design-vue'
import {
  BUTTON_VARIANT_CLASSES,
  BUTTON_SIZE_CLASSES,
  type AppButtonVariant,
  type AppButtonSize,
} from './buttonConstants'

defineOptions({
  name: 'AppButton',
  inheritAttrs: false,
})

type AppButtonHtmlType = 'button' | 'submit' | 'reset'
type AntButtonType = 'primary' | 'default' | 'dashed' | 'link' | 'text'

const props = defineProps({
  variant: {
    type: String as PropType<AppButtonVariant | ''>,
    default: '',
  },
  type: {
    type: String,
    default: '',
  },
  size: {
    type: String as PropType<AppButtonSize>,
    default: 'default',
  },
  htmlType: {
    type: String as PropType<AppButtonHtmlType>,
    default: 'button',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  block: {
    type: Boolean,
    default: false,
  },
  to: {
    type: [String, Object] as PropType<RouteLocationRaw | null>,
    default: null,
  },
})

const emit = defineEmits<{
  (event: 'click', value: MouseEvent): void
}>()

const router = inject(routerKey, null)
const attrs = useAttrs()
const forwardedAttrs = computed(() => {
  const nextAttrs = { ...attrs }
  delete nextAttrs.class
  return nextAttrs
})

const resolvedVariant = computed(() => {
  if (props.variant) {
    return props.variant
  }

  switch (props.type) {
    case 'primary':
      return 'primary'
    case 'danger':
      return 'danger'
    case 'link':
    case 'text':
      return 'text'
    default:
      return 'secondary'
  }
})

const resolvedSize = computed(() => {
  if (props.size === 'compact' || props.size === 'small') {
    return 'compact'
  }

  return 'default'
})

const antButtonType = computed<AntButtonType>(() => {
  if (resolvedVariant.value === 'text') {
    return 'link'
  }

  if (props.type === 'primary' || props.type === 'link' || props.type === 'text') {
    return props.type
  }

  if (props.type === 'dashed') {
    return 'dashed'
  }

  return resolvedVariant.value === 'primary' ? 'primary' : 'default'
})

const isDanger = computed(() => resolvedVariant.value === 'danger' || props.type === 'danger')

const buttonClasses = computed(() => [
  'ow-button',
  BUTTON_VARIANT_CLASSES[resolvedVariant.value] ?? 'ow-button--secondary',
  BUTTON_SIZE_CLASSES[resolvedSize.value] ?? 'ow-button--default',
  {
    'ow-button--block': props.block,
    'ow-button--disabled': props.disabled || props.loading,
    'ow-button--link': Boolean(props.to),
  },
  attrs.class,
])

function handleClick(event: MouseEvent) {
  if (props.disabled || props.loading) {
    event.preventDefault()
    event.stopPropagation()
    return
  }

  emit('click', event)
  if (!props.to || event.defaultPrevented) {
    return
  }

  event.preventDefault()
  if (router) {
    void router.push(props.to)
  }
}
</script>

<style scoped>
.ow-button {
  min-width: var(--ow-button-min-width);
  height: var(--ow-button-height);
  padding: 0 var(--ow-space-4);
  border: 1px solid transparent !important;
  border-radius: var(--ow-radius-control) !important;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--ow-space-2);
  font-family: var(--ow-font-medium);
  font-size: var(--ow-font-size-body);
  line-height: 1;
  text-align: center;
  text-decoration: none;
  box-shadow: none !important;
  transition:
    background-color 0.18s ease,
    border-color 0.18s ease,
    color 0.18s ease,
    opacity 0.18s ease;
}

.ow-button :deep(span) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 0;
}

.ow-button--default {
  min-width: var(--ow-button-min-width);
}

.ow-button--compact {
  min-width: var(--ow-button-min-width-compact);
  height: var(--ow-button-height-compact);
  padding: 0 var(--ow-space-3);
}

.ow-button--block {
  width: 100%;
}

.ow-button--primary {
  background: var(--ow-color-brand) !important;
  border-color: var(--ow-color-brand) !important;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button--primary:hover,
.ow-button--primary:focus-visible {
  background: var(--ow-color-brand-hover) !important;
  border-color: var(--ow-color-brand-hover) !important;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button--secondary {
  background: var(--ow-color-secondary-bg) !important;
  border-color: var(--ow-color-secondary-bg) !important;
  color: var(--ow-color-secondary-foreground) !important;
}

.ow-button--secondary:hover,
.ow-button--secondary:focus-visible {
  background: var(--ow-color-secondary-hover) !important;
  border-color: var(--ow-color-secondary-hover) !important;
  color: var(--ow-color-secondary-foreground) !important;
}

.ow-button--accent {
  background: var(--ow-color-accent) !important;
  border-color: var(--ow-color-accent) !important;
  color: var(--ow-color-accent-foreground) !important;
}

.ow-button--accent:hover,
.ow-button--accent:focus-visible {
  background: var(--ow-color-accent-hover) !important;
  border-color: var(--ow-color-accent-hover) !important;
  color: var(--ow-color-accent-foreground) !important;
}

.ow-button--danger {
  background: var(--ow-color-danger) !important;
  border-color: var(--ow-color-danger) !important;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button--danger:hover,
.ow-button--danger:focus-visible {
  opacity: 0.86;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button--ghost {
  background: transparent !important;
  border-color: var(--ow-color-ghost-border) !important;
  color: var(--ow-color-ghost-foreground) !important;
}

.ow-button--ghost:hover,
.ow-button--ghost:focus-visible {
  background: var(--ow-color-ghost-hover) !important;
  border-color: var(--ow-color-ghost-border) !important;
  color: var(--ow-color-ghost-foreground) !important;
}

.ow-button--text {
  min-width: 0;
  height: auto;
  padding: 0;
  border-color: transparent !important;
  background: transparent !important;
  color: var(--ow-color-brand) !important;
}

.ow-button--text:hover,
.ow-button--text:focus-visible {
  border-color: transparent !important;
  background: transparent !important;
  color: var(--ow-color-brand-hover) !important;
}

.ow-button--contrast {
  background: transparent !important;
  border-color: var(--ow-color-text-inverse) !important;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button--contrast:hover,
.ow-button--contrast:focus-visible {
  background: var(--ow-color-info-soft) !important;
  border-color: var(--ow-color-text-inverse) !important;
  color: var(--ow-color-text-inverse) !important;
}

.ow-button:focus-visible {
  outline: none;
  box-shadow: var(--ow-shadow-focus) !important;
}

.ow-button--disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.ow-button--link {
  cursor: pointer;
}
</style>
