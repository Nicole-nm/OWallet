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
import { LedgerSigningError } from '../lib/ledgerError'

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

  it('maps TX_DENIED from a signing APDU to a typed user-rejected error', async () => {
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }

      throw { statusCode: TX_DENIED }
    })
    const client = new LedgerProtocolClient(createTransport(send))

    const rejection = client.signMessage("44'/1024'/0'/0/0", 'aabbcc')
    await expect(rejection).rejects.toBeInstanceOf(LedgerSigningError)
    await expect(rejection).rejects.toMatchObject({
      code: 'user_rejected',
      statusCode: TX_DENIED,
    })
  })

  it('maps transport status errors to typed Ledger codes', () => {
    expect(evalTransportError({ statusCode: APP_CLOSED })).toBeInstanceOf(LedgerSigningError)
    expect(evalTransportError({ statusCode: APP_CLOSED })).toMatchObject({ code: 'app_closed' })
    expect(evalTransportError({ statusCode: MSG_TOO_BIG })).toMatchObject({ code: 'tx_too_big' })
    expect(evalTransportError({ statusCode: TX_DENIED })).toMatchObject({ code: 'user_rejected' })
    expect(evalTransportError({ statusCode: TX_PARSE_ERR })).toMatchObject({
      code: 'tx_parse_error',
    })
  })

  it('maps named transport errors to device-state codes', () => {
    expect(evalTransportError({ name: 'LockedDeviceError' })).toMatchObject({
      code: 'device_locked',
    })
    expect(evalTransportError({ name: 'DisconnectedDevice' })).toMatchObject({
      code: 'device_disconnected',
    })
    expect(evalTransportError({ name: 'DisconnectedDeviceDuringOperation' })).toMatchObject({
      code: 'device_disconnected',
    })
  })

  it('wraps unknown errors as transport_unknown preserving the cause', () => {
    const cause = new Error('boom')
    const wrapped = evalTransportError(cause)
    expect(wrapped).toBeInstanceOf(LedgerSigningError)
    expect(wrapped.code).toBe('transport_unknown')
    expect(wrapped.cause).toBe(cause)
  })

  it('passes through an existing LedgerSigningError unchanged', () => {
    const original = new LedgerSigningError('app_closed')
    expect(evalTransportError(original)).toBe(original)
  })

  it('throws a typed no_signature_returned error for missing modern replies', async () => {
    const send = vi.fn(async (_cla, instruction) => {
      if (instruction === INS.GET_VERSION) {
        return Buffer.from('0200009000', 'hex')
      }

      return Buffer.from('9000', 'hex')
    })
    const client = new LedgerProtocolClient(createTransport(send))

    const rejection = client.signMessage("44'/1024'/0'/0/0", 'aabbcc')
    await expect(rejection).rejects.toBeInstanceOf(LedgerSigningError)
    await expect(rejection).rejects.toMatchObject({ code: 'no_signature_returned' })
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
      code: 'app_closed',
      statusCode: APP_CLOSED,
    })
  })
})
