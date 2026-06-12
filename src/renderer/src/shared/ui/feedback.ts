import { message, Modal } from 'ant-design-vue'
import i18n from '../../lang'
import type { AppErrorPayload } from '../lib/result/types'

type FeedbackContent = string | number
type FeedbackOptions = { literal?: boolean }
type SuccessModalOptions = {
  title: FeedbackContent
  content: FeedbackContent
  literalTitle?: boolean
  literalContent?: boolean
}

type MessageLevel = 'error' | 'warning' | 'success' | 'info'

export function translateFeedback(key: FeedbackContent, fallback: FeedbackContent = key): string {
  const keyString = String(key)
  if (!i18n?.global?.t) return String(fallback)
  const translated = i18n.global.t(keyString)
  return translated === keyString && fallback !== key ? String(fallback) : translated
}

function resolveContent(content: FeedbackContent, literal = false): string {
  return literal ? String(content) : translateFeedback(content)
}

function normalizeToastKeyPart(value: string | undefined): string {
  return (value ?? '').replace(/\s+/g, ' ').trim()
}

function hashToastKey(parts: Array<string | undefined>): string {
  const input = parts.map(normalizeToastKeyPart).join('\x1f')
  let hash = 0x811c9dc5
  for (let i = 0; i < input.length; i += 1) {
    hash ^= input.charCodeAt(i)
    hash = Math.imul(hash, 0x01000193)
  }
  return (hash >>> 0).toString(36)
}

function dedupeKeyFor(level: MessageLevel, parts: Array<string | undefined>): string {
  return `owallet-message-${level}-${hashToastKey(parts)}`
}

function messageKeyFor(level: MessageLevel, content: string): string {
  return dedupeKeyFor(level, [content])
}

// ---------------------------------------------------------------------------
// Backward-compat shims — single-line toasts. Used by older call sites and by
// the tests that mock `ant-design-vue`'s `message` API.
// ---------------------------------------------------------------------------

export function notifySuccess(content: FeedbackContent, options: FeedbackOptions = {}) {
  const resolvedContent = resolveContent(content, options.literal)
  return message.success({
    content: resolvedContent,
    key: messageKeyFor('success', resolvedContent),
  })
}

export function notifyWarning(content: FeedbackContent, options: FeedbackOptions = {}) {
  const resolvedContent = resolveContent(content, options.literal)
  return message.warning({
    content: resolvedContent,
    key: messageKeyFor('warning', resolvedContent),
  })
}

export function notifyError(content: FeedbackContent, options: FeedbackOptions = {}) {
  const resolvedContent = resolveContent(content, options.literal)
  return message.error({
    content: resolvedContent,
    key: messageKeyFor('error', resolvedContent),
  })
}

export function notifyInfo(content: FeedbackContent, options: FeedbackOptions = {}) {
  const resolvedContent = resolveContent(content, options.literal)
  return message.info({
    content: resolvedContent,
    key: messageKeyFor('info', resolvedContent),
  })
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

export function showAppError(payload: AppErrorPayload, options: { titleKey?: string } = {}): void {
  notifyError(options.titleKey ?? payload.errorKey)
}

export function showAppWarning(
  payload: AppErrorPayload,
  options: { titleKey?: string } = {}
): void {
  notifyWarning(options.titleKey ?? payload.errorKey)
}

export function showAppSuccess(content: FeedbackContent, detail?: string): void {
  void detail
  notifySuccess(content)
}

export function showAppInfo(content: FeedbackContent, detail?: string): void {
  void detail
  notifyInfo(content)
}
