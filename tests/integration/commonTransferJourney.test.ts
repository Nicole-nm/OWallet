import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { WalletAdapter } from '../../src/renderer/src/modules/wallet/application/adapter/WalletAdapterFactory'

const mocks = vi.hoisted(() => ({
  buildNativeTransfer: vi.fn(),
  sendTx: vi.fn(),
}))

vi.mock('../../src/renderer/src/domains/transaction/assetBuilder', () => ({
  buildClaimOng: vi.fn(),
  buildNativeTransfer: (...args: unknown[]) => mocks.buildNativeTransfer(...args),
  buildOep4Transfer: vi.fn(),
}))

vi.mock('../../src/renderer/src/domains/transaction/signingService', () => ({
  sendTx: (...args: unknown[]) => mocks.sendTx(...args),
}))

import { submitCommonTransfer } from '../../src/renderer/src/modules/wallet/application/transfer/commonTransferApplicationService'
import { createFakeTransaction } from '../../src/renderer/src/shared/chain/__fixtures__/fakeSdk'

describe('common transfer journey', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds, signs, and broadcasts a native transfer across application and domain layers', async () => {
    const unsigned = createFakeTransaction()
    const signed = createFakeTransaction({ getHash: vi.fn(() => 'aabb') })
    const adapter = {
      capabilities: { requiresPassword: true },
      signTransaction: vi.fn(async () => signed),
    } as unknown as WalletAdapter
    mocks.buildNativeTransfer.mockResolvedValue(unsigned)
    mocks.sendTx.mockResolvedValue({ Error: 0, Result: 'ok' })

    await expect(
      submitCommonTransfer({
        address: 'AQ123',
        adapter,
        transfer: { asset: 'ONT', to: 'AQ999', amount: '7', gas: '0.01' },
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: true,
      response: { Error: 0, Result: 'ok' },
      txHash: 'bbaa',
    })

    expect(mocks.buildNativeTransfer).toHaveBeenCalledWith(
      'ONT',
      'AQ123',
      'AQ999',
      '7',
      'AQ123',
      '500',
      '20000'
    )
    expect(adapter.signTransaction).toHaveBeenCalledWith(unsigned, { password: 'secret' })
    expect(mocks.sendTx).toHaveBeenCalledWith(signed)
  })

  it('propagates a broadcast failure from the transaction domain', async () => {
    const tx = createFakeTransaction()
    const adapter = {
      capabilities: { requiresPassword: true },
      signTransaction: vi.fn(async () => tx),
    } as unknown as WalletAdapter
    mocks.buildNativeTransfer.mockResolvedValue(tx)
    mocks.sendTx.mockResolvedValue({ Error: -1, Result: 'cannot cover gas cost' })

    await expect(
      submitCommonTransfer({
        address: 'AQ123',
        adapter,
        transfer: { asset: 'ONT', to: 'AQ999', amount: '7', gas: '0.01' },
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.ongNoEnough',
      detail: 'cannot cover gas cost',
    })
  })
})
