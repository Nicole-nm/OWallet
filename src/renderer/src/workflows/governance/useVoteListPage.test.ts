import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletSigner } from '../../shared/lib/types'

type VoteRow = Record<string, any>

const mocks = vi.hoisted(() => ({
  router: {
    back: vi.fn(),
    push: vi.fn(),
  },
  voteStore: {
    role: [] as string[],
    allVotes: [] as VoteRow[],
    adminVotes: [] as VoteRow[],
    voteWallet: null as WalletSigner | null,
    contractHash: '',
    setCurrentVote: vi.fn(),
    setContractHash: vi.fn(function setContractHash(
      this: { contractHash: string },
      contractHash: string
    ) {
      this.contractHash = contractHash
    }),
    setAllVoters: vi.fn(),
    setVoteRole: vi.fn(),
    setMyWeight: vi.fn(),
    setAllVotes: vi.fn(function setAllVotes(this: { allVotes: VoteRow[] }, votes: VoteRow[]) {
      this.allVotes = votes
    }),
    setAdminVotes: vi.fn(function setAdminVotes(this: { adminVotes: VoteRow[] }, votes: VoteRow[]) {
      this.adminVotes = votes
    }),
  },
  settingStore: {
    network: 'testnet',
  },
  loadingStore: {
    showLoadingModals: vi.fn(),
    hideLoadingModals: vi.fn(),
  },
  voteService: {
    loadVoteRole: vi.fn(),
    loadVoteList: vi.fn(),
    syncAdminVotes: vi.fn(),
    createVoteStopTransaction: vi.fn(),
  },
}))

vi.mock('vue', async () => {
  const actual = await vi.importActual('vue')
  return {
    ...actual,
    onMounted: (callback: any) => callback(),
    onBeforeUnmount: () => {},
  }
})

vi.mock('vue-router', () => ({
  useRouter: () => mocks.router,
}))

vi.mock('vue-i18n', () => ({
  useI18n: () => ({
    t: (key: any) => key,
  }),
}))

vi.mock('../../stores/modules/Vote', () => ({
  VOTE_STATUS_TEXT: {
    NOT_START: 'NOT_START',
    IN_PROGRESS: 'IN_PROGRESS',
    FINISHED: 'FINISHED',
    CANCELED: 'CANCELED',
  },
  useVoteStore: () => mocks.voteStore,
}))

vi.mock('../../stores/modules/Setting', () => ({
  useSettingStore: () => mocks.settingStore,
}))

