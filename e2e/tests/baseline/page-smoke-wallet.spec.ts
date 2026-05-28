import { test, expect } from '../../fixtures/electronApp'
import { clearMocks } from '../../fixtures/mockIpc'
import {
  gotoHash,
  openWalletDashboard,
  seedStandardWalletFixtures,
} from '../../helpers/baselineSmokeHelpers'
import { TEST_WALLETS } from '../../helpers/testData'

test.describe('Baseline Page Smoke: public and wallet routes', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedStandardWalletFixtures(electronApp)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should render public entry pages', async ({ appPage }) => {
    await gotoHash(appPage, '#/')
    await expect(appPage.locator('.home-slogan')).toBeVisible()
    await expect(appPage.getByText('OWallet', { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/dapps')
    await expect(appPage.locator('.dapp-grid')).toBeVisible()
    await expect(appPage.getByText('ONT ID', { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/setting')
    await expect(appPage.getByTestId('settings-page')).toBeVisible()
  })

  test('should render wallet landing and import/create routes', async ({ appPage }) => {
    await gotoHash(appPage, '#/Wallets')
    await expect(appPage.locator('.ow-section-tabs')).toBeVisible()
    await expect(appPage.getByText(TEST_WALLETS.alice.label, { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/loginLedger')
    await expect(appPage.getByText('Login with Ledger', { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/Wallets/createSharedWallet')
    await expect(appPage.locator('.ow-flow-shell')).toBeVisible()
    await expect(appPage.getByLabel('Create shared wallet progress')).toBeVisible()

    await gotoHash(appPage, '#/Wallets/importSharedWallet')
    await expect(appPage.locator('.ow-flow-shell')).toBeVisible()
    await expect(appPage.getByLabel('Import shared wallet progress')).toBeVisible()
  })

  test('should render current-wallet routes after selecting a wallet', async ({ appPage }) => {
    await openWalletDashboard(appPage)

    await gotoHash(appPage, '#/oep4Home')
    await expect(appPage.locator('.oep4-container')).toBeVisible()
    await expect(appPage.getByText('OEP-4 Tokens', { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/commonWalletRedeem/commonWallet')
    await expect(appPage.locator('.redeem-panel')).toBeVisible()
    await expect(appPage.getByRole('button', { name: /submit/i })).toBeVisible()
  })
})
