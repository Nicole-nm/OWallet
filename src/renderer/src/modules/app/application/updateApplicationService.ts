import { fetchLatestRelease } from '../../../domains/app/applicationService'
import type { AppUpdateStatus } from '../../../shared/types/appUpdate'

const RELEASES_PAGE_URL = 'https://github.com/ontio/OWallet/releases'

interface LatestReleaseResponse {
  tag_name?: unknown
  html_url?: unknown
}

function normalizeVersion(version: string | null | undefined) {
  return String(version || '')
    .trim()
    .replace(/^[^\d]*/, '')
}

function compareVersions(leftVersion: string, rightVersion: string) {
  const leftParts = normalizeVersion(leftVersion)
    .split('.')
    .map((part) => Number(part) || 0)
  const rightParts = normalizeVersion(rightVersion)
    .split('.')
    .map((part) => Number(part) || 0)
  const maxLength = Math.max(leftParts.length, rightParts.length)

  for (let index = 0; index < maxLength; index += 1) {
    const leftPart = leftParts[index] ?? 0
    const rightPart = rightParts[index] ?? 0

    if (leftPart === rightPart) {
      continue
    }

    return leftPart > rightPart ? 1 : -1
  }

  return 0
}

function createStatus(
  currentVersion: string,
  overrides: Partial<AppUpdateStatus>
): AppUpdateStatus {
  return {
    ok: true,
    currentVersion,
    latestVersion: null,
    releaseUrl: '',
    hasUpdate: false,
    checkedAt: Date.now(),
    errorKey: null,
    ...overrides,
  }
}

export async function loadLatestAvailableRelease(currentVersion: string) {
  const release = (await fetchLatestRelease()) as LatestReleaseResponse | null | undefined

  if (!release || typeof release.tag_name !== 'string') {
    return createStatus(currentVersion, {
      ok: false,
      errorKey: 'common.updateCheckFailed',
    })
  }

  const latestVersion = release.tag_name
  const releaseUrl = typeof release.html_url === 'string' ? release.html_url : RELEASES_PAGE_URL

  return createStatus(currentVersion, {
    latestVersion,
    releaseUrl,
    hasUpdate: compareVersions(latestVersion, currentVersion) > 0,
  })
}
