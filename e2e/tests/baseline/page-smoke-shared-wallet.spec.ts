import { test, expect } from '../../fixtures/electronApp'
import { clearMocks, getFetchJsonRequests, mockFetchJson } from '../../fixtures/mockIpc'
import {
  gotoHash,
  seedStandardWalletFixtures,
  setSharedWalletSession,
} from '../../helpers/baselineSmokeHelpers'
import {
  TEST_SHARED_PENDING_TRANSFER,
  TEST_SHARED_WALLET,
  TEST_BALANCE,
  TEST_WALLETS,
} from '../../helpers/testData'
import { ONT_PASS_API_PATHS } from '../../../src/renderer/src/shared/lib/constants'

const LONG_SHARED_WALLET = {
  ...TEST_SHARED_WALLET,
  totalNumber: 12,
  coPayers: [
    ...TEST_SHARED_WALLET.coPayers,
    ...Array.from({ length: 10 }, (_, index) => ({
      name: `Co-payer ${index + 3}`,
      publickey: `02${String(index + 3).padStart(64, '0')}`,
      address: `A${String(index + 3).padStart(33, '0')}`,
    })),
  ],
}

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

  test('should render shared wallet home and child routes', async ({ electronApp, appPage }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    await expect(appPage.locator('.wallet-dashboard__address')).toContainText(
      TEST_SHARED_WALLET.sharedWalletAddress
    )
    await expect(
      appPage.getByText(TEST_SHARED_WALLET.sharedWalletName, { exact: true })
    ).toBeVisible()
    const pendingTxLabel = `${TEST_SHARED_PENDING_TRANSFER.transactionIdHash.substring(0, 40)}...`
    await expect(appPage.getByText(pendingTxLabel, { exact: true })).toBeVisible()
    await expect(
      appPage
        .locator('.wallet-dashboard__asset-row')
        .filter({ has: appPage.getByText(/^ONT$/i) })
        .first()
    ).toContainText(TEST_BALANCE.ont)
    await expect(
      appPage
        .locator('.wallet-dashboard__asset-row')
        .filter({ has: appPage.getByText(/^ONG$/i) })
        .first()
    ).toContainText(TEST_BALANCE.ong)
    await expect
      .poll(async () => {
        const requests = await getFetchJsonRequests(electronApp)
        return {
          native: requests.some((request) =>
            request.url.includes(
              `/v2/addresses/${TEST_SHARED_WALLET.sharedWalletAddress}/NATIVE/balances`
            )
          ),
          oep4: requests.some((request) =>
            request.url.includes(
              `/v2/addresses/${TEST_SHARED_WALLET.sharedWalletAddress}/oep4/balances`
            )
          ),
          transactions: requests.some((request) =>
            request.url.includes(
              `/v2/addresses/${TEST_SHARED_WALLET.sharedWalletAddress}/transactions`
            )
          ),
        }
      })
      .toEqual({ native: true, oep4: true, transactions: true })

    await gotoHash(appPage, '#/sharedWallet/sendTransfer')
    await expect(appPage.locator('.shared-wallet-send-shell')).toBeVisible()

    await gotoHash(appPage, '#/commonWalletReceive/sharedWallet')
    await expect(appPage.locator('.receive-shell__copayers')).toBeVisible()
    await expect(appPage.locator('.ow-copayer-list')).toBeVisible()
    await expect(
      appPage.getByText(TEST_SHARED_WALLET.coPayers[0].name, { exact: true })
    ).toBeVisible()
    await expect(appPage.getByLabel('Local wallet')).toHaveCount(2)

    await gotoHash(appPage, '#/sharedWallet/txMgmt')
    await expect(appPage.locator('.pax-container')).toBeVisible()
    await expect(appPage.locator('.shared-tx-management__panel')).toHaveCount(0)
    await expect(appPage.locator('.shared-tx-management__header')).toHaveCount(0)
    await expect(appPage.locator('.shared-tx-editor__section')).toHaveCount(2)

    await appPage
      .locator('.status-group')
      .getByText('Sign multi-sign transaction', { exact: true })
      .click()
    await expect(appPage.locator('.shared-tx-editor textarea')).toBeVisible()
  })

  test('should open pending transaction home from shared wallet home', async ({ appPage }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    const pendingTxLabel = `${TEST_SHARED_PENDING_TRANSFER.transactionIdHash.substring(0, 40)}...`
    await appPage.getByText(pendingTxLabel, { exact: true }).click()
    await appPage.waitForURL(/sharedWallet\/pendingTxHome/i)

    await expect(appPage.locator('.pending-container')).toBeVisible()
    await expect(appPage.getByText(/signer/i)).toBeVisible()
    await expect(appPage.locator('.ow-flow-shell__progress .ow-flow-shell__step')).toHaveCount(2)

    await appPage
      .locator('.pending-confirm__actions')
      .getByRole('button', { name: /next/i })
      .click()
    await expect(appPage.locator('.shared-signature-approval')).toBeVisible()
  })

  test('should advance a shared transfer through review to signature confirmation', async ({
    appPage,
  }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    await expect(
      appPage
        .locator('.wallet-dashboard__asset-row')
        .filter({ has: appPage.getByText(/^ONT$/i) })
        .first()
    ).toContainText('100')

    await gotoHash(appPage, '#/sharedWallet/sendTransfer')
    await expect(appPage.locator('.ow-flow-shell__progress .ow-flow-shell__step')).toHaveCount(3)

    await appPage.getByPlaceholder(/^amount$/i).fill('1')
    await appPage.getByPlaceholder(/recipient address/i).fill(TEST_WALLETS.bob.address)
    await appPage.locator('body').click()
    await appPage.locator('.send-step__actions').getByRole('button', { name: /next/i }).click()

    await expect(appPage.locator('.shared-transfer-review')).toBeVisible()
    await appPage.locator('.shared-transfer-review__sponsor-select').click()
    await appPage
      .locator('.ant-select-item-option')
      .filter({ hasText: TEST_SHARED_WALLET.coPayers[0].name })
      .click()
    await appPage
      .locator('.shared-send-confirm__actions')
      .getByRole('button', { name: /next/i })
      .click()

    await expect(appPage.locator('.shared-signature-approval')).toBeVisible()
  })

  test('should show the two actionable steps for shared ONG redeem', async ({ appPage }) => {
    await gotoHash(appPage, '#/sharedWallet/home')
    await expect(
      appPage
        .locator('.wallet-dashboard__asset-row')
        .filter({ has: appPage.getByText(/^ONG$/i) })
        .first()
    ).toContainText('5.523')

    await appPage.getByRole('button', { name: /^redeem$/i }).click()
    await appPage.waitForURL(/sharedWallet\/sendTransfer/i)

    await expect(appPage.locator('.ow-flow-shell__progress .ow-flow-shell__step')).toHaveCount(2)
    await expect(appPage.locator('.shared-transfer-review')).toBeVisible()
  })

  test('should render shared completed transactions', async ({ electronApp, appPage }) => {
    await mockFetchJson(electronApp, '/transactions', {
      result: [
        {
          tx_hash: 'shared-completed-tx-hash',
          transfers: [
            {
              asset_name: 'ont',
              amount: '2',
              from_address: TEST_SHARED_WALLET.sharedWalletAddress,
              to_address: TEST_WALLETS.bob.address,
            },
          ],
        },
      ],
    })

    await gotoHash(appPage, '#/sharedWallet/home')

    await expect(
      appPage.locator('.wallet-dashboard__tx-row').filter({ hasText: 'shared-completed-tx-hash' })
    ).toContainText('-2 ONT')
  })

  test('should render shared transaction empty states', async ({ electronApp, appPage }) => {
    await mockFetchJson(electronApp, ONT_PASS_API_PATHS.QueryPendingTransfer, {
      SigningSharedTransfers: [],
    })

    await gotoHash(appPage, '#/sharedWallet/home')

    await expect(appPage.locator('.wallet-dashboard__empty--pending')).toContainText(
      'No pending transactions'
    )
    await expect(appPage.locator('.wallet-dashboard__empty--completed')).toContainText(
      'No completed transactions'
    )
    await expect(
      appPage.locator('.wallet-dashboard__empty--pending svg[width="64"][height="41"]')
    ).toBeVisible()
    await expect(
      appPage.locator('.wallet-dashboard__empty--completed svg[width="64"][height="41"]')
    ).toBeVisible()
  })

  test('should scroll the shared transfer review with twelve co-payers', async ({ appPage }) => {
    await setSharedWalletSession(appPage, LONG_SHARED_WALLET)
    await gotoHash(appPage, '#/sharedWallet/home')
    await expect(
      appPage
        .locator('.wallet-dashboard__asset-row')
        .filter({ has: appPage.getByText(/^ONT$/i) })
        .first()
    ).toContainText('100')

    await gotoHash(appPage, '#/sharedWallet/sendTransfer')
    await appPage.getByPlaceholder(/^amount$/i).fill('1')
    await appPage.getByPlaceholder(/recipient address/i).fill(TEST_WALLETS.bob.address)
    await appPage.locator('body').click()
    await appPage.locator('.send-step__actions').getByRole('button', { name: /next/i }).click()

    await expect(appPage.locator('.shared-transfer-review__signer-row')).toHaveCount(12)
    await appPage.locator('.shared-transfer-review__sponsor-select').click()
    await appPage
      .locator('.ant-select-item-option')
      .filter({ hasText: TEST_SHARED_WALLET.coPayers[0].name })
      .click()
    await expect(appPage.locator('.shared-transfer-review__signer-row')).toHaveCount(11)

    await expect
      .poll(() =>
        appPage.evaluate(() => {
          const scrollingElement = document.scrollingElement
          return Boolean(
            scrollingElement && scrollingElement.scrollHeight > scrollingElement.clientHeight
          )
        })
      )
      .toBe(true)

    await appPage.evaluate(() => window.scrollTo(0, document.documentElement.scrollHeight))
    await expect.poll(() => appPage.evaluate(() => window.scrollY)).toBeGreaterThan(0)
    await expect(
      appPage.locator('.shared-send-confirm__actions').getByRole('button', { name: /next/i })
    ).toBeVisible()
  })
})
