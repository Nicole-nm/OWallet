import { test, expect } from '../../fixtures/electronApp'
import { SettingsPageObject } from '../../helpers/pageObjects'

test.describe('Settings', () => {
  test('should navigate to settings page', async ({ appPage }) => {
    const settings = new SettingsPageObject(appPage)
    await settings.navigate()

    await expect(appPage).toHaveURL(/setting/i)
    await expect(settings.settingsTab).toBeVisible()
  })

  test('should display the settings content and current save path', async ({
    appPage,
    testDataDir,
  }) => {
    const settings = new SettingsPageObject(appPage)
    await settings.navigate()

    await expect(settings.settingsTab).toBeVisible()
    await expect(settings.networkSelect).toBeVisible()
    await expect(settings.nodeSelect).toBeVisible()
    await expect(settings.themeSelect).toBeVisible()
    await expect(settings.savePathDisplay).toContainText(testDataDir)
    await expect(settings.updateSummary).toBeVisible()
  })

  test('should persist a theme selection', async ({ appPage }) => {
    const settings = new SettingsPageObject(appPage)
    await settings.navigate()

    await settings.selectTheme('dark')

    await expect
      .poll(async () =>
        appPage.evaluate(() => window.localStorage.getItem('owallet:settings:theme-mode'))
      )
      .toBe('dark')
  })

  test('should persist a network selection', async ({ appPage }) => {
    const settings = new SettingsPageObject(appPage)
    await settings.navigate()

    await settings.selectNetwork('test')

    await expect
      .poll(async () =>
        appPage.evaluate(() => window.localStorage.getItem('owallet:settings:network'))
      )
      .toBe('TEST_NET')
  })
})
