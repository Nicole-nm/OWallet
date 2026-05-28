import type { Page } from '@playwright/test'

/**
 * Page Object for the Home / landing page.
 * Route: / (Home)
 */
export class HomePageObject {
  constructor(private page: Page) {}

  get enterButton() {
    return this.page.getByRole('link', { name: /enter/i })
  }

  async navigateToWallets() {
    await this.page.evaluate(() => {
      window.location.hash = '#/Wallets'
    })
    await this.page.waitForURL(/.*#\/Wallets/i)
  }
}
