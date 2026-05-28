import { test, expect } from '../../fixtures/electronApp'
import { seedWalletDoc, seedIdentityDoc, clearMocks } from '../../fixtures/mockIpc'
import { TEST_IDENTITY, TEST_WALLETS } from '../../helpers/testData'

test.describe('Identities', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
    await seedIdentityDoc(electronApp, TEST_IDENTITY)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should show seeded identities on the identities page', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/identities'
    })
    await appPage.waitForURL(/#\/identities/i)

    await expect(appPage.getByRole('heading', { name: TEST_IDENTITY.label })).toBeVisible()
  })

  test('should validate the create identity form before submission', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/identities/createIdentity'
    })
    await appPage.waitForURL(/createIdentity/i)

    await appPage.getByRole('radio', { name: /ledger wallet/i }).click()
    await appPage.getByRole('button', { name: /next/i }).click()

    await expect(appPage.locator('.ant-form-item-explain-error')).toHaveCount(3)
    const ledgerStatus = appPage.getByRole('status')
    await expect(ledgerStatus).toContainText(/device status:/i)
  })
})

test.describe('Import Identity', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedWalletDoc(electronApp, TEST_WALLETS.alice)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should validate the import identity form', async ({ appPage }) => {
    await appPage.evaluate(() => {
      window.location.hash = '#/identities/importIdentity'
    })
    await appPage.waitForURL(/importIdentity/i)

    await appPage.getByRole('button', { name: /next/i }).click()
    await expect(appPage.locator('.ant-form-item-explain-error')).toHaveCount(2)
  })
})
