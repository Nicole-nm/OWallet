import httpClient from '../../shared/network/httpClient'
import { createLogger } from '../../shared/lib/logger'

const RELEASES_URL = 'https://api.github.com/repos/ontio/OWallet/releases/latest'
const logger = createLogger('applicationService')

export async function fetchLatestRelease() {
  try {
    return await httpClient.get(RELEASES_URL)
  } catch {
    logger.error('fetchLatestRelease')
    return null
  }
}
