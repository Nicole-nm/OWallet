import { test, expect } from '../../fixtures/electronApp'
import { clearMocks, seedIdentityDoc } from '../../fixtures/mockIpc'
import {
  gotoHash,
  seedAuthorizationFixtures,
  seedStandardWalletFixtures,
  setVoteStoreCurrentVote,
} from '../../helpers/baselineSmokeHelpers'
import {
  TEST_AUTHORIZATION_NODE,
  TEST_IDENTITY,
  TEST_VOTE_TOPIC,
  TEST_WALLETS,
} from '../../helpers/testData'

test.describe('Baseline Page Smoke: governance routes', () => {
  test.beforeEach(async ({ electronApp }) => {
    await seedStandardWalletFixtures(electronApp)
    await seedAuthorizationFixtures(electronApp)
    await seedIdentityDoc(electronApp, TEST_IDENTITY)
  })

  test.afterEach(async ({ electronApp }) => {
    await clearMocks(electronApp)
  })

  test('should render authorization flow pages', async ({ appPage }) => {
    await gotoHash(appPage, '#/node/nodeList')
    await expect(appPage.locator('.authorization-list-page')).toBeVisible()
    await expect(appPage.getByText(TEST_AUTHORIZATION_NODE.name, { exact: true })).toBeVisible()

    await appPage.locator('.authorization-list-table .detail-link').first().click()
    await appPage.waitForURL(/node\/authorizeLogin/i)
    await expect(appPage.locator('.ow-wallet-select')).toBeVisible()

    await appPage.locator('.ow-wallet-select').click()
    await appPage.getByText(TEST_WALLETS.alice.label, { exact: false }).last().click()
    await appPage.getByRole('button', { name: /next/i }).click()

    await appPage.waitForURL(/node\/authorizationMgmt/i)
    await expect(appPage.locator('.authorization-management-page')).toBeVisible()

    await gotoHash(appPage, '#/node/newAuthorization')
    await expect(appPage.locator('#new-authorization-input')).toBeVisible()
  })

  test('should render vote routes after selecting a voting wallet', async ({ appPage }) => {
    await gotoHash(appPage, '#/vote/login')
    await expect(appPage.locator('.ow-wallet-select')).toBeVisible()

    await appPage.locator('.ow-wallet-select').click()
    await appPage.getByText(TEST_WALLETS.alice.label, { exact: false }).last().click()
    await appPage.getByRole('button', { name: /next/i }).click()

    await appPage.waitForURL(/vote\/votes/i)
    await expect(appPage.locator('.vote-list-page')).toBeVisible()

    await gotoHash(appPage, '#/vote/create')
    await expect(appPage.locator('.vote-create-page')).toBeVisible()

    await setVoteStoreCurrentVote(appPage, TEST_VOTE_TOPIC)
    await gotoHash(appPage, '#/vote/detail')
    await expect(appPage.locator('.vote-detail-page')).toBeVisible()
    await expect(appPage.getByText(TEST_VOTE_TOPIC.title, { exact: true })).toBeVisible()
  })

  test('should render node apply and success pages', async ({ appPage }) => {
    await gotoHash(appPage, '#/node/apply')
    await expect(appPage.locator('.node-apply-shell')).toBeVisible()

    await gotoHash(appPage, '#/node/applysuccess')
    await expect(appPage.locator('.ow-success-state')).toBeVisible()
  })

  test('should render node stake and history routes after wallets are loaded', async ({
    appPage,
  }) => {
    await gotoHash(appPage, '#/Wallets')
    await expect(appPage.getByText(TEST_WALLETS.alice.label, { exact: true })).toBeVisible()

    await gotoHash(appPage, '#/node/nodeStakeIntro')
    await expect(appPage.locator('.intro-content')).toBeVisible()

    await gotoHash(appPage, '#/node/nodeStakeRegister')
    await expect(appPage.locator('.nodeStake-container')).toBeVisible()

    await gotoHash(appPage, '#/node/nodeStakeInfo')
    await expect(appPage.locator('.nodeStake-container')).toBeVisible()

    await gotoHash(appPage, '#/node/nodeStakeMgmt')
    await expect(appPage.locator('.node-stake-management-page')).toBeVisible()

    await gotoHash(appPage, '#/node/stakeHistory')
    await expect(appPage.locator('.stake-history-page')).toBeVisible()

    await gotoHash(appPage, '#/node/mynode')
    await expect(appPage.locator('.nodes-container')).toBeVisible()
  })
})
