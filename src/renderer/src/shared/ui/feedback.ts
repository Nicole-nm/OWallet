import { defineAsyncComponent, h, type VNode } from 'vue'
import { message, Modal, notification } from 'ant-design-vue'
import i18n from '../../lang'
import type { AppErrorPayload, FailureMetadata } from '../lib/result/types'

const AppErrorDetails = defineAsyncComponent(() => import('./AppErrorDetails.vue'))

type FeedbackContent = string | number
type FeedbackOptions = { literal?: boolean }
type SuccessModalOptions = {
  title: FeedbackContent
  content: FeedbackContent
  literalTitle?: boolean
  literalContent?: boolean
}

const DEFAULT_DURATION_ERROR = 8
const DEFAULT_DURATION_WARNING = 6
const DEFAULT_DURATION_SUCCESS = 3
const DEFAULT_DURATION_INFO = 4

export function translateFeedback(key: FeedbackContent, fallback: FeedbackContent = key): string {
  const keyString = String(key)
  if (!i18n?.global?.t) return String(fallback)
  const translated = i18n.global.t(keyString)
  return translated === keyString && fallback !== key ? String(fallback) : translated
}

function resolveContent(content: FeedbackContent, literal = false): string {
  return literal ? String(content) : translateFeedback(content)
}

// ---------------------------------------------------------------------------
// Backward-compat shims — single-line toasts. Used by older call sites and by
// the tests that mock `ant-design-vue`'s `message` API.
// ---------------------------------------------------------------------------

export function notifySuccess(content: FeedbackContent, options: FeedbackOptions = {}) {
  return message.success(resolveContent(content, options.literal))
}

export function notifyWarning(content: FeedbackContent, options: FeedbackOptions = {}) {
  return message.warning(resolveContent(content, options.literal))
}

export function notifyError(content: FeedbackContent, options: FeedbackOptions = {}) {
  return message.error(resolveContent(content, options.literal))
}

export function showSuccessModal({
  title,
  content,
  literalTitle = false,
  literalContent = true,
}: SuccessModalOptions) {
  return Modal.success({
    title: resolveContent(title, literalTitle),
    content: resolveContent(content, literalContent),
  })
}

// ---------------------------------------------------------------------------
// Rich toast pipeline — preserves AppErrorPayload's category/code/cause and
// surfaces a "Details" affordance for support diagnostics.
// ---------------------------------------------------------------------------

type NotificationLevel = 'error' | 'warning' | 'success' | 'info'

function notificationKeyFor(payload: FailureMetadata): string {
  return `app-${payload.code ?? payload.category ?? 'generic'}`
}

function durationFor(level: NotificationLevel, payload?: FailureMetadata): number {
  switch (level) {
    case 'error':
      return payload?.category === 'unknown' ? 0 : DEFAULT_DURATION_ERROR
    case 'warning':
      return DEFAULT_DURATION_WARNING
    case 'success':
      return DEFAULT_DURATION_SUCCESS
    case 'info':
      return DEFAULT_DURATION_INFO
  }
}

function hasDiagnosticDetails(payload: FailureMetadata): boolean {
  return Boolean(payload.code || payload.cause || payload.detail)
}

function openDetailsModal(payload: FailureMetadata, title: string): void {
  Modal.info({
    title,
    width: 640,
    content: () => h(AppErrorDetails, { payload }) as VNode,
    okText: translateFeedback('feedback.close', 'Close'),
  })
}

function buildDetailsButton(payload: FailureMetadata, dialogTitle: string): VNode | undefined {
  if (!hasDiagnosticDetails(payload)) return undefined
  const label = translateFeedback('feedback.details', 'Details')
  return h(
    'button',
    {
      type: 'button',
      class: 'owallet-toast-details-btn',
      onClick: () => openDetailsModal(payload, dialogTitle),
      style: 'background:transparent;border:0;padding:0;color:#1677ff;cursor:pointer;font:inherit;',
    },
    label
  )
}

function emit(level: NotificationLevel, payload: AppErrorPayload, title?: string): void {
  const resolvedTitle = title ?? translateFeedback(payload.errorKey)
  const description = payload.detail || undefined
  const btn = buildDetailsButton(payload, resolvedTitle)

  notification[level]({
    message: resolvedTitle,
    description,
    btn,
    duration: durationFor(level, payload),
    key: notificationKeyFor(payload),
  })
}

export function showAppError(payload: AppErrorPayload, options: { titleKey?: string } = {}): void {
  emit('error', payload, options.titleKey ? translateFeedback(options.titleKey) : undefined)
}

export function showAppWarning(
  payload: AppErrorPayload,
  options: { titleKey?: string } = {}
): void {
  emit('warning', payload, options.titleKey ? translateFeedback(options.titleKey) : undefined)
}

export function showAppSuccess(content: FeedbackContent, detail?: string): void {
  notification.success({
    message: resolveContent(content),
    description: detail || undefined,
    duration: durationFor('success'),
  })
}

export function showAppInfo(content: FeedbackContent, detail?: string): void {
  notification.info({
    message: resolveContent(content),
    description: detail || undefined,
    duration: durationFor('info'),
  })
}
