import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/electronApp'
import { WalletsPageObject, CreateJsonWalletPageObject } from '../../helpers/pageObjects'
import { findDbDocs } from '../../fixtures/mockIpc'
import { TEST_PASSWORD } from '../../helpers/testData'

test.describe('Create JSON Wallet', () => {
  async function openCreateJsonWallet(appPage: Page) {
    const wallets = new WalletsPageObject(appPage)
    await wallets.navigate()
    await wallets.clickCreateJsonWallet()

    return new CreateJsonWalletPageObject(appPage)
  }

  test('should navigate to wallet creation from the wallets page', async ({ appPage }) => {
    await openCreateJsonWallet(appPage)

    await expect(appPage).toHaveURL(/createJsonWallet/i)
  })

  test('should show validation errors for empty fields', async ({ appPage }) => {
    const createPage = await openCreateJsonWallet(appPage)
    await createPage.submitBasicStep()

    await expect(createPage.validationErrors).toHaveCount(3)
  })

  test('should show password mismatch error', async ({ appPage }) => {
    const createPage = await openCreateJsonWallet(appPage)
    await createPage.fillBasicInfo('TestWallet', TEST_PASSWORD, 'WrongPassword')
    await createPage.submitBasicStep()

    await expect(createPage.validationErrors).toHaveCount(1)
    await expect(appPage).toHaveURL(/createJsonWallet/i)
  })

  test('should proceed to confirm step with valid input', async ({ appPage }) => {
    const createPage = await openCreateJsonWallet(appPage)
    await createPage.fillBasicInfo('TestWallet', TEST_PASSWORD, TEST_PASSWORD)
    await createPage.submitBasicStep()

    await expect(createPage.confirmContainer).toBeVisible({ timeout: 10_000 })
    await expect(createPage.downloadButton).toBeVisible({ timeout: 10_000 })
    await expect(createPage.confirmContainer).toContainText('SHA256withECDSA')
  })

  test('should persist a created wallet after confirmation', async ({ appPage, electronApp }) => {
    const createPage = await openCreateJsonWallet(appPage)
    await createPage.fillBasicInfo('E2E-Wallet', TEST_PASSWORD, TEST_PASSWORD)
    await createPage.submitBasicStep()

    await expect(createPage.downloadButton).toBeVisible({ timeout: 10_000 })
    await createPage.submitConfirmStep()

    await appPage
      .locator('.loading-overlay')
      .waitFor({ state: 'hidden', timeout: 10_000 })
      .catch(() => {})

    await expect
      .poll(
        async () => {
          const docs = (await findDbDocs(electronApp, {
            type: 'CommonWallet',
          })) as Array<Record<string, unknown>>
          return docs.filter((d) => {
            const w = d.wallet as Record<string, unknown> | undefined
            return w?.label === 'E2E-Wallet'
          }).length
        },
        { timeout: 10_000 }
      )
      .toBe(1)
  })
})
