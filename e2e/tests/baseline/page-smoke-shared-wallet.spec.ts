import { test, expect } from '../../fixtures/electronApp'
import { clearMocks, mockFetchJson } from '../../fixtures/mockIpc'
import {
  gotoHash,
  seedStandardWalletFixtures,
  setSharedWalletSession,
} from '../../helpers/baselineSmokeHelpers'
import { TEST_SHARED_PENDING_TRANSFER, TEST_SHARED_WALLET } from '../../helpers/testData'
import { ONT_PASS_API_PATHS } from '../../../src/renderer/src/shared/lib/constants'

test.describe('Baseline Page Smoke: shared wallet routes', () => {
  test.beforeEach(async ({ electronApp, appPage }) => {
    await seedStandardWalletFixtures(electronApp)
    await mockFetchJson(electronApp, ONT_PASS_API_PATHS.QueryPendingTransfer, {
      SigningSharedTransfers: [TEST_SHARED_PENDING_TRANSFER],
    })
    await setSharedWalletSession(appPage)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should render shared wallet home and child routes', async ({ appPage }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    await expect(appPage.locator('.wallet-info__address')).toContainText(
      TEST_SHARED_WALLET.sharedWalletAddress
    )
    await expect(
      appPage.getByText(TEST_SHARED_WALLET.sharedWalletName, { exact: true })
    ).toBeVisible()
    await expect(
      appPage.getByText(TEST_SHARED_PENDING_TRANSFER.transactionidhash, { exact: true })
    ).toBeVisible()

    await gotoHash(appPage, '#/sharedWallet/sendTransfer')
    await expect(appPage.locator('.ow-send-flow')).toBeVisible()

    await gotoHash(appPage, '#/sharedWallet/copayers')
    await expect(appPage.locator('.ow-copayer-list')).toBeVisible()
    await expect(
      appPage.getByText(TEST_SHARED_WALLET.coPayers[0].name, { exact: true })
    ).toBeVisible()

    await gotoHash(appPage, '#/sharedWallet/txMgmt')
    await expect(appPage.locator('.pax-container')).toBeVisible()
  })

  test('should open pending transaction home from shared wallet home', async ({ appPage }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    await appPage.getByText(TEST_SHARED_PENDING_TRANSFER.transactionidhash, { exact: true }).click()
    await appPage.waitForURL(/sharedWallet\/pendingTxHome/i)

    await expect(appPage.locator('.pending-container')).toBeVisible()
    await expect(appPage.getByText(/sponsor/i)).toBeVisible()
  })
})
