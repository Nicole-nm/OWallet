import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AppUpdateStatus } from '../../shared/types/appUpdate'

const mocks = vi.hoisted(() => ({
  router: {
    push: vi.fn(),
  },
  feedback: {
    notifySuccess: vi.fn(),
    notifyWarning: vi.fn(),
  },
  settingsService: {
    changeApplicationLanguage: vi.fn(),
    changeNetworkPreference: vi.fn(),
    changeNodeAddressPreference: vi.fn(),
    changeThemeModePreference: vi.fn(),
    loadConfiguredSavePathPreference: vi.fn(),
    loadSettingsPageState: vi.fn(),
    selectAndPersistSavePathPreference: vi.fn(),
    SETTINGS_NETWORKS: { TEST_NET: 'testNet', MAIN_NET: 'mainNet' },
    SETTINGS_THEME_MODES: { LIGHT: 'light', DARK: 'dark', SYSTEM: 'system' },
  },
  navigation: {
    openExternalUrl: vi.fn(),
  },
  appUpdateRefresh: {
    refreshAppUpdateStatus: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual<typeof import('vue')>('vue')
  return {
    ...actual,
    onMounted: (callback: () => void) => callback(),
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    locale: { value: 'en' },
    t: (key: string) => key,
  }),
  createI18n: () => ({
    global: {
      t: (key: string) => key,
      locale: { value: 'en' },
      setLocaleMessage: vi.fn(),
    },
  }),
}))

vi.mock('../../lang/loadLocale', () => ({
  loadLocaleMessages: vi.fn(() => Promise.resolve()),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifySuccess: mocks.feedback.notifySuccess,
  notifyWarning: mocks.feedback.notifyWarning,
}))

vi.mock('../../modules/settings/application/settingsPreferencesApplicationService', () => ({
  SETTINGS_NETWORKS: mocks.settingsService.SETTINGS_NETWORKS,
  SETTINGS_THEME_MODES: mocks.settingsService.SETTINGS_THEME_MODES,
  changeApplicationLanguage: mocks.settingsService.changeApplicationLanguage,
  changeNetworkPreference: mocks.settingsService.changeNetworkPreference,
  changeNodeAddressPreference: mocks.settingsService.changeNodeAddressPreference,
  changeThemeModePreference: mocks.settingsService.changeThemeModePreference,
  loadConfiguredSavePathPreference: mocks.settingsService.loadConfiguredSavePathPreference,
  loadSettingsPageState: mocks.settingsService.loadSettingsPageState,
  selectAndPersistSavePathPreference: mocks.settingsService.selectAndPersistSavePathPreference,
}))

vi.mock('../../modules/app/application/externalNavigationApplicationService', () => ({
  openExternalUrl: mocks.navigation.openExternalUrl,
}))

vi.mock('../support/appUpdateStatusRefresh', () => ({
  refreshAppUpdateStatus: mocks.appUpdateRefresh.refreshAppUpdateStatus,
}))

import { useAppUpdateStore } from '../../stores/modules/AppUpdate'
import { useSettingsPage } from './useSettingsPage'

