import type { Page } from '@playwright/test'

/**
 * Page Object for the Wallets list page.
 * Route: /Wallets
 */
export class WalletsPageObject {
  constructor(private page: Page) {}

  /** Navigate to the wallets page via the sidebar. */
  async navigate() {
    await this.page.evaluate(() => {
      window.location.hash = '#/Wallets'
    })
    await this.page.waitForURL(/.*#\/Wallets/i)
    await this.walletTabs.waitFor({ state: 'visible' })
  }

  /** The tabbed wallet list container. */
  get walletTabs() {
    return this.page.locator('.ant-tabs')
  }

  /** Individual wallet cards. */
  get walletCards() {
    return this.page.locator('.ow-list-card')
  }

  /** The "create wallet" entry card. */
  get createWalletCard() {
    return this.page.locator('.ow-create-card').first()
  }

  get visibleCreateButton() {
    return this.page
      .locator('button:visible')
      .filter({ hasText: /create/i })
      .first()
  }

  get visibleImportButton() {
    return this.page
      .locator('button:visible')
      .filter({ hasText: /import/i })
      .first()
  }

  /** Click the "Create" button inside the create-wallet card. */
  async clickCreateJsonWallet() {
    if (await this.visibleCreateButton.isVisible().catch(() => false)) {
      await this.visibleCreateButton.click()
      await this.page.waitForURL(/.*createJsonWallet/i)
      return
    }

    await this.createWalletCard.hover()
    await this.createWalletCard
      .getByRole('button', { name: /create/i })
      .first()
      .click()
    await this.page.waitForURL(/.*createJsonWallet/i)
  }

  /** Click the "Import" button inside the create-wallet card. */
  async clickImportJsonWallet() {
    if (await this.visibleImportButton.isVisible().catch(() => false)) {
      await this.visibleImportButton.click()
      await this.page.waitForURL(/.*importJsonWallet/i)
      return
    }

    await this.createWalletCard.hover()
    await this.createWalletCard
      .getByRole('button', { name: /import/i })
      .first()
      .click()
    await this.page.waitForURL(/.*importJsonWallet/i)
  }

  async openWallet(label: string) {
    const walletCard = this.page
      .locator('.ow-detail-card')
      .filter({
        has: this.page.locator('.ow-detail-name--link', { hasText: label }),
      })
      .first()

    await walletCard.locator('.ow-detail-name--link').click()
    await this.page.waitForURL(/.*#\/Wallets\/dashboard/i)
  }

  /** Count of wallet items. */
  async walletCount() {
    return this.walletCards.count()
  }
}
