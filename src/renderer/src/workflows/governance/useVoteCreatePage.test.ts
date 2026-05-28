import { describe, expect, it, beforeEach, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  router: {
    back: vi.fn(),
  },
  voteStore: {
    voteWallet: { address: 'AQ123' },
    contractHash: '',
    setContractHash: vi.fn(function setContractHash(
      this: { contractHash: string },
      contractHash: string
    ) {
      this.contractHash = contractHash
    }),
  },
  settingStore: {
    network: 'testnet',
  },
  voteService: {
    createVoteTopicTransaction: vi.fn(),
  },
}))

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: unknown) => key,
  }),
}))

vi.mock('../../stores/modules/Vote', () => ({
  useVoteStore: () => mocks.voteStore,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../modules/governance/application/voteTopicApplicationService', () => ({
  createVoteTopicTransaction: (...args: unknown[]) =>
    mocks.voteService.createVoteTopicTransaction(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: vi.fn(),
}))

import { useVoteCreatePage } from './useVoteCreatePage'

describe('useVoteCreatePage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.voteStore.voteWallet = { address: 'AQ123' }
    mocks.voteStore.contractHash = ''
    mocks.voteService.createVoteTopicTransaction.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      tx: 'serialized-vote-tx',
    })
  })

  it('rejects empty title/content or missing dates', async () => {
    const page = useVoteCreatePage()

    page.title.value = '   '
    page.content.value = 'content'

    await expect(page.submitVoteCreateForm()).resolves.toEqual({
      ok: false,
      errorKey: 'vote.fillBlanks',
    })

    page.title.value = 'Topic'
    page.content.value = 'Details'

    await expect(page.submitVoteCreateForm()).resolves.toEqual({
      ok: false,
      errorKey: 'vote.fillBlanks',
    })
  })

  it('rejects invalid time windows and creates a vote transaction on success', async () => {
    const page = useVoteCreatePage()
    page.title.value = 'Topic'
    page.content.value = 'Detailed information'

    const start = new Date(Date.now() + 24 * 60 * 60 * 1000)
    const invalidEnd = new Date(start.getTime() - 60 * 60 * 1000)
    const validEnd = new Date(start.getTime() + 24 * 60 * 60 * 1000)

    page.startDate.value = start
    page.startTime.value = start
    page.endDate.value = invalidEnd
    page.endTime.value = invalidEnd

    await expect(page.submitVoteCreateForm()).resolves.toEqual({
      ok: false,
      errorKey: 'vote.startTimeError',
    })

    page.endDate.value = validEnd
    page.endTime.value = validEnd

    await expect(page.submitVoteCreateForm()).resolves.toEqual({ ok: true })
    expect(mocks.voteService.createVoteTopicTransaction).toHaveBeenCalledTimes(1)
    expect(mocks.voteService.createVoteTopicTransaction).toHaveBeenCalledWith({
      contractHash: '',
      network: 'testnet',
      voteWallet: { address: 'AQ123' },
      vote: {
        title: 'Topic',
        content: 'Detailed information',
        startTime: expect.any(Number),
        endTime: expect.any(Number),
        voters: [] as unknown[],
      },
    })
    expect(mocks.voteStore.setContractHash).toHaveBeenCalledWith('resolved-hash')
    expect(page.tx.value).toBe('serialized-vote-tx')
    expect(page.signVisible.value).toBe(true)
  })
})
