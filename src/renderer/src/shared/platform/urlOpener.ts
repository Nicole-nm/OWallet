import { openExternal } from './bridge'
import { logger } from '../lib/logger'

export function open(url: unknown) {
  if (typeof url === 'string' && url.startsWith('https://')) {
    return openExternal(url)
  }

  logger.warn('urlOpener.open', 'Blocked open() for non-https URL:', url)
  return undefined
}
