import { describe, it, expect } from 'vitest'
import {
  formatNumber,
  applyStatusText,
  parseNewVoteInfo,
  parseOldVoteInfo,
  parseNewVoteInfoBatch,
  parseOldVoteInfoBatch,
  parseVotedResult,
  parseVotedRecords,
  parseGovNodes,
  parseTopicHashes,
  parseVoterEntry,
} from './voteParser'
import type { VoteCrypto, VoteSdkContext, VoteUtilsWithBoolean } from './voteParser'

// ---------------------------------------------------------------------------
// Minimal stubs for the ontology-ts-sdk interfaces used by the parsers.
// We deliberately keep these as simple as possible so the tests can run
// without the real SDK being loaded.
// ---------------------------------------------------------------------------

const stubCrypto: VoteCrypto = {
  Address: class {
    private hex: string
    constructor(hex: string) {
      this.hex = hex
    }
    toBase58() {
      return `BASE58(${this.hex})`
    }
  },
}

function stubReverseHex(v: string): string {
  // Reverse every pair of characters (byte swap)
  const pairs = v.match(/.{1,2}/g) ?? []
  return pairs.reverse().join('')
}

const stubUtils: VoteUtilsWithBoolean = {
  hexstr2str: (hex: string) => Buffer.from(hex, 'hex').toString('utf8'),
  reverseHex: stubReverseHex,
  StringReader: class {
    private data: Buffer
    private pos: number

    constructor(hex: string) {
      this.data = Buffer.from(hex, 'hex')
      this.pos = 0
    }

    private readBytes(n: number): Buffer {
      if (this.pos + n > this.data.length) {
        throw new RangeError(
          `StringReader: tried to read ${n} bytes at pos ${this.pos} but buffer is only ${this.data.length} bytes`
        )
      }
      const slice = this.data.subarray(this.pos, this.pos + n)
      this.pos += n
      return slice
    }

    readVarUint(): number {
      const first = this.readBytes(1).readUInt8(0)
      if (first < 0xfd) return first
      if (first === 0xfd) return this.readBytes(2).readUInt16LE(0)
      if (first === 0xfe) return this.readBytes(4).readUInt32LE(0)
      // 0xff → 8 bytes (read as two uint32 LE, ignore high word for test purposes)
      const lo = this.readBytes(4).readUInt32LE(0)
      this.readBytes(4) // ignore high word
      return lo
    }

    read(len: number): string {
      return this.readBytes(len).toString('hex')
    }

    readUint128(): number {
      // 16 bytes LE
      const buf = this.readBytes(16)
      return buf.readUInt32LE(0)
    }

    readUint64(): number {
      const buf = this.readBytes(8)
      return buf.readUInt32LE(0)
    }

    readUint8(): number {
      return this.readBytes(1).readUInt8(0)
    }

    readH256(): string {
      return this.readBytes(32).toString('hex')
    }

    readBoolean(): boolean {
      return this.readBytes(1).readUInt8(0) !== 0
    }
  },
}

// ---------------------------------------------------------------------------
// Helper: build a minimal valid new-format vote binary payload
// ---------------------------------------------------------------------------