describe('useSettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    setActivePinia(createPinia())
    mocks.settingsService.loadSettingsPageState.mockReturnValue({
      ok: true,
      network: 'testNet',
      nodeAddress: 'http://node-1',
      nodeList: ['http://node-1'],
      language: 'en',
      themeMode: 'light',
    })
    mocks.settingsService.loadConfiguredSavePathPreference.mockResolvedValue('/tmp/keystore.db')
  })

  it('shows a success toast when the manual update check finds no newer version', async () => {
    const appUpdateStore = useAppUpdateStore()
    const result: AppUpdateStatus = {
      ok: true,
      currentVersion: 'v0.11.0',
      latestVersion: 'v0.11.0',
      releaseUrl: '',
      hasUpdate: false,
      checkedAt: 1713052800000,
      errorKey: null,
    }
    appUpdateStore.setStatus(result)
    mocks.appUpdateRefresh.refreshAppUpdateStatus.mockResolvedValue(result)

    const page = useSettingsPage()
    await page.checkForUpdates()

    expect(mocks.feedback.notifySuccess).toHaveBeenCalledWith('common.currentlyLatestVersion')
    expect(page.displayedLatestVersion.value).toBe('v0.11.0')
  })

  it('warns about a new version and opens the release page from settings', async () => {
    const appUpdateStore = useAppUpdateStore()
    const result: AppUpdateStatus = {
      ok: true,
      currentVersion: 'v0.11.0',
      latestVersion: 'v0.12.0',
      releaseUrl: 'https://example.com/release',
      hasUpdate: true,
      checkedAt: 1713052800000,
      errorKey: null,
    }
    appUpdateStore.setStatus(result)
    mocks.appUpdateRefresh.refreshAppUpdateStatus.mockResolvedValue(result)

    const page = useSettingsPage()
    await page.checkForUpdates()
    page.openLatestRelease()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.newVersionAvailable')
    expect(mocks.navigation.openExternalUrl).toHaveBeenCalledWith('https://example.com/release')
  })

  it('warns when the manual update check fails', async () => {
    const result: AppUpdateStatus = {
      ok: false,
      currentVersion: 'v0.11.0',
      latestVersion: null,
      releaseUrl: '',
      hasUpdate: false,
      checkedAt: 1713052800000,
      errorKey: 'common.updateCheckFailed',
    }
    mocks.appUpdateRefresh.refreshAppUpdateStatus.mockResolvedValue(result)

    const page = useSettingsPage()
    await page.checkForUpdates()

    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.updateCheckFailed')
  })

  it('applies network, node, language, and theme preferences', async () => {
    mocks.settingsService.changeNetworkPreference.mockReturnValue({
      network: 'mainNet',
      nodeAddress: 'http://node-2',
      nodeList: ['http://node-2'],
      message: 'network changed',
    })
    mocks.settingsService.changeNodeAddressPreference.mockReturnValue({
      nodeAddress: 'http://node-3',
      message: 'node changed',
    })
    mocks.settingsService.changeApplicationLanguage.mockReturnValue({ language: 'zh' })
    mocks.settingsService.changeThemeModePreference.mockReturnValue({ themeMode: 'dark' })
    const page = useSettingsPage()

    page.changeNet()
    expect(page.net.value).toBe('mainNet')
    expect(page.nodeAddress.value).toBe('http://node-2')

    page.changeNode()
    expect(page.nodeAddress.value).toBe('http://node-3')

    page.lang.value = 'zh'
    await page.changeLanguage()
    expect(page.lang.value).toBe('zh')

    page.themeMode.value = 'dark'
    page.changeThemeMode()
    expect(page.themeMode.value).toBe('dark')
  })

  it('does not open an absent release URL and uses fallback update errors', async () => {
    mocks.appUpdateRefresh.refreshAppUpdateStatus.mockResolvedValue({
      ok: false,
      errorKey: '',
    })
    const page = useSettingsPage()

    page.openLatestRelease()
    expect(mocks.navigation.openExternalUrl).not.toHaveBeenCalled()

    await page.checkForUpdates()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.updateCheckFailed')
  })

  it('warns on save-path selection failure and reloads after success', async () => {
    const reload = vi.fn()
    vi.stubGlobal('window', { location: { reload } })
    mocks.settingsService.selectAndPersistSavePathPreference
      .mockResolvedValueOnce({ ok: false })
      .mockResolvedValueOnce({ ok: true, path: '/tmp/new-keystore' })
    const page = useSettingsPage()

    await page.setSavePath()
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledWith('common.savedbFailed')

    await page.setSavePath()
    expect(page.savePath.value).toBe('/tmp/new-keystore')
    expect(reload).toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('formats checked timestamps and falls back to the current version after a successful check', () => {
    const appUpdateStore = useAppUpdateStore()
    appUpdateStore.setStatus({
      ok: true,
      currentVersion: 'v0.11.0',
      latestVersion: null,
      releaseUrl: '',
      hasUpdate: false,
      checkedAt: 1713052800000,
      errorKey: null,
    })

    const page = useSettingsPage()

    expect(page.displayedLatestVersion.value).toBe('v0.11.0')
    expect(page.lastCheckedLabel.value).not.toBe('')
  })
})
