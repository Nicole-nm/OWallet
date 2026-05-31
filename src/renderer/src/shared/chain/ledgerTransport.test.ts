import { describe, expect, it, vi } from 'vitest'
import { Buffer } from 'buffer'
import {
  APP_CLOSED,
  DEFAULT_ACCEPTED_STATUSES,
  evalTransportError,
  INS,
  LedgerProtocolClient,
  MSG_TOO_BIG,
  STATUS_OK,
  TX_DENIED,
  TX_PARSE_ERR,
  INS_NOT_SUPPORTED,
  encodeLegacyBip44Path,
  encodeModernBip44Path,
  getDerivationPath,
  parseLegacySignatureReply,
  parseModernSignatureReply,
} from './ledgerTransport'

vi.mock('../../lang', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

function createTransport(send: ReturnType<typeof vi.fn>) {
  return {
    decorateAppAPIMethods: vi.fn(),
    send,
  } as never
}

function createModernSignatureReply(padded = false) {
  const r = Buffer.alloc(padded ? 33 : 32, 1)
  const s = Buffer.alloc(padded ? 33 : 32, 2)
  if (padded) {
    r[0] = 0
    s[0] = 0
  }
  const data = Buffer.concat([Buffer.from([0, 0, 0, r.length]), r, Buffer.from([0, s.length]), s])
  return Buffer.concat([Buffer.from([data.length]), data])
}

function createLegacySignatureReply(padded = false) {
  const r = Buffer.alloc(padded ? 33 : 32, 1)
  const s = Buffer.alloc(padded ? 33 : 32, 2)
  if (padded) {
    r[0] = 0
    s[0] = 0
  }
  const data = Buffer.concat([Buffer.from([0, r.length]), r, Buffer.from([0, s.length]), s])
  return Buffer.concat([Buffer.from([0, data.length]), data])
}

describe('LedgerProtocolClient', () => {
  it('does not accept user-denied status as a successful APDU response', () => {
    expect(DEFAULT_ACCEPTED_STATUSES).toEqual([STATUS_OK])
    expect(DEFAULT_ACCEPTED_STATUSES).not.toContain(TX_DENIED)
  })

  it('maps TX_DENIED from a signing APDU to the user-rejected error', async () => {
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }

      throw { statusCode: TX_DENIED }
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.signMessage("44'/1024'/0'/0/0", 'aabbcc')).rejects.toMatchObject({
      message: 'common.rejectedByUser',
      statusCode: TX_DENIED,
    })
  })

  it('maps transport status errors to locale keys', () => {
    expect(evalTransportError({ statusCode: APP_CLOSED })).toMatchObject({
      message: 'ledgerWallet.appClosed',
    })
    expect(evalTransportError({ statusCode: MSG_TOO_BIG })).toMatchObject({
      message: 'ledgerWallet.transactionTooBig',
    })
    expect(evalTransportError({ statusCode: TX_DENIED })).toMatchObject({
      message: 'ledgerWallet.transactionDenied',
    })
    expect(evalTransportError({ statusCode: TX_PARSE_ERR })).toMatchObject({
      message: 'ledgerWallet.transactionParseError',
    })
  })

  it('maps missing modern signature replies to a locale key', async () => {
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }

      return Buffer.from('9000', 'hex')
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.signMessage("44'/1024'/0'/0/0", 'aabbcc')).rejects.toThrow(
      'ledgerWallet.noSignatureReturned'
    )
  })

  it('encodes legacy and modern derivation paths and rejects malformed paths', () => {
    expect(getDerivationPath()).toBe("44'/1024'/0'/0/0")
    expect(getDerivationPath(3, true)).toBe("44'/888'/0'/0/3")
    expect(encodeLegacyBip44Path("m/44'/1024'/0'/0/3")).toHaveLength(20)
    expect(encodeModernBip44Path("44'/1024'/0'/0/3")).toHaveLength(21)
    expect(() => encodeModernBip44Path('not/a/path')).toThrow('is invalid')
  })

  it('parses modern and legacy signature replies with padded integers', () => {
    expect(parseModernSignatureReply(createModernSignatureReply(true))).toBe(
      '01'.repeat(32) + '02'.repeat(32)
    )
    expect(parseLegacySignatureReply(createLegacySignatureReply(true))).toBe(
      '01'.repeat(32) + '02'.repeat(32)
    )
  })

  it('falls back to the legacy protocol when version APDU is unsupported', async () => {
    const publicKey = 'ab'.repeat(65)
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        throw { statusCode: INS_NOT_SUPPORTED }
      }
      return Buffer.from(publicKey + '9000', 'hex')
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.getRawPublicKey("44'/1024'/0'/0/0", true)).resolves.toBe(publicKey)
    await expect(client.supportsModernProtocol()).resolves.toBe(false)
  })

  it('reads a length-prefixed public key from modern apps', async () => {
    const publicKey = 'ab'.repeat(65)
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }
      return Buffer.concat([Buffer.from([65]), Buffer.from(publicKey, 'hex')])
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.getRawPublicKey("44'/1024'/0'/0/0")).resolves.toBe(publicKey)
  })

  it('chunks modern signatures and parses the returned signature', async () => {
    const reply = createModernSignatureReply()
    const send = vi.fn(async (_cla, instruction, _p1, p2) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }
      return p2 === 0 ? reply : Buffer.alloc(0)
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.signMessage("44'/1024'/0'/0/0", 'aa'.repeat(300))).resolves.toBe(
      '01'.repeat(32) + '02'.repeat(32)
    )
    expect(send).toHaveBeenCalledTimes(4)
  })

  it('signs through the legacy protocol and maps non-denied transport errors', async () => {
    const reply = createLegacySignatureReply()
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0100009000', 'hex')
      }
      return reply
    })
    const client = new LedgerProtocolClient(createTransport(send))

    await expect(client.signMessage("44'/1024'/0'/0/0", 'aabb')).resolves.toBe(
      '01'.repeat(32) + '02'.repeat(32)
    )

    const failing = new LedgerProtocolClient(
      createTransport(
        vi.fn(async () => {
          throw { statusCode: APP_CLOSED }
        })
      )
    )
    await expect(failing.getVersion()).rejects.toMatchObject({
      message: 'ledgerWallet.appClosed',
    })
  })
})
