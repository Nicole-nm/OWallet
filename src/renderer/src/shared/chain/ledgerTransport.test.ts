import { describe, expect, it, vi } from 'vitest'
import { Buffer } from 'buffer'
import {
  DEFAULT_ACCEPTED_STATUSES,
  INS,
  LedgerProtocolClient,
  STATUS_OK,
  TX_DENIED,
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
})
