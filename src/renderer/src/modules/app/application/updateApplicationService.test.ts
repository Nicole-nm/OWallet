import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  appService: {
    fetchLatestRelease: vi.fn(),
  },
}))

vi.mock('../../../domains/app/applicationService', () => ({
  fetchLatestRelease: mocks.appService.fetchLatestRelease,
}))

import { loadLatestAvailableRelease } from './updateApplicationService'

describe('updateApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns a check failure when the latest release cannot be loaded', async () => {
    mocks.appService.fetchLatestRelease.mockResolvedValue(null)

    await expect(loadLatestAvailableRelease('1.0.0')).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        currentVersion: '1.0.0',
        latestVersion: null,
        releaseUrl: '',
        hasUpdate: false,
        errorKey: 'common.updateCheckFailed',
      })
    )
  })

  it('returns no update when the latest release matches the current version', async () => {
    mocks.appService.fetchLatestRelease.mockResolvedValue({
      tag_name: 'v1.0.0',
      html_url: 'https://example.com/release',
    })

    await expect(loadLatestAvailableRelease('1.0.0')).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        currentVersion: '1.0.0',
        latestVersion: 'v1.0.0',
        releaseUrl: 'https://example.com/release',
        hasUpdate: false,
        errorKey: null,
      })
    )
  })

  it('returns available releases newer than the current version', async () => {
    const release = { tag_name: 'v2.0.0', html_url: 'https://example.com/release' }
    mocks.appService.fetchLatestRelease.mockResolvedValue(release)

    await expect(loadLatestAvailableRelease('1.0.0')).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        currentVersion: '1.0.0',
        latestVersion: 'v2.0.0',
        releaseUrl: 'https://example.com/release',
        hasUpdate: true,
        errorKey: null,
      })
    )
  })

  it('falls back to the releases page when the latest release has no html url', async () => {
    mocks.appService.fetchLatestRelease.mockResolvedValue({ tag_name: 'v2.0.0' })

    await expect(loadLatestAvailableRelease('v1.0.0')).resolves.toEqual(
      expect.objectContaining({
        ok: true,
        currentVersion: 'v1.0.0',
        latestVersion: 'v2.0.0',
        releaseUrl: 'https://github.com/ontio/OWallet/releases',
        hasUpdate: true,
        errorKey: null,
      })
    )
  })
})
