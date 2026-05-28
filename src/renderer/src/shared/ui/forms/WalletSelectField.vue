<template>
  <ASelect
    v-bind="forwardedAttrs"
    :options="normalizedOptions"
    class="ow-field-control ow-wallet-select"
    :placeholder="placeholder"
    :value="value"
    :loading="loading"
    :disabled="disabled || loading"
    :allow-clear="allowClear"
    :show-search="showSearch"
    :filter-option="filterOption"
    :aria-label="ariaLabel || placeholder"
    :not-found-content="emptyText"
    @change="handleChange"
  >
    <template v-if="$slots.option" #option="slotProps">
      <slot name="option" v-bind="slotProps" />
    </template>
  </ASelect>
</template>

<script setup lang="ts">
import { computed, type PropType, useAttrs } from 'vue'
import { Select as ASelect } from 'ant-design-vue'
import type { DefaultOptionType, SelectValue } from 'ant-design-vue/es/select'

defineOptions({
  name: 'WalletSelectField',
  inheritAttrs: false,
})

interface WalletSelectOption {
  label?: string
  value?: string | number | null
  address?: string
  key?: string | number
  name?: string
}

const props = defineProps({
  options: {
    type: Array as PropType<WalletSelectOption[]>,
    default: () => [],
  },
  value: {
    type: [String, Number],
    default: undefined,
  },
  placeholder: {
    type: String,
    default: '',
  },
  emptyText: {
    type: String,
    default: 'No wallets found',
  },
  ariaLabel: {
    type: String,
    default: '',
  },
  loading: {
    type: Boolean,
    default: false,
  },
  disabled: {
    type: Boolean,
    default: false,
  },
  allowClear: {
    type: Boolean,
    default: true,
  },
  showSearch: {
    type: Boolean,
    default: true,
  },
})

const emit = defineEmits<{
  (event: 'update:value', value: SelectValue): void
  (
    event: 'walletSelected',
    value: { walletType: 'commonWallet' | 'ledgerWallet'; wallet: WalletSelectOption }
  ): void
}>()
const attrs = useAttrs()

const forwardedAttrs = computed(() => {
  const nextAttrs = { ...attrs }
  delete nextAttrs.class
  return nextAttrs
})

const normalizedOptions = computed(() =>
  props.options.map((wallet) => ({
    ...wallet,
    label: wallet.label || wallet.name || wallet.address || String(wallet.value ?? ''),
    value: wallet.value ?? wallet.address,
  }))
)

function filterOption(input: string, option?: DefaultOptionType) {
  const walletOption = option as WalletSelectOption | undefined
  const candidate = [
    walletOption?.label,
    walletOption?.value,
    walletOption?.address,
    walletOption?.name,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase()

  return candidate.includes(input.toLowerCase())
}

function getRawSelectValue(value: SelectValue) {
  if (Array.isArray(value)) {
    return undefined
  }

  if (value && typeof value === 'object' && 'value' in value) {
    return value.value
  }

  return value
}

function handleChange(value: SelectValue) {
  emit('update:value', value)
  const rawValue = getRawSelectValue(value)

  const wallet = normalizedOptions.value.find((candidate) => {
    return candidate.address === rawValue || candidate.value === rawValue
  })

  if (!wallet) {
    return
  }

  emit('walletSelected', {
    walletType: wallet.key ? 'commonWallet' : 'ledgerWallet',
    wallet,
  })
}
</script>
