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
})
