import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  class FakeAddress {
    constructor(public value: string) {}
  }
  const makeTransferTx = vi.fn((...args: unknown[]) => ({ kind: 'transfer', args }))
  const makeWithdrawOngTx = vi.fn((...args: unknown[]) => ({ kind: 'withdraw', args }))
  const oep4Transfer = vi.fn((...args: unknown[]) => ({ kind: 'oep4', args }))
  class FakeOep4Builder {
    constructor(public addr: unknown) {}
    makeTransferTx = oep4Transfer
  }
  return {
    FakeAddress,
    makeTransferTx,
    makeWithdrawOngTx,
    oep4Transfer,
    loaded: {
      Crypto: { Address: FakeAddress },
      OntAssetTxBuilder: { makeTransferTx, makeWithdrawOngTx },
      Oep4: { Oep4TxBuilder: FakeOep4Builder },
      utils: { reverseHex: (v: string) => `rev(${v})` },
    },
  }
})

vi.mock('../../shared/lib/constants', () => ({ GAS_LIMIT: '20000', GAS_PRICE: '500' }))
vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: vi.fn(async () => sdk.loaded),
}))

import { buildClaimOng, buildNativeTransfer, buildOep4Transfer } from './assetBuilder'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('buildNativeTransfer', () => {
  it('passes the raw amount for ONT and defaults the payer to the sender', async () => {
    await buildNativeTransfer('ONT', 'from', 'to', '100')
    const args = sdk.makeTransferTx.mock.calls[0] as unknown[]
    expect(args[0]).toBe('ONT')
    expect(args[3]).toBe('100')
    // payer (last arg) defaults to the from address
    expect((args[6] as { value: string }).value).toBe('from')
  })

  it('scales ONG amounts by 1e9 and uses an explicit payer when given', async () => {
    await buildNativeTransfer('ONG', 'from', 'to', '2', 'payer')
    const args = sdk.makeTransferTx.mock.calls[0] as unknown[]
    expect(args[3]).toBe('2000000000')
    expect((args[6] as { value: string }).value).toBe('payer')
  })
})

describe('buildOep4Transfer', () => {
  it('scales the amount by the token decimals and reverses the script hash', async () => {
    await buildOep4Transfer('abcd', 'from', 'to', '3', 9)
    const args = sdk.oep4Transfer.mock.calls[0] as unknown[]
    expect(args[2]).toBe('3000000000')
  })
})

describe('buildClaimOng', () => {
  it('scales the ong amount by 1e9', async () => {
    await buildClaimOng('addr', '1.5')
    const args = sdk.makeWithdrawOngTx.mock.calls[0] as unknown[]
    expect(args[2]).toBe('1500000000')
  })
})
