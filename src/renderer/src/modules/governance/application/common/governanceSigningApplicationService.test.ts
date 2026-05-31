import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  transactionService: {
    sendTransaction: vi.fn(),
  },
}))

vi.mock('../../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: unknown[]) => mocks.transactionService.sendTransaction(...args),
}))

import {
  signGovernancePayload,
  submitGovernanceSignedTransaction,
} from './governanceSigningApplicationService'
import type { WalletAdapter } from '../../../wallet/application/adapter/WalletAdapterFactory'
import type { WalletCapabilities } from '../../../../domains/wallet/adapter'
import { createFakeTransaction } from '../../../../shared/chain/__fixtures__/fakeSdk'

function makeTx(hash: string) {
  return createFakeTransaction({ hash, getHash: vi.fn(() => hash) })
}

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

function fakeAdapter(
  capabilities: WalletCapabilities,
  overrides: Partial<WalletAdapter> = {}
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address: 'AQ1',
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    addSignature: vi.fn(),
    ...overrides,
  } as WalletAdapter
}

describe('governanceSigningApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('requires a password for software wallet signing', async () => {
    await expect(
      signGovernancePayload({
        payload: 'payload',
        adapter: fakeAdapter(commonCapabilities),
        password: '',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'nodeStake.passwordEmpty',
    })
  })

  it('maps software-wallet signing without a signature to a password error', async () => {
    const adapter = fakeAdapter(commonCapabilities, {
      signMessage: vi.fn().mockResolvedValue(null),
    })

    await expect(
      signGovernancePayload({
        payload: 'payload',
        adapter,
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
  })

  it('blocks ledger signing when the device is disconnected', async () => {
    await expect(
      signGovernancePayload({
        payload: 'payload',
        adapter: fakeAdapter(ledgerCapabilities),
        ledgerConnected: false,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })
  })

  it('maps ledger signing throws to ledgerWallet.signFailed', async () => {
    const adapter = fakeAdapter(ledgerCapabilities, {
      signMessage: vi.fn().mockRejectedValue(new Error('ledger failed')),
    })

    await expect(
      signGovernancePayload({
        payload: 'payload',
        adapter,
        ledgerConnected: true,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'ledgerWallet.signFailed',
      error: expect.any(Error),
    })
  })

  it('maps ledger transaction signing without a signature to ledgerWallet.signFailed', async () => {
    const adapter = fakeAdapter(ledgerCapabilities, {
      signTransaction: vi.fn().mockResolvedValue(null),
    })

    await expect(
      signGovernancePayload({
        payload: makeTx('ledger-tx') as never,
        adapter,
        ledgerConnected: true,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'ledgerWallet.signFailed',
    })
  })

  it('maps software-wallet transaction signing throws to a network error', async () => {
    const error = new Error('sdk failed')
    const adapter = fakeAdapter(commonCapabilities, {
      signTransaction: vi.fn().mockRejectedValue(error),
    })

    await expect(
      signGovernancePayload({
        payload: makeTx('common-tx') as never,
        adapter,
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error,
    })
  })

  it('returns a signed payload when wallet message signing succeeds', async () => {
    const adapter = fakeAdapter(commonCapabilities, {
      signMessage: vi.fn().mockResolvedValue('signed'),
    })

    await expect(
      signGovernancePayload({
        payload: 'payload',
        adapter,
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: true,
      signedPayload: 'signed',
    })
  })

  it('routes transaction payloads to signTransaction on the adapter', async () => {
    const tx = makeTx('tx')
    const signed = makeTx('signed-tx')
    const adapter = fakeAdapter(commonCapabilities, {
      signTransaction: vi.fn().mockResolvedValue(signed),
    })

    await expect(
      signGovernancePayload({
        payload: tx as never,
        adapter,
        password: 'secret',
      })
    ).resolves.toEqual({
      ok: true,
      signedPayload: signed,
    })
    expect(adapter.signTransaction).toHaveBeenCalledWith(tx, { password: 'secret' })
  })

  it('passes through transaction submission results and wraps thrown send failures', async () => {
    mocks.transactionService.sendTransaction.mockResolvedValue({ ok: true, txHash: 'hash' })

    await expect(
      submitGovernanceSignedTransaction({
        tx: makeTx('tx') as never,
      })
    ).resolves.toEqual({
      ok: true,
      txHash: 'hash',
    })

    mocks.transactionService.sendTransaction.mockRejectedValue(new Error('network failed'))

    await expect(
      submitGovernanceSignedTransaction({
        tx: makeTx('tx') as never,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      error: expect.any(Error),
    })
  })
})
