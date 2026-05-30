import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  applicationService: {
    sendTransaction: vi.fn(),
  },
}))

vi.mock('./transactionDomainService', () => ({
  sendTransaction: (...args: any[]) => mocks.applicationService.sendTransaction(...args),
}))

import { submitWithAdapter } from './submitWithAdapter'
import type { WalletAdapter, WalletCapabilities } from '../wallet/adapter'

const commonCapabilities: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

function makeAdapter(
  capabilities: WalletCapabilities = commonCapabilities,
  signResult: unknown = { id: 'signed-tx' },
  addSignatureResult: unknown = { id: 'co-signed-tx' }
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address: 'AQ123',
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn().mockResolvedValue(signResult),
    addSignature: vi.fn().mockResolvedValue(addSignatureResult),
    signMessage: vi.fn(),
  } as WalletAdapter
}

describe('submitWithAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs with adapter.signTransaction by default and broadcasts via sendTransaction', async () => {
    const tx = { id: 'tx-1' } as any
    const signed = { id: 'signed-tx' }
    const sendResult = { ok: true, response: {}, txHash: 'hash-1' }

    mocks.applicationService.sendTransaction.mockResolvedValue(sendResult)
    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret' })).resolves.toEqual(
      sendResult
    )

    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: 'secret' })
    expect(adapter.addSignature).not.toHaveBeenCalled()
    expect(mocks.applicationService.sendTransaction).toHaveBeenCalledWith(signed)
  })

  it('uses adapter.addSignature when useAddSignature is true', async () => {
    const tx = { id: 'tx-1' } as any
    const cosigned = { id: 'co-signed-tx' }
    const sendResult = { ok: true, response: {}, txHash: 'hash-2' }

    mocks.applicationService.sendTransaction.mockResolvedValue(sendResult)
    const adapter = makeAdapter(commonCapabilities, undefined, cosigned)

    await expect(
      submitWithAdapter({ tx, adapter, password: 'secret', useAddSignature: true })
    ).resolves.toEqual(sendResult)

    expect(adapter.addSignature).toHaveBeenCalledWith(tx, { password: 'secret' })
    expect(adapter.signTransaction).not.toHaveBeenCalled()
  })

  it('does not pass password when adapter does not require one', async () => {
    const tx = { id: 'tx-1' } as any
    mocks.applicationService.sendTransaction.mockResolvedValue({ ok: true })
    const adapter = makeAdapter(ledgerCapabilities, { id: 'signed' })

    await submitWithAdapter({ tx, adapter, password: 'ignored' })

    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: undefined })
  })

  it('returns common.pwdErr when adapter requires password and sign returns null', async () => {
    const tx = { id: 'tx-1' } as any
    const adapter = makeAdapter(commonCapabilities, null)

    await expect(submitWithAdapter({ tx, adapter, password: 'wrong' })).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })

    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('returns cancelled when adapter does not require password and sign returns null', async () => {
    const tx = { id: 'tx-1' } as any
    const adapter = makeAdapter(ledgerCapabilities, null)

    await expect(submitWithAdapter({ tx, adapter })).resolves.toEqual({
      ok: false,
      cancelled: true,
    })

    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('returns network error with default key on a thrown error', async () => {
    const tx = { id: 'tx-1' } as any
    const error = new Error('boom')
    const adapter = makeAdapter(commonCapabilities)
    ;(adapter.signTransaction as any).mockRejectedValue(error)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret' })).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error,
    })
  })

  it('returns network error with custom key when networkErrorKey is provided', async () => {
    const tx = { id: 'tx-1' } as any
    const error = new Error('boom')
    const adapter = makeAdapter(ledgerCapabilities)
    ;(adapter.signTransaction as any).mockRejectedValue(error)

    await expect(
      submitWithAdapter({
        tx,
        adapter,
        networkErrorKey: 'ledgerWallet.signFailed',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'ledgerWallet.signFailed', error })
  })

  it('delegates broadcast to custom submit function when provided', async () => {
    const tx = { id: 'tx-1' } as any
    const signed = { id: 'signed-tx' }
    const customResult = { ok: true as const, delegated: true }
    const submit = vi.fn().mockResolvedValue(customResult)
    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret', submit })).resolves.toEqual(
      customResult
    )

    expect(submit).toHaveBeenCalledWith(signed)
    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('propagates submit failure through the network error catch when submit throws', async () => {
    const tx = { id: 'tx-1' } as any
    const signed = { id: 'signed-tx' }
    const error = new Error('submit-boom')
    const submit = vi.fn().mockRejectedValue(error)
    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret', submit })).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error,
    })
  })

  it('calls logger.error with errorContext when sign throws', async () => {
    const tx = { id: 'tx-1' } as any
    const error = new Error('sign-boom')
    const logger = { error: vi.fn() }
    const adapter = makeAdapter(commonCapabilities)
    ;(adapter.signTransaction as any).mockRejectedValue(error)

    await submitWithAdapter({
      tx,
      adapter,
      password: 'secret',
      logger,
      errorContext: 'submitFoo',
    })

    expect(logger.error).toHaveBeenCalledWith('submitFoo', error)
  })
})
