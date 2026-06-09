import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  applicationService: {
    sendTransaction: vi.fn(),
  },
}))

vi.mock('./transactionDomainService', () => ({
  sendTransaction: (...args: unknown[]) => mocks.applicationService.sendTransaction(...args),
}))

import { buildAndSubmit, submitWithAdapter } from './submitWithAdapter'
import { createFakeTransaction } from '../../shared/chain/__fixtures__/fakeSdk'
import type { SdkTransactionLike } from '../../shared/chain/types'
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
  signResult: SdkTransactionLike | null = makeTx('signed-tx'),
  addSignatureResult: SdkTransactionLike | null = makeTx('co-signed-tx')
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address: 'AQ123',
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn<WalletAdapter['signTransaction']>().mockResolvedValue(signResult),
    addSignature: vi.fn<WalletAdapter['addSignature']>().mockResolvedValue(addSignatureResult),
    signMessage: vi.fn<WalletAdapter['signMessage']>(),
  }
}

function makeTx(id = 'tx-1'): SdkTransactionLike {
  return createFakeTransaction({ id, getHash: vi.fn(() => id) })
}

describe('submitWithAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('signs with adapter.signTransaction by default and broadcasts via sendTransaction', async () => {
    const tx = makeTx()
    const signed = makeTx('signed-tx')
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
    const tx = makeTx()
    const cosigned = makeTx('co-signed-tx')
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
    const tx = makeTx()
    mocks.applicationService.sendTransaction.mockResolvedValue({ ok: true })
    const adapter = makeAdapter(ledgerCapabilities, makeTx('signed'))

    await submitWithAdapter({ tx, adapter, password: 'ignored' })

    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: undefined })
  })

  it('returns common.pwdErr when adapter requires password and sign returns null', async () => {
    const tx = makeTx()
    const adapter = makeAdapter(commonCapabilities, null)

    await expect(submitWithAdapter({ tx, adapter, password: 'wrong' })).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })

    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('returns cancelled when adapter does not require password and sign returns null', async () => {
    const tx = makeTx()
    const adapter = makeAdapter(ledgerCapabilities, null)

    await expect(submitWithAdapter({ tx, adapter })).resolves.toEqual({
      ok: false,
      cancelled: true,
    })

    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('falls back to default networkErrorKey for an unclassifiable thrown error', async () => {
    const tx = makeTx()
    const error = new Error('boom')
    const adapter = makeAdapter(commonCapabilities)
    vi.mocked(adapter.signTransaction).mockRejectedValue(error)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret' })).resolves.toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'unknown',
      error,
    })
  })

  it('uses the caller-provided fallback key for unclassifiable errors', async () => {
    const tx = makeTx()
    const error = new Error('boom')
    const adapter = makeAdapter(ledgerCapabilities)
    vi.mocked(adapter.signTransaction).mockRejectedValue(error)

    await expect(
      submitWithAdapter({
        tx,
        adapter,
        networkErrorKey: 'ledgerWallet.signFailed',
      })
    ).resolves.toMatchObject({
      ok: false,
      errorKey: 'ledgerWallet.signFailed',
      category: 'unknown',
      error,
    })
  })

  it('delegates broadcast to custom submit function when provided', async () => {
    const tx = makeTx()
    const signed = makeTx('signed-tx')
    const customResult = { ok: true as const, delegated: true }
    const submit = vi.fn(async () => customResult)
    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(submitWithAdapter({ tx, adapter, password: 'secret', submit })).resolves.toEqual(
      customResult
    )

    expect(submit).toHaveBeenCalledWith(signed)
    expect(mocks.applicationService.sendTransaction).not.toHaveBeenCalled()
  })

  it('propagates submit failure through the network error catch when submit throws', async () => {
    const tx = makeTx()
    const signed = makeTx('signed-tx')
    const error = new Error('submit-boom')
    const submit = vi.fn(async () => {
      throw error
    })
    const adapter = makeAdapter(commonCapabilities, signed)

    await expect(
      submitWithAdapter({ tx, adapter, password: 'secret', submit })
    ).resolves.toMatchObject({
      ok: false,
      errorKey: 'common.networkErr',
      category: 'unknown',
      error,
    })
  })

  it('calls logger.error with errorContext when sign throws', async () => {
    const tx = makeTx()
    const error = new Error('sign-boom')
    const logger = { error: vi.fn() }
    const adapter = makeAdapter(commonCapabilities)
    vi.mocked(adapter.signTransaction).mockRejectedValue(error)

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

describe('buildAndSubmit', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds the tx then submits it through the adapter', async () => {
    const signed = makeTx('signed-tx')
    const sendResult = { ok: true, response: {}, txHash: 'hash-1' }
    mocks.applicationService.sendTransaction.mockResolvedValue(sendResult)
    const adapter = makeAdapter(commonCapabilities, signed)
    const built = makeTx('built-tx')

    await expect(
      buildAndSubmit({ adapter, password: 'secret', build: async () => built })
    ).resolves.toEqual(sendResult)

    expect(adapter.signTransaction).toHaveBeenCalledWith(built, { password: 'secret' })
    expect(mocks.applicationService.sendTransaction).toHaveBeenCalledWith(signed)
  })

  it('maps a build failure to the default network error key', async () => {
    const error = new Error('build failed')
    const adapter = makeAdapter()

    await expect(
      buildAndSubmit({
        adapter,
        build: async () => {
          throw error
        },
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.networkErr', error })
    expect(adapter.signTransaction).not.toHaveBeenCalled()
  })

  it('honours a custom networkErrorKey on build failure', async () => {
    const error = new Error('build failed')

    await expect(
      buildAndSubmit({
        adapter: makeAdapter(),
        networkErrorKey: 'custom.buildErr',
        build: async () => {
          throw error
        },
      })
    ).resolves.toEqual({ ok: false, errorKey: 'custom.buildErr', error })
  })
})
