import { test, expect } from '../../fixtures/electronApp'
import { GovernancePageObject } from '../../helpers/pageObjects'
import { seedWalletDoc, clearMocks } from '../../fixtures/mockIpc'
import { TEST_WALLETS } from '../../helpers/testData'

test.describe('Governance Home', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should navigate to governance page', async ({ appPage }) => {
    const governance = new GovernancePageObject(appPage)
    await governance.navigate()

    await expect(appPage.getByText(/^Node Stake Management$/i)).toBeVisible()
    await expect(appPage.getByText(/^Stake Authorization$/i)).toBeVisible()
    await expect(appPage.getByText(/^Vote$/i)).toBeVisible()
  })

  test('should open the authorization list flow from governance home', async ({ appPage }) => {
    const governance = new GovernancePageObject(appPage)
    await governance.navigate()
    await governance.clickAuthorizationTab()

    await expect(appPage).toHaveURL(/node\/nodeList/i)
  })

  test('should open the vote login flow from governance home', async ({ appPage }) => {
    const governance = new GovernancePageObject(appPage)
    await governance.navigate()
    await governance.clickVoteTab()

    await expect(appPage).toHaveURL(/vote\/login/i)
  })
})

test.describe('Vote Login', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should require a wallet selection before continuing', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/vote/login'
    })
    await appPage.waitForURL(/vote\/login/i)

    await appPage.getByRole('button', { name: /next/i }).click()
    await expect(appPage.locator('.ant-message-notice').first()).toBeVisible()
  })

  test('should allow choosing a common wallet and continue to the vote list route', async ({
    appPage,
  }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/vote/login'
    })
    await appPage.waitForURL(/vote\/login/i)

    await appPage.locator('.ow-wallet-select').click()
    await appPage.getByText(TEST_WALLETS.alice.label, { exact: false }).last().click()
    await appPage.getByRole('button', { name: /next/i }).click()

    await expect(appPage).toHaveURL(/vote\/votes/i)
  })
})
