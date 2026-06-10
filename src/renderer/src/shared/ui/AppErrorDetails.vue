<template>
  <div class="ow-error-details">
    <dl class="ow-error-details__list">
      <template v-if="payload.code">
        <dt>{{ t('feedback.code', 'Code') }}</dt>
        <dd>
          <code>{{ payload.code }}</code>
        </dd>
      </template>
      <template v-if="payload.category">
        <dt>{{ t('feedback.category', 'Category') }}</dt>
        <dd>
          <code>{{ payload.category }}</code>
        </dd>
      </template>
      <template v-if="causeStatusCode !== undefined">
        <dt>{{ t('feedback.statusCode', 'Status') }}</dt>
        <dd>
          <code>0x{{ causeStatusCode.toString(16) }} ({{ causeStatusCode }})</code>
        </dd>
      </template>
      <template v-if="causeMessage">
        <dt>{{ t('feedback.cause', 'Cause') }}</dt>
        <dd>
          <code>{{ causeMessage }}</code>
        </dd>
      </template>
      <template v-if="payload.detail && payload.detail !== causeMessage">
        <dt>{{ t('feedback.detail', 'Detail') }}</dt>
        <dd>
          <code>{{ payload.detail }}</code>
        </dd>
      </template>
      <dt>{{ t('feedback.timestamp', 'Time') }}</dt>
      <dd>
        <code>{{ timestamp }}</code>
      </dd>
    </dl>
    <button type="button" class="ow-error-details__copy" @click="copyDiagnostics">
      {{
        copyState === 'copied' ? t('feedback.copied', 'Copied') : t('feedback.copyDetails', 'Copy')
      }}
    </button>
  </div>
</template>

<script setup lang="ts">
import { computed, ref } from 'vue'
import type { PropType } from 'vue'
import i18n from '../../lang'
import type { FailureMetadata } from '../lib/result/types'

defineOptions({ name: 'AppErrorDetails' })

const props = defineProps({
  payload: {
    type: Object as PropType<FailureMetadata>,
    required: true,
  },
})

const copyState = ref<'idle' | 'copied'>('idle')

function t(key: string, fallback: string): string {
  if (!i18n?.global?.t) return fallback
  const translated = i18n.global.t(key)
  return translated === key ? fallback : translated
}

function readRecord(value: unknown): Record<string, unknown> | undefined {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : undefined
}

const causeRecord = computed(() => readRecord(props.payload.cause))
const causeMessage = computed(() => {
  const record = causeRecord.value
  return record && typeof record.message === 'string' ? record.message : ''
})
const causeStatusCode = computed<number | undefined>(() => {
  const record = causeRecord.value
  return record && typeof record.statusCode === 'number' ? record.statusCode : undefined
})
const timestamp = computed(() => new Date().toISOString())

async function copyDiagnostics(): Promise<void> {
  const record = causeRecord.value
  const diagnostics = {
    code: props.payload.code,
    category: props.payload.category,
    detail: props.payload.detail,
    statusCode: causeStatusCode.value,
    causeMessage: causeMessage.value || undefined,
    causeName: record && typeof record.name === 'string' ? record.name : undefined,
    timestamp: timestamp.value,
  }
  const text = JSON.stringify(diagnostics, null, 2)
  try {
    await navigator.clipboard.writeText(text)
    copyState.value = 'copied'
    setTimeout(() => {
      copyState.value = 'idle'
    }, 1500)
  } catch {
    copyState.value = 'idle'
  }
}
</script>

<style scoped lang="scss">
.ow-error-details {
  display: flex;
  flex-direction: column;
  gap: 12px;
  font-size: 13px;
}

.ow-error-details__list {
  display: grid;
  grid-template-columns: 100px 1fr;
  gap: 6px 16px;
  margin: 0;
  padding: 12px;
  background: var(--ow-color-surface-muted);
  border-radius: var(--ow-radius-card);
  font-family: var(--ow-font-mono, ui-monospace, SFMono-Regular, Menlo, monospace);
}

.ow-error-details__list dt {
  color: var(--ow-color-text-secondary);
  font-weight: 500;
}

.ow-error-details__list dd {
  margin: 0;
  overflow-wrap: break-word;
}

.ow-error-details__list code {
  background: none;
  padding: 0;
  color: var(--ow-color-text-primary);
}

.ow-error-details__copy {
  align-self: flex-end;
  background: transparent;
  border: 1px solid var(--ow-color-border-default);
  border-radius: var(--ow-radius-control);
  padding: 4px 12px;
  font-size: 12px;
  cursor: pointer;
}

.ow-error-details__copy:hover {
  background: var(--ow-color-surface-muted);
}
</style>
