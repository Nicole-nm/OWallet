import { beforeEach, describe, expect, it, vi } from 'vitest'

const sdk = vi.hoisted(() => {
  class FakeAddress {
    constructor(public value: string) {}
  }
  function fakeTx(kind: string, args: unknown[]) {
    return {
      kind,
      args,
      serializeUnsignedData: vi.fn(() => new Uint8Array([1, 2, 3])),
      serialize: vi.fn(() => 'serialized'),
      getHash: vi.fn(() => `${kind}-hash`),
    }
  }
  const makeTransferTx = vi.fn((...args: unknown[]) => fakeTx('transfer', args))
  const makeWithdrawOngTx = vi.fn((...args: unknown[]) => fakeTx('withdraw', args))
  const oep4Transfer = vi.fn((...args: unknown[]) => fakeTx('oep4', args))
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

import {
  buildClaimOng,
  buildNativeTransfer,
  buildOep4Transfer,
  buildTransfer,
} from './assetBuilder'

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

describe('buildTransfer', () => {
  it('routes ONT/ONG transfers through the native builder with stringified gas', async () => {
    await buildTransfer(
      { asset: 'ONT', to: 'to', amount: '5', gasPrice: '500', gasLimit: '20000' } as never,
      'from'
    )
    const args = sdk.makeTransferTx.mock.calls[0] as unknown[]
    expect(args[0]).toBe('ONT')
    expect(args[3]).toBe('5')
    expect(args[4]).toBe('500')
    expect(args[5]).toBe('20000')
    expect((args[6] as { value: string }).value).toBe('from')
  })

  it('routes other assets through the OEP-4 builder, defaulting scriptHash and decimal', async () => {
    await buildTransfer(
      { asset: 'WING', to: 'to', amount: '2', gasPrice: '500', gasLimit: '20000' } as never,
      'from'
    )
    expect(sdk.oep4Transfer).toHaveBeenCalled()
    const args = sdk.oep4Transfer.mock.calls[0] as unknown[]
    // decimal defaults to 0 → amount passes through unscaled
    expect(args[2]).toBe('2')
  })

  it('forwards an explicit scriptHash and decimal for OEP-4 transfers', async () => {
    await buildTransfer(
      {
        asset: 'WING',
        scriptHash: 'abcd',
        decimal: 9,
        to: 'to',
        amount: '3',
        gasPrice: '500',
        gasLimit: '20000',
      } as never,
      'from'
    )
    const args = sdk.oep4Transfer.mock.calls[0] as unknown[]
    expect(args[2]).toBe('3000000000')
  })
})