function buildNewVoteHex({
  hasValue = 1,
  adminHex = '00'.repeat(20),
  title = 'Test',
  content = 'Content',
  voters = [] as { addrHex: string; weight: number }[],
  startTimeSec = 1000,
  endTimeSec = 2000,
  approves = 5,
  rejects = 3,
  status = 1,
  hashHex = 'ab'.repeat(32),
} = {}) {
  const parts: Buffer[] = []

  // hasValue as varuint (1 byte for values < 0xfd)
  parts.push(Buffer.from([hasValue]))

  if (hasValue === 0) {
    return Buffer.concat(parts).toString('hex')
  }

  // admin (20 bytes)
  parts.push(Buffer.from(adminHex, 'hex'))

  // title as varuint-prefixed utf8 hex
  const titleHex = Buffer.from(title, 'utf8').toString('hex')
  const titleBytes = Buffer.from(titleHex, 'hex')
  parts.push(Buffer.from([titleBytes.length]))
  parts.push(titleBytes)

  // content as varuint-prefixed utf8 hex
  const contentHex = Buffer.from(content, 'utf8').toString('hex')
  const contentBytes = Buffer.from(contentHex, 'hex')
  parts.push(Buffer.from([contentBytes.length]))
  parts.push(contentBytes)

  // voters length
  parts.push(Buffer.from([voters.length]))
  for (const v of voters) {
    parts.push(Buffer.from(v.addrHex, 'hex')) // 20 bytes
    const weightBuf = Buffer.alloc(16)
    weightBuf.writeUInt32LE(v.weight, 0)
    parts.push(weightBuf)
  }

  // timestamps (uint64 LE, 8 bytes each)
  const writUint64 = (n: number) => {
    const b = Buffer.alloc(8)
    b.writeUInt32LE(n, 0)
    return b
  }
  parts.push(writUint64(startTimeSec))
  parts.push(writUint64(endTimeSec))
  parts.push(writUint64(approves))
  parts.push(writUint64(rejects))

  // status (uint8)
  parts.push(Buffer.from([status]))

  // hash (32 bytes)
  parts.push(Buffer.from(hashHex, 'hex'))

  return Buffer.concat(parts).toString('hex')
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe('formatNumber', () => {
  it('reverses hex bytes and interprets as integer', () => {
    // "0100" reversed → "0001" → 1 (as 2-byte little-endian)
    expect(formatNumber('0100', stubUtils)).toBe(1)
  })

  it('handles single-byte values', () => {
    expect(formatNumber('07', stubUtils)).toBe(7)
  })
})

describe('applyStatusText', () => {
  const now = Date.now()

  it('sets CANCELED when status is 0', () => {
    const vote = { status: 0, startTime: now - 1000, endTime: now + 1000 }
    applyStatusText(vote)
    expect(vote).toHaveProperty('statusText', 'CANCELED')
  })

  it('sets NOT_START when startTime is in the future', () => {
    const vote = { status: 1, startTime: now + 100_000, endTime: now + 200_000 }
    applyStatusText(vote)
    expect(vote).toHaveProperty('statusText', 'NOT_START')
  })

  it('sets IN_PROGRESS when now is within the vote window', () => {
    const vote = { status: 1, startTime: now - 100_000, endTime: now + 100_000 }
    applyStatusText(vote)
    expect(vote).toHaveProperty('statusText', 'IN_PROGRESS')
  })

  it('sets FINISHED when endTime is in the past', () => {
    const vote = { status: 1, startTime: now - 200_000, endTime: now - 100_000 }
    applyStatusText(vote)
    expect(vote).toHaveProperty('statusText', 'FINISHED')
  })
})

describe('parseNewVoteInfo', () => {
  const ctx: VoteSdkContext = { Crypto: stubCrypto, utils: stubUtils }

  it('returns null when hasValue is 0', () => {
    const hex = buildNewVoteHex({ hasValue: 0 })
    expect(parseNewVoteInfo(hex, ctx)).toBeNull()
  })

  it('parses a minimal valid payload', () => {
    const hex = buildNewVoteHex({
      adminHex: '01'.repeat(20),
      title: 'Hello',
      content: 'World',
      startTimeSec: 1_000,
      endTimeSec: 2_000,
      approves: 10,
      rejects: 2,
      status: 1,
      hashHex: 'cd'.repeat(32),
    })
    const result = parseNewVoteInfo(hex, ctx)
    expect(result).not.toBeNull()
    expect(result!.title).toBe('Hello')
    expect(result!.content).toBe('World')
    expect(result!.approves).toBe(10)
    expect(result!.rejects).toBe(2)
    expect(result!.status).toBe(1)
    // timestamps should be converted to milliseconds
    expect(result!.startTime).toBe(1_000 * 1000)
    expect(result!.endTime).toBe(2_000 * 1000)
    // hash is 32-byte hex
    expect(result!.hash).toHaveLength(64)
    expect(result!.statusText).toBeDefined()
  })

  it('parses voters correctly', () => {
    const hex = buildNewVoteHex({
      voters: [{ addrHex: 'aa'.repeat(20), weight: 100 }],
      status: 0, // CANCELED so statusText is deterministic
    })
    const result = parseNewVoteInfo(hex, ctx)
    expect(result!.voters).toHaveLength(1)
    expect(result!.voters[0]!.weight).toBe(100)
    expect(result!.statusText).toBe('CANCELED')
  })

  it('throws on truncated buffer', () => {
    // A completely minimal but valid start, then abruptly truncated
    const hex = buildNewVoteHex()
    const truncated = hex.slice(0, hex.length - 10) // chop the tail
    expect(() => parseNewVoteInfo(truncated, ctx)).toThrow()
  })

  it('throws on empty string', () => {
    expect(() => parseNewVoteInfo('', ctx)).toThrow()
  })
})

describe('parseNewVoteInfoBatch', () => {
  const ctx: VoteSdkContext = { Crypto: stubCrypto, utils: stubUtils }

  it('returns empty array for empty input', () => {
    expect(parseNewVoteInfoBatch([], ctx)).toEqual([])
  })

  it('skips items that fail to parse and calls onError', () => {
    const good = buildNewVoteHex({ title: 'Good' })
    const errors: any[] = []
    const result = parseNewVoteInfoBatch(['deadbeef', good], ctx, (e) => errors.push(e))
    expect(result).toHaveLength(1)
    expect(result[0]!.title).toBe('Good')
    expect(errors).toHaveLength(1)
  })

  it('skips null-returning items (hasValue=0) without error', () => {
    const empty = buildNewVoteHex({ hasValue: 0 })
    const good = buildNewVoteHex({ title: 'Real' })
    const result = parseNewVoteInfoBatch([empty, good], ctx)
    expect(result).toHaveLength(1)
  })
})

describe('parseOldVoteInfo', () => {
  it('parses an old-format string array', () => {
    const now = Date.now()
    // Build a fake 10-element old-format array
    // Timestamps as little-endian hex of seconds (≤10 digits → multiply by 1000)
    function toLeHex(n: number): string {
      const b = Buffer.alloc(4)
      b.writeUInt32LE(n, 0)
      return b.toString('hex')
    }

    const adminHex = 'aa'.repeat(20)
    const titleHex = Buffer.from('Old Title', 'utf8').toString('hex')
    const contentHex = Buffer.from('Old Content', 'utf8').toString('hex')
    const startSec = Math.floor((now - 200_000) / 1000)
    const endSec = Math.floor((now - 100_000) / 1000)

    const arrayItem = [
      adminHex,
      titleHex,
      contentHex,
      null as unknown as string, // no voters
      toLeHex(startSec),
      toLeHex(endSec),
      toLeHex(5), // approves
      toLeHex(3), // rejects
      toLeHex(1), // status
      'hash0000',
    ] as string[]

    const result = parseOldVoteInfo(arrayItem, stubUtils, stubCrypto)
    expect(result.title).toBe('Old Title')
    expect(result.content).toBe('Old Content')
    expect(result.approves).toBe(5)
    expect(result.rejects).toBe(3)
    expect(result.status).toBe(1)
    expect(result.voters).toEqual([])
    // startTime should be in ms
    expect(result.startTime).toBe(startSec * 1000)
    expect(result.statusText).toBe('FINISHED')
  })
})

describe('parseOldVoteInfoBatch', () => {
  it('unwraps Result.Result envelope', () => {
    const arrayItem = [
      'aa'.repeat(20),
      Buffer.from('Title', 'utf8').toString('hex'),
      Buffer.from('Body', 'utf8').toString('hex'),
      null as unknown as string,
      '01000000', // LE uint32 = 1 (very old timestamp → treat as seconds)
      '02000000',
      '00000000', // approves
      '00000000', // rejects
      '00000000', // status = 0 → CANCELED
      'hash',
    ] as string[]

    const wrapped = { Result: { Result: arrayItem } }
    const result = parseOldVoteInfoBatch([wrapped], stubUtils, stubCrypto)
    expect(result).toHaveLength(1)
    expect(result[0]!.title).toBe('Title')
  })
})

describe('parseVotedResult', () => {
  function buildVotedResultHex(val: number): string {
    return Buffer.from([val]).toString('hex')
  }

  it('returns APPROVED for value 1', () => {
    expect(parseVotedResult(buildVotedResultHex(1), stubUtils)).toBe('APPROVED')
  })

  it('returns REJECTED for value 2', () => {
    expect(parseVotedResult(buildVotedResultHex(2), stubUtils)).toBe('REJECTED')
  })

  it('returns NOT_VOTED for value 0', () => {
    expect(parseVotedResult(buildVotedResultHex(0), stubUtils)).toBe('NOT_VOTED')
  })

  it('returns NOT_VOTED for any other value', () => {
    expect(parseVotedResult(buildVotedResultHex(99), stubUtils)).toBe('NOT_VOTED')
  })
})

describe('parseGovNodes', () => {
  it('returns empty array for 0 nodes', () => {
    const hex = '00' // varuint = 0
    expect(parseGovNodes(hex, stubUtils, stubCrypto)).toEqual([])
  })

  it('parses a single node address', () => {
    const addrHex = 'ff'.repeat(20)
    const hex = '01' + addrHex // count=1, then 20-byte address
    const nodes = parseGovNodes(hex, stubUtils, stubCrypto)
    expect(nodes).toHaveLength(1)
    expect(nodes[0]!.address).toBe(`BASE58(${addrHex})`)
    expect(nodes[0]!.weight).toBe(0)
    expect(nodes[0]!.name).toBe('')
  })
})

describe('parseTopicHashes', () => {
  it('returns empty array for 0 hashes', () => {
    expect(parseTopicHashes('00', stubUtils)).toEqual([])
  })

  it('parses a single 32-byte hash', () => {
    const hashHex = '11'.repeat(32)
    const hex = '01' + hashHex
    const hashes = parseTopicHashes(hex, stubUtils)
    expect(hashes).toHaveLength(1)
    expect(hashes[0]).toBe(hashHex)
  })
})

describe('parseVoterEntry', () => {
  it('parses [addrHex, weightLeHex] correctly', () => {
    const addrHex = 'ee'.repeat(20)
    // weight = 42 as little-endian hex
    const weightLeHex = '2a000000'
    const result = parseVoterEntry([addrHex, weightLeHex], stubUtils, stubCrypto)
    expect(result.address).toBe(`BASE58(${addrHex})`)
    expect(result.weight).toBe(42)
  })
})

// ---------------------------------------------------------------------------
// Helper: build a binary payload for parseVotedRecords
// Format: varuint(count) [ address(20) | uint64(weight) | boolean(1) ] ...
// ---------------------------------------------------------------------------

function buildVotedRecordsHex(
  records: Array<{ addrHex: string; weight: number; isApproval: boolean }>
): string {
  const parts: Buffer[] = []

  // count as varuint (1 byte for values < 0xfd)
  parts.push(Buffer.from([records.length]))

  for (const rec of records) {
    // address: 20 bytes
    parts.push(Buffer.from(rec.addrHex, 'hex'))

    // weight: uint64 LE (8 bytes) — stub readUint64 reads low 4 bytes as UInt32LE
    const weightBuf = Buffer.alloc(8)
    weightBuf.writeUInt32LE(rec.weight, 0)
    parts.push(weightBuf)

    // isApproval: 1 byte boolean
    parts.push(Buffer.from([rec.isApproval ? 1 : 0]))
  }

  return Buffer.concat(parts).toString('hex')
}

describe('parseVotedRecords', () => {
  it('returns an empty array when count is 0', () => {
    const hex = buildVotedRecordsHex([])
    const result = parseVotedRecords(hex, stubUtils, stubCrypto)
    expect(result).toEqual([])
  })

  it('parses a single approved record correctly', () => {
    const addrHex = 'aa'.repeat(20)
    const hex = buildVotedRecordsHex([{ addrHex, weight: 500, isApproval: true }])
    const result = parseVotedRecords(hex, stubUtils, stubCrypto)
    expect(result).toHaveLength(1)
    expect(result[0]!.address).toBe(`BASE58(${addrHex})`)
    expect(result[0]!.weight).toBe(500)
    expect(result[0]!.isApproval).toBe(true)
  })

  it('parses a single rejected record correctly', () => {
    const addrHex = 'bb'.repeat(20)
    const hex = buildVotedRecordsHex([{ addrHex, weight: 250, isApproval: false }])
    const result = parseVotedRecords(hex, stubUtils, stubCrypto)
    expect(result).toHaveLength(1)
    expect(result[0]!.isApproval).toBe(false)
    expect(result[0]!.weight).toBe(250)
  })

  it('parses multiple records preserving order', () => {
    const records = [
      { addrHex: '11'.repeat(20), weight: 100, isApproval: true },
      { addrHex: '22'.repeat(20), weight: 200, isApproval: false },
      { addrHex: '33'.repeat(20), weight: 300, isApproval: true },
    ]
    const hex = buildVotedRecordsHex(records)
    const result = parseVotedRecords(hex, stubUtils, stubCrypto)
    expect(result).toHaveLength(3)
    expect(result[0]!.weight).toBe(100)
    expect(result[0]!.isApproval).toBe(true)
    expect(result[1]!.weight).toBe(200)
    expect(result[1]!.isApproval).toBe(false)
    expect(result[2]!.weight).toBe(300)
    expect(result[2]!.isApproval).toBe(true)
  })

  it('throws on truncated / malformed input', () => {
    // Claim 3 records but provide no actual data — the StringReader will throw
    const truncated = '03' // count=3 but nothing follows
    expect(() => parseVotedRecords(truncated, stubUtils, stubCrypto)).toThrow()
  })
})
