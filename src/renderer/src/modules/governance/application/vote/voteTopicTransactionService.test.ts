import { beforeEach, describe, expect, it, vi } from 'vitest'

const sendRawTransaction = vi.fn(async () => ({ Error: 0 }))

const fakeUnsignedTx = {
  serialize: () => 'ser',
  getHash: () => 'hash',
  serializeUnsignedData: () => 'unsigned',
}

const vote = vi.hoisted(() => ({
  buildCancelTopicTx: vi.fn(async () => 'cancelTx'),
  buildCreateTopicTx: vi.fn(async () => 'createTx'),
  buildVoteTx: vi.fn(async () => 'voteTx'),
  loadVoteSdk: vi.fn(),
}))
const serialization = vi.hoisted(() => ({ serializeTx: vi.fn(() => 'serialized') }))
const restClient = vi.hoisted(() => ({ getRestClient: vi.fn() }))
const shared = vi.hoisted(() => ({
  getRequiredVoteContractHash: vi.fn(async () => ({ contractHash: 'resolved' })),
  NETWORK_ERROR_KEY: 'common.networkErr',
  resolveVoteAddress: vi.fn((_w: unknown, address: string) => address || 'addr'),
  voteTopicLogger: { error: vi.fn(), warn: vi.fn(), info: vi.fn(), debug: vi.fn() },
}))

vi.mock('../../../../domains/governance/voteService', () => vote)
vi.mock('../../../../domains/transaction/serializationService', () => serialization)
vi.mock('../../../../shared/chain/restClient', () => restClient)
vi.mock('../../../../shared/lib/constants', () => ({ GAS_PRICE: '500', GAS_LIMIT_HIGH: '60000' }))
vi.mock('./voteTopicShared', () => ({ ...shared, isVoteVoterRecord: vi.fn() }))

import {
  createVoteDecisionTransaction,
  createVoteStopTransaction,
  createVoteTopicTransaction,
  setVoteTopicVoters,
} from './voteTopicTransactionService'

class FakeAddress {
  constructor(public value: string) {}
}

beforeEach(() => {
  vi.clearAllMocks()
  shared.getRequiredVoteContractHash.mockResolvedValue({ contractHash: 'resolved' })
  shared.resolveVoteAddress.mockImplementation((_w: unknown, address: string) => address || 'addr')
  restClient.getRestClient.mockReturnValue({ sendRawTransaction })
  vote.loadVoteSdk.mockResolvedValue({
    TransactionBuilder: { makeWasmVmInvokeTransaction: vi.fn(() => fakeUnsignedTx) },
    Crypto: { Address: FakeAddress },
    utils: { reverseHex: (h: string) => h },
    Parameter: class {
      constructor(
        public a: string,
        public b: unknown,
        public c: unknown
      ) {}
    },
    ParameterType: { H256: 'H256', Array: 'Array' },
  })
})

describe('createVoteDecisionTransaction', () => {
  it('builds a vote transaction', async () => {
    const result = await createVoteDecisionTransaction({
      network: 'MAIN_NET' as never,
      hash: 'h1',
      approve: true,
    })
    expect(vote.buildVoteTx).toHaveBeenCalledWith('resolved', 'h1', 'addr', true)
    expect(result).toMatchObject({ ok: true, contractHash: 'resolved', tx: 'voteTx' })
  })

  it('returns a network error when building fails', async () => {
    vote.buildVoteTx.mockRejectedValueOnce(new Error('boom'))
    const result = await createVoteDecisionTransaction({
      network: 'MAIN_NET' as never,
      hash: 'h1',
      approve: false,
    })
    expect(result).toMatchObject({ ok: false, errorKey: 'common.networkErr' })
  })
})

it('createVoteStopTransaction builds a cancel transaction', async () => {
  const result = await createVoteStopTransaction({ network: 'MAIN_NET' as never, hash: 'h1' })
  expect(vote.buildCancelTopicTx).toHaveBeenCalledWith('resolved', 'h1', 'addr')
  expect(result).toMatchObject({ ok: true, tx: 'cancelTx' })
})

it('createVoteTopicTransaction builds a create-topic transaction', async () => {
  const result = await createVoteTopicTransaction({
    network: 'MAIN_NET' as never,
    vote: { title: 't' },
  })
  expect(vote.buildCreateTopicTx).toHaveBeenCalled()
  expect(result).toMatchObject({ ok: true, tx: 'createTx' })
})

describe('setVoteTopicVoters', () => {
  const makeAdapter = (overrides: Record<string, unknown> = {}) =>
    ({
      identity: { type: 'common', address: 'addr', publicKey: 'pk', label: 'w' },
      capabilities: { requiresPassword: true, requiresHardwareDevice: false },
      signTransaction: vi.fn(async (tx: unknown) => tx),
      addSignature: vi.fn(),
      signMessage: vi.fn(),
      ...overrides,
    }) as never

  it('signs and sends the set-voters transaction through the adapter', async () => {
    const result = await setVoteTopicVoters({
      network: 'MAIN_NET' as never,
      hash: 'h1',
      voters: ['v1'],
      adapter: makeAdapter(),
      password: 'pw',
    })
    expect(sendRawTransaction).toHaveBeenCalledWith('serialized', false)
    expect(result).toMatchObject({ ok: true, result: { Error: 0 } })
  })

  it('returns a failure without sending when the adapter cancels signing', async () => {
    const result = await setVoteTopicVoters({
      network: 'MAIN_NET' as never,
      hash: 'h1',
      voters: ['v1'],
      adapter: makeAdapter({
        capabilities: { requiresPassword: false, requiresHardwareDevice: false },
        signTransaction: vi.fn(async () => null),
      }),
    })
    expect(sendRawTransaction).not.toHaveBeenCalled()
    expect(result).toMatchObject({ ok: true, result: { ok: false, cancelled: true } })
  })
})
