import { open } from '../../../shared/platform/urlOpener'

export function openExternalUrl(url: unknown) {
  return open(url)
}
