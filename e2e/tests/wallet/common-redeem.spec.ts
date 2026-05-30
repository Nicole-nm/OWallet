import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/electronApp'
import { WalletsPageObject } from '../../helpers/pageObjects'
import { seedWalletDoc, mockFetchJson, clearMocks } from '../../fixtures/mockIpc'
import {
  TEST_WALLETS,
  TEST_BALANCE,
  mockBalanceResponse,
  mockOep4BalanceResponse,
  mockTransactionsResponse,
} from '../../helpers/testData'

async function openAliceWalletDashboard(appPage: Page) {
  const wallets = new WalletsPageObject(appPage)
  await wallets.navigate()
  await wallets.openWallet(TEST_WALLETS.alice.label)
  await expect(appPage.getByText(TEST_WALLETS.alice.address)).toBeVisible()
  await expect(
    appPage
      .locator('.wallet-dashboard__asset-row')
      .filter({ has: appPage.getByText(/^ONT$/i) })
      .first()
  ).toContainText(TEST_BALANCE.ont)
}

test.describe('Common wallet redeem', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
    await mockFetchJson(
      electronApp,
      '/NATIVE/balances',
      mockBalanceResponse(TEST_WALLETS.alice.address)
    )
    await mockFetchJson(electronApp, '/transactions', mockTransactionsResponse())
    await mockFetchJson(electronApp, '/oep4/balances', mockOep4BalanceResponse())
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('navigates from dashboard to the redeem page when claimable ONG is available', async ({
    appPage,
  }) => {
    await openAliceWalletDashboard(appPage)

    const redeemButton = appPage.locator('.wallet-dashboard__redeem').first()
    await expect(redeemButton).toBeVisible()
    await redeemButton.click()

    await expect(appPage).toHaveURL(/commonWalletRedeem\/commonWallet/i)
  })

  test('shows the no-claimable-ONG modal when balance is zero', async ({
    appPage,
    electronApp,
  }) => {
    await mockFetchJson(electronApp, '/NATIVE/balances', {
      result: [
        { asset_name: 'ont', balance: '100', address: TEST_WALLETS.alice.address },
        { asset_name: 'ong', balance: '0', address: TEST_WALLETS.alice.address },
        { asset_name: 'waitboundong', balance: '0', address: TEST_WALLETS.alice.address },
        { asset_name: 'unboundong', balance: '0', address: TEST_WALLETS.alice.address },
      ],
    })

    await openAliceWalletDashboard(appPage)

    const redeemButton = appPage.locator('.wallet-dashboard__redeem').first()
    await expect(redeemButton).toBeVisible()
    await redeemButton.click()

    await expect(appPage.locator('.wallet-dashboard__redeem-note')).toBeVisible()
  })
})
