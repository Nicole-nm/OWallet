import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/electronApp'
import { WalletsPageObject, SendPageObject } from '../../helpers/pageObjects'
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

test.describe('Send Transaction', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
    await seedWalletDoc(electronApp, TEST_WALLETS.bob)
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

  test('should navigate to send page', async ({ appPage }) => {
    await openAliceWalletDashboard(appPage)

    const sendLink = appPage.getByRole('button', { name: /send/i })
    await sendLink.click()

    await expect(appPage).toHaveURL(/commonWalletSend/i)
  })

  test('should show validation for empty send form', async ({ appPage }) => {
    await openAliceWalletDashboard(appPage)
    await appPage.getByRole('button', { name: /send/i }).click()

    const sendPage = new SendPageObject(appPage)
    await sendPage.submitSend()

    await expect(sendPage.validationErrors.first()).toBeVisible()
  })

  test('should advance to the confirmation step with a valid transfer draft', async ({
    appPage,
  }) => {
    await openAliceWalletDashboard(appPage)
    await appPage.getByRole('button', { name: /send/i }).click()

    const sendPage = new SendPageObject(appPage)
    await sendPage.fillSendForm(TEST_WALLETS.bob.address, '1')
    await sendPage.submitSend()

    await expect(sendPage.confirmTable).toContainText(TEST_WALLETS.bob.address)
    await expect(sendPage.agreementCheckbox).toBeVisible()
  })
})

test.describe('Receive', () => {
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

  test('should navigate to receive page and show QR code', async ({ appPage }) => {
    await openAliceWalletDashboard(appPage)
    await appPage.getByRole('button', { name: /receive/i }).click()

    const qrCode = appPage.locator('canvas, [class*="qr"], img[alt*="qr" i]').first()
    await expect(qrCode).toBeVisible({ timeout: 5_000 })
  })

  test('should display wallet address on receive page', async ({ appPage }) => {
    await openAliceWalletDashboard(appPage)
    await appPage.getByRole('button', { name: /receive/i }).click()

    await expect(appPage.getByText(TEST_WALLETS.alice.address)).toBeVisible()
  })
})
