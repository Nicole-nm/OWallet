import type { Page } from '@playwright/test'

/**
 * Page Object for the Governance Home and Node Stake pages.
 */
export class GovernancePageObject {
  constructor(private page: Page) {}

  private actionCard(title: RegExp) {
    return this.page
      .locator('.ow-action-card')
      .filter({ has: this.page.locator('.ow-action-card__title', { hasText: title }) })
      .first()
  }

  /** Navigate to governance via the sidebar. */
  async navigate() {
    await this.page.evaluate(() => {
      window.location.hash = '#/node'
    })
    await this.page.waitForURL(/.*#\/node/i)
    await this.page.locator('.ow-action-card').first().waitFor({ state: 'visible' })
  }

  get nodeList() {
    return this.page.locator('.ow-list-card--node')
  }

  get stakeButton() {
    return this.page.getByRole('button', { name: /stake|register/i }).first()
  }

  get voteSection() {
    return this.actionCard(/^vote$/i)
  }

  get voteCard() {
    return this.actionCard(/^vote$/i)
  }

  get authorizationCard() {
    return this.actionCard(/stake authorization/i)
  }

  get voteAction() {
    return this.voteCard.locator('.ow-action-card__control')
  }

  get loginButton() {
    return this.page.getByRole('button', { name: /login/i }).first()
  }

  /** Node detail fields. */
  get nodeNameField() {
    return this.page.locator('.node-name').first()
  }

  get manageButton() {
    return this.page.getByRole('button', { name: /manage/i }).first()
  }

  async clickVoteTab() {
    await this.voteAction.click()
  }

  async clickAuthorizationTab() {
    await this.authorizationCard.locator('.ow-action-card__control').click()
  }
}
