import type { Page } from '@playwright/test'
import { test, expect } from '../../fixtures/electronApp'
import { WalletsPageObject } from '../../helpers/pageObjects'
import { findDbDocs } from '../../fixtures/mockIpc'
import { TEST_WIF, TEST_PASSWORD } from '../../helpers/testData'

test.describe('Import JSON Wallet', () => {
  async function openImportJsonWallet(appPage: Page) {
    const wallets = new WalletsPageObject(appPage)
    await wallets.navigate()
    await wallets.clickImportJsonWallet()

    return wallets
  }

  test('should navigate to import page', async ({ appPage }) => {
    await openImportJsonWallet(appPage)

    await expect(appPage).toHaveURL(/importJsonWallet/i)
  })

  test('should show WIF import tab by default', async ({ appPage }) => {
    await openImportJsonWallet(appPage)

    const wifTab = appPage.locator('.ant-tabs-tab-active')
    await expect(wifTab).toContainText(/wif|private key/i)
  })

  test('should show validation errors for empty WIF import', async ({ appPage }) => {
    await openImportJsonWallet(appPage)

    const nextButton = appPage.getByRole('button', { name: /next|import/i }).first()
    await nextButton.click()

    const errors = appPage.locator('.ant-form-item-explain-error')
    await expect(errors).toHaveCount(4)
  })

  test('should switch between supported import tabs', async ({ appPage }) => {
    await openImportJsonWallet(appPage)

    await appPage.getByRole('tab', { name: /keystore|dat/i }).click()
    await expect(appPage.getByRole('button', { name: /select file/i }).first()).toBeVisible()

    await appPage.getByRole('tab', { name: /mnemonic/i }).click()
    await expect(appPage.locator('#import-json-mnemonic')).toBeVisible()

    await appPage.getByRole('tab', { name: /private key \(64 hex\)/i }).click()
    await expect(
      appPage.getByRole('textbox', { name: /please enter private key with 64 byte hex format/i })
    ).toBeVisible()
  })

  test('should persist an imported WIF wallet after submission', async ({
    appPage,
    electronApp,
  }) => {
    await openImportJsonWallet(appPage)

    await appPage
      .getByRole('textbox', { name: /set a new name for the wallet/i })
      .fill('WIF-Wallet')
    await appPage.getByRole('textbox', { name: /please enter 52-bit wif/i }).fill(TEST_WIF)
    await appPage.getByRole('textbox', { name: /^set password$/i }).fill(TEST_PASSWORD)
    await appPage.getByRole('textbox', { name: /^repeat password$/i }).fill(TEST_PASSWORD)

    await appPage.getByRole('button', { name: /next|import/i }).click()

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
            return w?.label === 'WIF-Wallet'
          }).length
        },
        { timeout: 10_000 }
      )
      .toBe(1)
  })
})
