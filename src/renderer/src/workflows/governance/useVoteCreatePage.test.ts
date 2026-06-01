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
  feedback: {
    notifyWarning: vi.fn(),
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

vi.mock('../../modules/governance/application/vote/voteTopicApplicationService', () => ({
  createVoteTopicTransaction: (...args: unknown[]) =>
    mocks.voteService.createVoteTopicTransaction(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: (...args: unknown[]) => mocks.feedback.notifyWarning(...args),
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

  it('sanitizes oversized and Chinese title and detail input', () => {
    const page = useVoteCreatePage()
    page.titleLimit.value = 4
    page.detailLimit.value = 5
    page.title.value = 'abcdef'
    page.content.value = 'abcdef'

    expect(page.sanitizeVoteTitle('abcdef')).toEqual({ ok: true })
    expect(page.title.value).toBe('abcd')
    expect(page.sanitizeVoteContent('abcdef')).toEqual({ ok: true })
    expect(page.content.value).toBe('abcde')

    page.title.value = 'Topic中'
    page.content.value = 'Detail中'
    expect(page.onTitleInput({ target: { value: 'Topic中' } })).toMatchObject({ ok: false })
    expect(page.onDetailInput({ target: { value: 'Detail中' } })).toMatchObject({ ok: false })
    expect(mocks.feedback.notifyWarning).toHaveBeenCalledTimes(2)
  })

  it('rejects missing wallets, Chinese text, expired windows, and service failures', async () => {
    const page = useVoteCreatePage()
    mocks.voteStore.voteWallet = null as never
    await expect(page.submitVoteCreateForm()).resolves.toMatchObject({
      errorKey: 'nodeStake.selectIndividualWallet',
    })

    mocks.voteStore.voteWallet = { address: 'AQ123' }
    const validWalletPage = useVoteCreatePage()
    validWalletPage.title.value = '主题'
    validWalletPage.content.value = 'Details'
    await expect(validWalletPage.submitVoteCreateForm()).resolves.toMatchObject({
      errorKey: 'vote.onlySupportEnglish',
    })

    validWalletPage.title.value = 'Topic'
    validWalletPage.content.value = '内容'
    await expect(validWalletPage.submitVoteCreateForm()).resolves.toMatchObject({
      errorKey: 'vote.onlySupportEnglish',
    })

    validWalletPage.content.value = 'Details'
    const start = new Date(Date.now() - 2 * 60 * 60 * 1000)
    const end = new Date(Date.now() - 60 * 60 * 1000)
    validWalletPage.startDate.value = start
    validWalletPage.startTime.value = start
    validWalletPage.endDate.value = end
    validWalletPage.endTime.value = end
    await expect(validWalletPage.submitVoteCreateForm()).resolves.toMatchObject({
      errorKey: 'vote.endTimeError',
    })

    const futureEnd = new Date(Date.now() + 60 * 60 * 1000)
    validWalletPage.endDate.value = futureEnd
    validWalletPage.endTime.value = futureEnd
    mocks.voteService.createVoteTopicTransaction.mockResolvedValueOnce({
      ok: false,
      errorKey: 'common.networkErr',
    })
    await expect(validWalletPage.submit()).resolves.toMatchObject({
      errorKey: 'common.networkErr',
    })
    expect(mocks.feedback.notifyWarning).toHaveBeenLastCalledWith('common.networkErr')
  })

  it('leaves short titles untouched in sanitizeVoteTitle and sanitizeVoteContent', () => {
    const page = useVoteCreatePage()
    page.titleLimit.value = 20
    page.detailLimit.value = 20
    page.title.value = 'short'
    page.content.value = 'short'

    expect(page.sanitizeVoteTitle('short')).toEqual({ ok: true })
    expect(page.title.value).toBe('short')
    expect(page.sanitizeVoteContent('short')).toEqual({ ok: true })
    expect(page.content.value).toBe('short')
  })

  it('onTitleInput and onDetailInput return ok without notifying when the input is valid', () => {
    const page = useVoteCreatePage()
    page.titleLimit.value = 20
    page.detailLimit.value = 20
    page.title.value = 'short'
    page.content.value = 'short'

    expect(page.onTitleInput({ target: { value: 'short' } })).toEqual({ ok: true })
    expect(page.onDetailInput({ target: { value: 'short' } })).toEqual({ ok: true })
    expect(mocks.feedback.notifyWarning).not.toHaveBeenCalled()
  })

  it('submit returns ok and skips notifyWarning on success', async () => {
    const page = useVoteCreatePage()
    page.title.value = 'Topic'
    page.content.value = 'Details'

    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    page.startDate.value = start
    page.startTime.value = start
    page.endDate.value = end
    page.endTime.value = end

    await expect(page.submit()).resolves.toEqual({ ok: true })
    expect(mocks.feedback.notifyWarning).not.toHaveBeenCalled()
  })

  it('submitVoteCreateForm does not call setContractHash when none is returned', async () => {
    mocks.voteService.createVoteTopicTransaction.mockResolvedValueOnce({ ok: true, tx: 't' })

    const page = useVoteCreatePage()
    page.title.value = 'Topic'
    page.content.value = 'Details'
    const start = new Date(Date.now() + 60 * 60 * 1000)
    const end = new Date(start.getTime() + 60 * 60 * 1000)
    page.startDate.value = start
    page.startTime.value = start
    page.endDate.value = end
    page.endTime.value = end

    await page.submitVoteCreateForm()
    expect(mocks.voteStore.setContractHash).not.toHaveBeenCalled()
  })

  it('supports route overrides and resets dialog state during navigation', async () => {
    mocks.voteService.createVoteTopicTransaction.mockResolvedValue({
      ok: true,
      tx: 'tx-without-contract-hash',
    })
    const page = useVoteCreatePage()
    const routes = [{ name: 'Votes', path: '/votes' }]

    page.setVoteCreateRoutes(routes)
    expect(page.routes.value).toEqual(routes)

    page.tx.value = 'pending'
    page.signVisible.value = true
    page.handleCancel()
    expect(page.tx.value).toBe('')
    expect(page.signVisible.value).toBe(false)

    page.signVisible.value = true
    page.handleTxSent()
    expect(page.signVisible.value).toBe(false)
    expect(mocks.router.back).toHaveBeenCalledOnce()

    page.back()
    expect(mocks.router.back).toHaveBeenCalledTimes(2)
  })
})
