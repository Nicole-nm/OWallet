import { beforeEach, describe, expect, it, vi } from 'vitest'

const httpGet = vi.hoisted(() => vi.fn())
const httpPost = vi.hoisted(() => vi.fn())
const repository = vi.hoisted(() => ({
  findWalletCollections: vi.fn(),
  findIdentityCollection: vi.fn(),
  containsLocalCopayer: vi.fn(),
  findCommonWalletDocs: vi.fn(),
  findLocalAccountByAddress: vi.fn(),
  findLocalAccounts: vi.fn(),
  findLocalCopayers: vi.fn(),
  findRecordByAddress: vi.fn(),
  findRecordsByPublicKeys: vi.fn(),
  insertIdentityRecord: vi.fn(),
  insertWalletRecord: vi.fn(),
  removeIdentityRecord: vi.fn(),
  removeWalletRecord: vi.fn(),
  updateWalletRecord: vi.fn(),
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: { get: httpGet, post: httpPost },
}))
vi.mock('./repository', () => repository)
vi.mock('../../shared/lib/logger', () => ({
  createLogger: () => ({ error: vi.fn(), warn: vi.fn(), info: vi.fn() }),
}))

import {
  fetchIdentityCollection,
  fetchNativeBalance,
  fetchWalletCollections,
  fetchWalletTransactionGroups,
  queryOep4TransactionHistory,
  registerOep4Contract,
} from './walletDomainService'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('fetchWalletCollections', () => {
  it('wraps the repository result in a success', async () => {
    repository.findWalletCollections.mockResolvedValue({ normalWallets: [] })
    const result = await fetchWalletCollections()
    expect(result).toEqual({ ok: true, data: { normalWallets: [] } })
  })

  it('returns a storage failure when the repository throws', async () => {
    repository.findWalletCollections.mockRejectedValue(new Error('boom'))
    const result = await fetchWalletCollections()
    expect(result).toMatchObject({
      ok: false,
      errorKey: 'common.savedbFailed',
      category: 'storage',
      code: 'storage.unavailable',
    })
  })
})

describe('fetchIdentityCollection', () => {
  it('returns the identity records on success', async () => {
    repository.findIdentityCollection.mockResolvedValue([{ id: 1 }])
    expect(await fetchIdentityCollection()).toEqual({ ok: true, data: [{ id: 1 }] })
  })

  it('fails gracefully on error', async () => {
    repository.findIdentityCollection.mockRejectedValue(new Error('x'))
    expect(await fetchIdentityCollection()).toMatchObject({
      ok: false,
      errorKey: 'common.savedbFailed',
      category: 'storage',
    })
  })
})

describe('fetchNativeBalance', () => {
  it('rejects an empty address before calling the network', async () => {
    const result = await fetchNativeBalance('')
    expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
    expect(httpGet).not.toHaveBeenCalled()
  })

  it('maps native asset rows into the balance shape', async () => {
    httpGet.mockResolvedValue({
      result: [
        { asset_name: 'ong', balance: '1' },
        { asset_name: 'waitboundong', balance: '2' },
        { asset_name: 'unboundong', balance: '3' },
        { asset_name: 'ont', balance: '4' },
        { asset_name: 'ignored', balance: '9' },
      ],
    })

    const result = await fetchNativeBalance('addr')
    expect(result).toEqual({
      ok: true,
      data: { ong: '1', waitBoundOng: '2', unboundOng: '3', ont: '4' },
    })
  })

  it('fails when the response has no result field', async () => {
    httpGet.mockResolvedValue({})
    expect(await fetchNativeBalance('addr')).toEqual({ ok: false, errorKey: 'common.networkErr' })
  })

  it('fails when the request throws', async () => {
    httpGet.mockRejectedValue(new Error('net'))
    expect(await fetchNativeBalance('addr')).toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
  })
})

describe('registerOep4Contract', () => {
  it('posts the script hash and returns the result', async () => {
    httpPost.mockResolvedValue({ ok: 1 })
    const result = await registerOep4Contract('MAIN_NET', 'hash')
    expect(result).toEqual({ ok: true, data: { ok: 1 } })
    expect(httpPost).toHaveBeenCalledWith(
      expect.stringContaining('/api/v1/explorer/oep4/info'),
      { scriptHash: 'hash' },
      { silent: true }
    )
  })

  it('fails when the post throws', async () => {
    httpPost.mockRejectedValue(new Error('x'))
    expect(await registerOep4Contract('MAIN_NET', 'hash')).toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
  })
})

describe('queryOep4TransactionHistory', () => {
  it('returns the inner Result payload when present', async () => {
    httpGet.mockResolvedValue({ Result: [{ tx: 1 }] })
    expect(await queryOep4TransactionHistory('MAIN_NET', 'addr')).toEqual({
      ok: true,
      data: [{ tx: 1 }],
    })
  })

  it('returns success with null when there is no payload', async () => {
    httpGet.mockResolvedValue({})
    expect(await queryOep4TransactionHistory('MAIN_NET', 'addr')).toEqual({ ok: true, data: null })
  })

  it('fails when the request throws', async () => {
    httpGet.mockRejectedValue(new Error('x'))
    expect(await queryOep4TransactionHistory('MAIN_NET', 'addr')).toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
  })
})

describe('fetchWalletTransactionGroups', () => {
  it('rejects an empty address', async () => {
    const result = await fetchWalletTransactionGroups({ address: '', network: 'MAIN_NET' })
    expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
  })

  it('returns the result array, defaulting to empty', async () => {
    httpGet.mockResolvedValue({ result: [{ a: 1 }] })
    expect(await fetchWalletTransactionGroups({ address: 'addr', network: 'MAIN_NET' })).toEqual({
      ok: true,
      data: [{ a: 1 }],
    })

    httpGet.mockResolvedValue({})
    expect(await fetchWalletTransactionGroups({ address: 'addr', network: 'MAIN_NET' })).toEqual({
      ok: true,
      data: [],
    })
  })

  it('fails when the request throws', async () => {
    httpGet.mockRejectedValue(new Error('x'))
    expect(
      await fetchWalletTransactionGroups({ address: 'addr', network: 'MAIN_NET' })
    ).toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'network',
    })
  })
})
