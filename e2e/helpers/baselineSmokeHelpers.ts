import type { ElectronApplication, Page } from '@playwright/test'
import { mockFetchJson, seedWalletDoc } from '../fixtures/mockIpc'
import { WalletsPageObject } from './pageObjects'
import {
  TEST_AUTHORIZATION_NODE,
  TEST_SHARED_WALLET,
  TEST_VOTE_TOPIC,
  TEST_WALLETS,
  mockBalanceResponse,
  mockOep4BalanceResponse,
  mockTransactionsResponse,
} from './testData'

type VueAppInstanceForE2E = {
  _context?: {
    provides?: Record<PropertyKey, unknown>
  }
}

type VueAppRootForE2E = Element & {
  __vue_app__?: VueAppInstanceForE2E
}

type VoteStoreForE2E = {
  setCurrentVote(vote: unknown): void
  setVoteRecords(records: unknown[]): void
  setMyWeight(weight: number): void
}

export async function seedStandardWalletFixtures(electronApp: ElectronApplication) {
  await seedWalletDoc(electronApp, TEST_WALLETS.alice)
  await seedWalletDoc(electronApp, TEST_WALLETS.bob)
  await mockFetchJson(
    electronApp,
    '/NATIVE/balances',
    mockBalanceResponse(TEST_WALLETS.alice.address)
  )
  await mockFetchJson(electronApp, '/transactions', mockTransactionsResponse())
  await mockFetchJson(electronApp, '/oep4/balances', mockOep4BalanceResponse())
}

export async function seedAuthorizationFixtures(electronApp: ElectronApplication) {
  await mockFetchJson(electronApp, '/v2/nodes/current-stakes', {
    code: 0,
    result: [TEST_AUTHORIZATION_NODE],
  })
  await mockFetchJson(electronApp, '/v2/nodes/block-count-to-next-round', {
    result: { count_to_next_round: 128 },
  })
  await mockFetchJson(electronApp, '/api/v1/storage/', {
    Action: 'getstorage',
    Desc: 'SUCCESS',
    Error: 0,
    Result: null,
    Version: '1.0.0',
  })
}

export async function gotoHash(page: Page, hash: string) {
  await page.evaluate((nextHash) => {
    window.location.hash = nextHash
  }, hash)
  await page.waitForFunction((expected) => window.location.hash === expected, hash)
}

export async function setSharedWalletSession(page: Page, wallet = TEST_SHARED_WALLET) {
  await page.evaluate((sharedWallet) => {
    window.sessionStorage.setItem('owallet:session:shared-wallet', JSON.stringify(sharedWallet))
  }, wallet)
}

export async function setVoteStoreCurrentVote(page: Page, vote = TEST_VOTE_TOPIC) {
  await page.evaluate((currentVote) => {
    const isVoteStore = (value: unknown): value is VoteStoreForE2E => {
      return (
        Boolean(value) &&
        typeof value === 'object' &&
        'setCurrentVote' in value &&
        'setVoteRecords' in value &&
        'setMyWeight' in value
      )
    }

    const root = document.querySelector('#app') as VueAppRootForE2E | null
    const app = root?.__vue_app__
    if (!app?._context?.provides) {
      throw new Error('Vue app instance is not available')
    }

    let voteStore: VoteStoreForE2E | null = null
    for (const key of Reflect.ownKeys(app._context.provides)) {
      const value = app._context.provides[key]
      if (value && typeof value === 'object' && '_s' in value) {
        const storeMap = (value as { _s?: unknown })._s
        const store = storeMap instanceof Map ? storeMap.get('Vote') : null
        if (isVoteStore(store)) {
          voteStore = store
          break
        }
      }
    }

    if (!voteStore) {
      throw new Error('Vote store is not initialized')
    }

    voteStore.setCurrentVote(currentVote)
    voteStore.setVoteRecords([])
    voteStore.setMyWeight(0)
  }, vote)
}

export async function openWalletDashboard(page: Page, label = TEST_WALLETS.alice.label) {
  const wallets = new WalletsPageObject(page)
  await wallets.navigate()
  await wallets.openWallet(label)
  await page.getByText(TEST_WALLETS.alice.address).waitFor()
}
