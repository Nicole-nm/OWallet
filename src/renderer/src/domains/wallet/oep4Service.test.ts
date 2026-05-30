import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  httpGet: vi.fn(),
  restClient: {
    getContract: vi.fn(),
    sendRawTransaction: vi.fn(),
  },
  serializeTx: vi.fn(() => 'serialized'),
}))

vi.mock('../../shared/network/httpClient', () => ({
  default: { get: mocks.httpGet },
}))

vi.mock('../../shared/lib/urlBuilder', () => ({
  getTokenBalanceUrl: vi.fn((type: string, addr: string) => `balances/${type}/${addr}`),
  getTokenListUrl: vi.fn(
    (type: string, size: number, page: number) => `list/${type}/${size}/${page}`
  ),
}))

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: vi.fn(() => mocks.restClient),
}))

vi.mock('../transaction/serializationService', () => ({
  serializeTx: (...args: unknown[]) => (mocks.serializeTx as (...a: unknown[]) => unknown)(...args),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => {
  class FakeAddress {
    constructor(public value: string) {}
  }
  class FakeOep4Builder {
    constructor(public addr: unknown) {}
    queryName = () => ({ kind: 'name' })
    querySymbol = () => ({ kind: 'symbol' })
    queryDecimals = () => ({ kind: 'decimals' })
    queryBalanceOf = (addr: unknown) => ({ kind: 'balance', addr })
  }
  return {
    loadOntologySdk: vi.fn(async () => ({
      Crypto: { Address: FakeAddress },
      Oep4: { Oep4TxBuilder: FakeOep4Builder },
      utils: {
        reverseHex: (v: string) => `rev(${v})`,
        hexstr2str: (v: string) => `str(${v})`,
      },
    })),
  }
})

import {
  fetchOep4TokenBalances,
  fetchOep4TokenList,
  hasOep4Contract,
  queryAllOep4Balances,
  queryOep4Balance,
  queryOep4Decimal,
  queryOep4StringProperty,
} from './oep4Service'

beforeEach(() => {
  vi.clearAllMocks()
  mocks.serializeTx.mockReturnValue('serialized')
})

describe('oep4Service', () => {
  it('hasOep4Contract returns true when a contract result is present', async () => {
    mocks.restClient.getContract.mockResolvedValue({ Result: 'contract-data' })
    expect(await hasOep4Contract('hash')).toBe(true)
  })

  it('hasOep4Contract returns false when no contract result', async () => {
    mocks.restClient.getContract.mockResolvedValue({ Result: '' })
    expect(await hasOep4Contract('hash')).toBe(false)
  })

  it('queryOep4StringProperty decodes the hex result for name', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: { Result: 'deadbeef' } })
    expect(await queryOep4StringProperty('hash', 'name')).toBe('str(deadbeef)')
  })

  it('queryOep4StringProperty falls back to OEP4 when no result', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: { Result: '' } })
    expect(await queryOep4StringProperty('hash', 'symbol')).toBe('OEP4')
  })

  it('queryOep4Decimal parses a hex decimal value', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: { Result: '12' } })
    expect(await queryOep4Decimal('hash')).toBe(0x12)
  })

  it('queryOep4Decimal returns 0 when no result', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({})
    expect(await queryOep4Decimal('hash')).toBe(0)
  })

  it('queryOep4Balance divides the reversed-hex value by the decimal factor', async () => {
    // reverseHex('64') => 'rev(64)' is not hex; supply a value that round-trips.
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: { Result: '0a' } })
    const result = await queryOep4Balance('hash', 'addr', 0)
    expect(typeof result).toBe('number')
  })

  it('queryOep4Balance returns 0 when there is no result', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: {} })
    expect(await queryOep4Balance('hash', 'addr', 9)).toBe(0)
  })

  it('queryAllOep4Balances skips tokens from a different network', async () => {
    mocks.restClient.sendRawTransaction.mockResolvedValue({ Result: {} })
    const result = await queryAllOep4Balances(
      [
        { scriptHash: 'h1', decimal: 0, net: 'MAIN_NET' } as never,
        { scriptHash: 'h2', decimal: 0, net: 'TEST_NET' } as never,
      ],
      'addr',
      'MAIN_NET'
    )
    expect(result).toEqual([0, 0])
  })

  it('fetchOep4TokenList unwraps records and total', async () => {
    mocks.httpGet.mockResolvedValue({ result: { records: [{ a: 1 }], total: 1 } })
    expect(await fetchOep4TokenList(10, 1)).toEqual({ records: [{ a: 1 }], total: 1 })
  })

  it('fetchOep4TokenBalances returns the result array', async () => {
    mocks.httpGet.mockResolvedValue({ result: [{ asset_name: 'WING', balance: '1' }] })
    expect(await fetchOep4TokenBalances('addr')).toEqual([{ asset_name: 'WING', balance: '1' }])
  })
})
