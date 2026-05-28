import { message, Modal } from 'ant-design-vue'
import i18n from '../../lang'

type FeedbackContent = string | number
type FeedbackOptions = { literal?: boolean }
type SuccessModalOptions = {
  title: FeedbackContent
  content: FeedbackContent
  literalTitle?: boolean
  literalContent?: boolean
}

export function translateFeedback(key: FeedbackContent, fallback: FeedbackContent = key): string {
  const keyString = String(key)
  return i18n?.global?.t ? i18n.global.t(keyString) : String(fallback)
}

function resolveContent(content: FeedbackContent, literal = false): string {
  return literal ? String(content) : translateFeedback(content)
}

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
