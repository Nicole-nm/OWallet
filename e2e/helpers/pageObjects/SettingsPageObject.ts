import type { Page } from '@playwright/test'

/**
 * Page Object for the Settings page.
 */
export class SettingsPageObject {
  constructor(private page: Page) {}

  /** Navigate directly to the settings route. */
  async navigate() {
    await this.page.evaluate(() => {
      window.location.hash = '#/setting'
    })
    await this.page.waitForURL(/.*setting/i)
  }

  get settingsTab() {
    return this.page.getByTestId('settings-page')
  }

  get networkSelect() {
    return this.page.locator('#network-selection')
  }

  get networkSelectTrigger() {
    return this.networkSelect.locator(
      'xpath=ancestor::div[contains(@class,"ant-select-selector")][1]'
    )
  }

  get nodeSelect() {
    return this.page.locator('#node-selection')
  }

  get themeSelect() {
    return this.page.locator('#theme-selection')
  }

  get themeSelectTrigger() {
    return this.themeSelect.locator(
      'xpath=ancestor::div[contains(@class,"ant-select-selector")][1]'
    )
  }

  get dropdownOptionContent() {
    return this.page.locator('.ant-select-item-option-content:visible')
  }

  get savePathDisplay() {
    return this.page.getByTestId('settings-save-path')
  }

  get updateSummary() {
    return this.page.getByTestId('settings-update-summary')
  }

  get changeSavePathButton() {
    return this.page.getByRole('button', { name: /change|browse/i }).first()
  }

  async selectNetwork(network: 'main' | 'test') {
    await this.networkSelectTrigger.click()
    const optionText = network === 'main' ? 'MainNet' : 'TestNet'
    await this.dropdownOptionContent.filter({ hasText: optionText }).click()
  }

  async selectTheme(theme: 'light' | 'dark' | 'system') {
    await this.themeSelectTrigger.click()
    const optionText = theme === 'light' ? 'Light' : theme === 'dark' ? 'Dark' : 'Follow System'
    await this.dropdownOptionContent.filter({ hasText: optionText }).click()
  }
}
