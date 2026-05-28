import { notifySuccess } from '../ui/feedback'

export function useClipboardNotice() {
  async function copyText(value: string) {
    await navigator.clipboard.writeText(value)
    notifySuccess('common.copied')
  }

  return {
    copyText,
  }
}
