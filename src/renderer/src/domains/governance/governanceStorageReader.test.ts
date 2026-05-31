import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  getStorage: vi.fn(),
  getBlockHeight: vi.fn(),
  getBlockJson: vi.fn(),
  readers: new Map<string, Record<string, (...args: unknown[]) => unknown>>(),
  calcUnboundOng: vi.fn(),
}))

function queue(values: unknown[] = []) {
  return vi.fn(() => values.shift())
}

function createReader(methods: Partial<Record<string, unknown[]>> = {}) {
  return {
    readInt: queue(methods.readInt),
    readUint8: queue(methods.readUint8),
    readUint32: queue(methods.readUint32),
    readLong: queue(methods.readLong),
    readNextBytes: queue(methods.readNextBytes),
    read: queue(methods.read),
  }
}

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: () => ({
    getStorage: mocks.getStorage,
    getBlockHeight: mocks.getBlockHeight,
    getBlockJson: mocks.getBlockJson,
  }),
}))

vi.mock('./governanceSdkLoader', () => ({
  loadGovernanceSdk: async () => ({
    Crypto: {
      Address: class {
        constructor(public value: string) {}
        serialize() {
          return `serialized:${this.value}`
        }
        toBase58() {
          return `base58:${this.value}`
        }
      },
    },
    utils: {
      StringReader: class {
        reader: Record<string, (...args: unknown[]) => unknown>

        constructor(data: string) {
          const reader = mocks.readers.get(data)
          if (!reader) throw new Error(`Missing reader fixture: ${data}`)
          this.reader = reader
        }

        readInt() {
          return this.reader.readInt?.()
        }
        readUint8() {
          return this.reader.readUint8?.()
        }
        readUint32() {
          return this.reader.readUint32?.()
        }
        readLong() {
          return this.reader.readLong?.()
        }
        readNextBytes() {
          return this.reader.readNextBytes?.()
        }
        read(length: number) {
          return this.reader.read?.(length)
        }
      },
      reverseHex: (value: string) => `reverse:${value}`,
      hexstr2str: (value: string) => `text:${value}`,
      bigIntFromBytes: (value: string) => Number(value),
      calcUnboundOng: mocks.calcUnboundOng,
    },
  }),
}))

import {
  getAttributes,
  getAuthorizeInfo,
  getGlobalParam,
  getPeerPoolMap,
  getPeerUnboundOng,
  getSplitFeeAddress,
} from './governanceStorageReader'

function mockStorage(...results: Array<string | null>) {
  mocks.getStorage.mockImplementation(async () => ({ Result: results.shift() }))
}

describe('governanceStorageReader', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.readers.clear()
    mocks.readers.set('view', createReader({ readUint32: [2, 3] }))
  })

  it('returns an empty peer pool when the storage payload is absent', async () => {
    mockStorage('view', null)
    await expect(getPeerPoolMap()).resolves.toEqual({})
  })

  it('decodes peer pool entries', async () => {
    mockStorage('view', 'pool')
    mocks.readers.set(
      'pool',
      createReader({
        readInt: [1, 7],
        readNextBytes: ['peer'],
        read: ['addr'],
        readUint8: [2],
        readLong: [10, 20],
      })
    )

    await expect(getPeerPoolMap()).resolves.toEqual({
      'text:peer': {
        index: 7,
        peerPubkey: 'text:peer',
        address: 'base58:addr',
        status: 2,
        initPos: 10,
        totalPos: 20,
      },
    })
  })

  it('maps missing and normalized peer attributes', async () => {
    mockStorage(null)
    await expect(getAttributes('peer')).resolves.toMatchObject({
      peerPubkey: '',
      maxAuthorize: 0,
      t2StakeCost: 100,
    })

    mockStorage('attrs')
    mocks.readers.set(
      'attrs',
      createReader({
        readNextBytes: ['peer', '0', '101', '5'],
        readLong: [9, 11, 12, 13],
      })
    )
    await expect(getAttributes('peer')).resolves.toEqual({
      peerPubkey: 'text:peer',
      maxAuthorize: 9,
      t2PeerCost: 11,
      t1PeerCost: 12,
      tPeerCost: 13,
      t2StakeCost: 11,
      t1StakeCost: 0,
      tStakeCost: 5,
    })
  })

  it('decodes authorization and split-fee records for string and serialized addresses', async () => {
    mockStorage(null)
    await expect(getAuthorizeInfo('peer', 'AQ')).resolves.toMatchObject({
      peerPubkey: '',
      consensusPos: 0,
    })

    mockStorage('auth')
    mocks.readers.set(
      'auth',
      createReader({
        readNextBytes: ['peer'],
        read: ['addr'],
        readLong: [1, 2, 3, 4, 5, 6],
      })
    )
    await expect(getAuthorizeInfo('peer', { serialize: () => 'serialized-user' })).resolves.toEqual(
      {
        peerPubkey: 'text:peer',
        address: expect.objectContaining({ value: 'addr' }),
        consensusPos: 1,
        freezePos: 2,
        newPos: 3,
        withdrawPos: 4,
        withdrawFreezePos: 5,
        withdrawUnfreezePos: 6,
      }
    )

    mockStorage(null)
    await expect(getSplitFeeAddress('AQ')).resolves.toEqual({ address: null, amount: 0 })

    mockStorage('split')
    mocks.readers.set('split', createReader({ read: ['addr'], readLong: [8] }))
    await expect(getSplitFeeAddress({ serialize: () => 'serialized-user' })).resolves.toEqual({
      address: expect.objectContaining({ value: 'addr' }),
      amount: 8,
    })
  })

  it('decodes global parameters and unbound ONG calculations', async () => {
    mockStorage(null)
    await expect(getGlobalParam()).resolves.toMatchObject({ candidateFee: 0, posLimit: 10 })

    mockStorage('global')
    mocks.readers.set(
      'global',
      createReader({ readNextBytes: ['1', '2', '3', '4', '5', '6', '7', '8'] })
    )
    await expect(getGlobalParam()).resolves.toEqual({
      candidateFee: 1,
      minInitState: 2,
      candidateNum: 3,
      posLimit: 4,
      A: 5,
      B: 6,
      yita: 7,
      penalty: 8,
    })

    mockStorage(null)
    await expect(getPeerUnboundOng('AQ')).resolves.toBe(0)

    mockStorage('stake')
    mocks.readers.set('stake', createReader({ read: ['addr'], readLong: [9], readUint32: [10] }))
    mocks.getBlockHeight.mockResolvedValue({ Result: 11 })
    mocks.getBlockJson.mockResolvedValue({ Result: { Header: { Timestamp: 1530316820 } } })
    mocks.calcUnboundOng.mockReturnValue(12)
    await expect(getPeerUnboundOng({ serialize: () => 'serialized-user' })).resolves.toBe(12)
    expect(mocks.calcUnboundOng).toHaveBeenCalledWith(9, 10, 20)
  })

  it('throws when the governance view is absent', async () => {
    mockStorage(null)
    await expect(getPeerPoolMap()).rejects.toThrow('No governance view found')
  })
})
