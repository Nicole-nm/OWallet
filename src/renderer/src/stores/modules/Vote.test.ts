import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'
import { useVoteStore } from './Vote'

describe('Vote store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('stores vote session values and normalizes invalid reset inputs', () => {
    const store = useVoteStore()
    const wallet = { address: 'AQ', label: 'Wallet' }
    const vote = { hash: 'hash' }
    const voter = { address: 'AQ', weight: 1 }
    const record = { address: 'AQ', weight: 1, isApproval: true }

    store.setContractHash('hash')
    store.setVoteWallet(wallet as never)
    store.setVoteRole(['admin'])
    store.setVoteWalletType('common')
    store.setCurrentVote(vote)
    store.setMyWeight(2)
    store.setAllVotes([vote] as never)
    store.setAdminVotes([vote] as never)
    store.setAllVoters([voter])
    store.setVoteRecords([record])

    expect(store.$state).toMatchObject({
      contractHash: 'hash',
      voteWallet: wallet,
      role: ['admin'],
      voteWalletType: 'common',
      currentVote: vote,
      myWeight: 2,
      allVotes: [vote],
      adminVotes: [vote],
      allVoters: [voter],
      currentVoteRecords: [record],
    })

    store.setContractHash()
    store.setVoteWallet()
    store.setVoteRole(null as never)
    store.setVoteWalletType()
    store.setCurrentVote(null as never)
    store.setMyWeight()
    store.setAllVotes(null as never)
    store.setAdminVotes(null as never)
    store.setAllVoters(null as never)
    store.setVoteRecords(null as never)
    store.resetCurrentVoteRecords()

    expect(store.$state).toMatchObject({
      contractHash: '',
      voteWallet: null,
      role: [],
      voteWalletType: '',
      currentVote: {},
      myWeight: 0,
      allVotes: [],
      adminVotes: [],
      allVoters: [],
      currentVoteRecords: [],
    })
  })
})