vi.mock('../../shared/composables/useGlobalLoading', () => ({
  useLoadingModalStore: () => mocks.loadingStore,
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyError: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('../../modules/governance/application/voteTopicApplicationService', () => ({
  loadVoteRole: (...args: any[]) => mocks.voteService.loadVoteRole(...args),
  loadVoteList: (...args: any[]) => mocks.voteService.loadVoteList(...args),
  syncAdminVotes: (...args: any[]) => mocks.voteService.syncAdminVotes(...args),
  createVoteStopTransaction: (...args: any[]) =>
    mocks.voteService.createVoteStopTransaction(...args),
}))

import { ROUTE_NAMES } from '../../router/routes'
import { useVoteListPage } from './useVoteListPage'

describe('useVoteListPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.voteStore.role = []
    mocks.voteStore.allVotes = []
    mocks.voteStore.adminVotes = []
    mocks.voteStore.voteWallet = null
    mocks.voteService.loadVoteRole.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      role: [] as string[],
      allVoters: [] as VoteRow[],
      myWeight: 0,
    })
    mocks.voteService.loadVoteList.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      votes: [] as VoteRow[],
    })
    mocks.voteService.syncAdminVotes.mockReturnValue({ ok: true, votes: [] as VoteRow[] })
    mocks.voteService.createVoteStopTransaction.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      tx: 'stop-vote-tx',
    })
  })

  it('keeps translated admin menu labels and opens detail routes', () => {
    mocks.voteStore.role = ['ADMIN']
    const page = useVoteListPage()

    page.setVoteListMenuLabels({ all: 'All Topics', created: 'Created Topics' })

    expect(page.menus.value).toEqual([
      { key: 'all', name: 'All Topics' },
      { key: 'created', name: 'Created Topics' },
    ])

    const vote = { hash: 'vote-hash-1' }
    page.openVoteDetail(vote)

    expect(mocks.voteStore.setCurrentVote).toHaveBeenCalledWith(vote)
    expect(mocks.router.push).toHaveBeenCalledWith({ name: ROUTE_NAMES.VOTE_DETAIL })
  })

  it('blocks completed votes from being stopped and opens sign flow for active votes', async () => {
    const page = useVoteListPage()
    const statusMap = {
      FINISHED: 'Finished',
      CANCELED: 'Canceled',
      IN_PROGRESS: 'In Progress',
      NOT_START: 'Not Start',
    }

    await expect(
      page.submitStopVote({ hash: 'a', statusText: 'FINISHED' }, statusMap)
    ).resolves.toEqual({
      ok: false,
      errorKey: 'vote.notAllowStop',
      statusText: 'Finished',
    })

    await expect(
      page.submitStopVote({ hash: 'b', statusText: 'IN_PROGRESS' }, statusMap)
    ).resolves.toEqual({
      ok: true,
    })
    expect(mocks.voteService.createVoteStopTransaction).toHaveBeenCalledWith({
      contractHash: 'resolved-hash',
      network: 'testnet',
      hash: 'b',
      voteWallet: undefined,
    })
    expect(page.tx.value).toBe('stop-vote-tx')
    expect(page.signVisible.value).toBe(true)
  })

  it('tracks table pagination and resets the current page when the menu changes', () => {
    const allVotes = Array.from({ length: 12 }, (_, index) => ({ hash: `all-${index}` }))
    const adminVotes = Array.from({ length: 3 }, (_, index) => ({ hash: `admin-${index}` }))

    mocks.voteStore.role = ['ADMIN']
    mocks.voteStore.allVotes = allVotes
    mocks.voteStore.adminVotes = adminVotes
    mocks.voteService.loadVoteList.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      votes: allVotes,
    })
    mocks.voteService.syncAdminVotes.mockReturnValue({ ok: true, votes: adminVotes })

    const page = useVoteListPage()

    expect(page.tablePagination.value.total).toBe(12)

    page.handleTableChange({ current: 2, pageSize: 10 })
    expect(page.tablePagination.value.current).toBe(2)

    page.selectVoteListMenu('created')
    expect(page.currentMenu.value).toEqual(['created'])
    expect(page.tablePagination.value.current).toBe(1)
    expect(page.tablePagination.value.total).toBe(3)
  })

  it('shows the newest voting topics first', () => {
    const allVotes = [
      { hash: 'oldest', startTime: 1710000000000, endTime: 1710003600000 },
      { hash: 'newest', startTime: 1730000000000, endTime: 1730003600000 },
      { hash: 'middle', startTime: 1720000000000, endTime: 1720003600000 },
    ]
    const adminVotes = [
      { hash: 'admin-older', startTime: 1715000000000, endTime: 1715003600000 },
      { hash: 'admin-newer', startTime: 1725000000000, endTime: 1725003600000 },
    ]

    mocks.voteStore.role = ['ADMIN']
    mocks.voteStore.allVotes = allVotes
    mocks.voteStore.adminVotes = adminVotes
    mocks.voteService.loadVoteList.mockResolvedValue({
      ok: true,
      contractHash: 'resolved-hash',
      votes: allVotes,
    })
    mocks.voteService.syncAdminVotes.mockReturnValue({ ok: true, votes: adminVotes })

    const page = useVoteListPage()

    expect(page.activeVotes.value.map((vote: any) => vote.hash)).toEqual([
      'newest',
      'middle',
      'oldest',
    ])

    page.selectVoteListMenu('created')

    expect(page.activeVotes.value.map((vote: any) => vote.hash)).toEqual([
      'admin-newer',
      'admin-older',
    ])
  })
})
