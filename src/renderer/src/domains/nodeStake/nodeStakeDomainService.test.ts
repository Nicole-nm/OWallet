import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SdkTransactionLike } from '../../shared/chain/types'

const mocks = vi.hoisted(() => ({
  httpClient: {
    get: vi.fn(),
    post: vi.fn(),
  },
  fetchJson: vi.fn(),
  getTransactionHash: vi.fn(),
  serializeTransaction: vi.fn(),
  createRegisterCandidateTransaction: vi.fn(),
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: mocks.httpClient,
}))

vi.mock('../../shared/platform/bridge', () => ({
  fetchJson: (...args: unknown[]) => mocks.fetchJson(...args),
}))

vi.mock('../transaction/transactionDomainService', () => ({
  getTransactionHash: (...args: unknown[]) => mocks.getTransactionHash(...args),
  serializeTransaction: (...args: unknown[]) => mocks.serializeTransaction(...args),
}))

vi.mock('../governance/governanceDomainService', () => ({
  createRegisterCandidateTransaction: (...args: unknown[]) =>
    mocks.createRegisterCandidateTransaction(...args),
}))

vi.mock('../../shared/lib/constants', () => ({
  getOntPassHost: (network: string) =>
    network === 'TEST_NET' ? 'https://service-test.onto.app' : 'https://service.onto.app',
  getExplorerApiUrl: (path: string, network: string) =>
    `https://explorer-${network}.example${path}`,
  ONT_PASS_API_PATHS: {
    DelegateSendTx: '/S4/NodePledgeApi/v1/Nodepledge/delegateSendTransaction',
    SetStakeInfo: '/S4/NodePledgeApi/v1/Nodepledge/setInfo',
    GetStakeInfo: '/S4/NodePledgeApi/v1/Nodepledge/info',
    GetQualifiedState: '/S4/NodePledgeApi/v1/Nodepledge/getQuailifiedState',
    GetVoteContract: '/S4/NodePledgeApi/v1/Nodepledge/vote-contract-address',
  },
}))

import {
  submitDelegatedStakeTransaction,
  fetchStakeInfo,
  fetchVoteContractAddress,
  fetchNodeInfo,
  createNodeStakeRegistrationTransaction,
  createDelegatedStakeTransactionBody,
  serializeNodeStakeInfo,
} from './nodeStakeDomainService'

describe('nodeStake/nodeStakeDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('http wrappers', () => {
    it('posts the delegated stake tx to the network-specific ontpass host', () => {
      submitDelegatedStakeTransaction('MAIN_NET', { foo: 'bar' })

      expect(mocks.httpClient.post).toHaveBeenCalledWith(
        'https://service.onto.app/S4/NodePledgeApi/v1/Nodepledge/delegateSendTransaction',
        { foo: 'bar' },
        { silent: true }
      )
    })

    it('gets stake info by ontid as a query param on the test host', () => {
      fetchStakeInfo('TEST_NET', 'did:ont:abc')

      expect(mocks.httpClient.get).toHaveBeenCalledWith(
        'https://service-test.onto.app/S4/NodePledgeApi/v1/Nodepledge/info',
        { params: { ontid: 'did:ont:abc' } }
      )
    })

    it('appends the net type segment to the vote contract path', () => {
      fetchVoteContractAddress('MAIN_NET', 'mainnet')

      expect(mocks.httpClient.get).toHaveBeenCalledWith(
        'https://service.onto.app/S4/NodePledgeApi/v1/Nodepledge/vote-contract-address/mainnet'
      )
    })

    it('returns the explorer node-info result when present', async () => {
      mocks.fetchJson.mockResolvedValue({ result: { name: 'My Node' } })

      const result = await fetchNodeInfo('MAIN_NET', 'public-key-hex')

      expect(result).toEqual({ name: 'My Node' })
      // URL constructor lowercases the host per WHATWG, so the network token
      // arrives lowercased in the final URL.
      expect(mocks.fetchJson).toHaveBeenCalledWith(
        'https://explorer-main_net.example/v2/nodes/off-chain-info/public?public_key=public-key-hex'
      )
    })

    it('falls back to an empty object when the explorer response has no result', async () => {
      mocks.fetchJson.mockResolvedValue({})

      const result = await fetchNodeInfo('MAIN_NET', 'public-key-hex')

      expect(result).toEqual({})
    })
  })

  describe('createNodeStakeRegistrationTransaction', () => {
    it('delegates to the governance candidate-registration builder with the same inputs', async () => {
      mocks.createRegisterCandidateTransaction.mockResolvedValue('register-tx')

      const result = await createNodeStakeRegistrationTransaction({
        ontid: 'did:ont:node',
        publicKey: 'node-pk',
        initPos: 100000,
        stakeWalletAddress: 'A-stake',
      })

      expect(result).toBe('register-tx')
      expect(mocks.createRegisterCandidateTransaction).toHaveBeenCalledWith({
        ontid: 'did:ont:node',
        publicKey: 'node-pk',
        initPos: 100000,
        stakeWalletAddress: 'A-stake',
      })
    })
  })

  describe('createDelegatedStakeTransactionBody', () => {
    it('packs the transaction hash and serialized body alongside identity fields', () => {
      mocks.getTransactionHash.mockReturnValue('hash-hex')
      mocks.serializeTransaction.mockReturnValue('serialized-hex')

      const tx = {} as SdkTransactionLike
      const body = createDelegatedStakeTransactionBody({
        tx,
        ontid: 'did:ont:node',
        publicKey: 'node-pk',
        stakeWalletAddress: 'A-stake',
      })

      expect(body).toEqual({
        ontid: 'did:ont:node',
        publickey: 'node-pk',
        stakewalletaddress: 'A-stake',
        transactionhash: 'hash-hex',
        transactionbodyhash: 'serialized-hex',
      })
      expect(mocks.getTransactionHash).toHaveBeenCalledWith(tx)
      expect(mocks.serializeTransaction).toHaveBeenCalledWith(tx)
    })
  })

  describe('serializeNodeStakeInfo', () => {
    it('returns the hex-encoded JSON of the given payload', () => {
      const result = serializeNodeStakeInfo({ name: 'Node A' })

      // utf8('{"name":"Node A"}') hex
      expect(result).toBe(Buffer.from('{"name":"Node A"}', 'utf8').toString('hex'))
    })

    it('returns the hex of an empty JSON object when called with no payload', () => {
      const result = serializeNodeStakeInfo()

      expect(result).toBe(Buffer.from('{}', 'utf8').toString('hex'))
    })
  })
})
