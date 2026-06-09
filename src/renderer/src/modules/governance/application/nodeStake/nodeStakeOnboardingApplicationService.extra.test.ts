import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  nodeStakeService: {
    createDelegatedStakeTransactionBody: vi.fn(),
    createNodeStakeRegistrationTransaction: vi.fn(),
    fetchQualifiedState: vi.fn(),
    saveStakeInfo: vi.fn(),
    submitDelegatedStakeTransaction: vi.fn(),
  },
  transactionService: {
    applyPrivateKeyTransactionSignature: vi.fn(),
    decryptWalletPrivateKey: vi.fn(),
  },
  nodeStakeApplicationService: { loadStakeDetail: vi.fn() },
}))

vi.mock('../../../../domains/governance/nodeStakeDomainService', () => ({
  createDelegatedStakeTransactionBody: (...a: unknown[]) =>
    mocks.nodeStakeService.createDelegatedStakeTransactionBody(...a),
  createNodeStakeRegistrationTransaction: (...a: unknown[]) =>
    mocks.nodeStakeService.createNodeStakeRegistrationTransaction(...a),
  fetchQualifiedState: (...a: unknown[]) => mocks.nodeStakeService.fetchQualifiedState(...a),
  saveStakeInfo: (...a: unknown[]) => mocks.nodeStakeService.saveStakeInfo(...a),
  submitDelegatedStakeTransaction: (...a: unknown[]) =>
    mocks.nodeStakeService.submitDelegatedStakeTransaction(...a),
}))

vi.mock('../../../../domains/transaction/transactionDomainService', () => ({
  applyPrivateKeyTransactionSignature: (...a: unknown[]) =>
    mocks.transactionService.applyPrivateKeyTransactionSignature(...a),
  decryptWalletPrivateKey: (...a: unknown[]) =>
    mocks.transactionService.decryptWalletPrivateKey(...a),
}))

vi.mock('./nodeStakeApplicationService', () => ({
  loadStakeDetail: (...a: unknown[]) => mocks.nodeStakeApplicationService.loadStakeDetail(...a),
}))

import {
  ensureNodeStakeQualification,
  signNodeStakeRegistrationOntid,
  submitNodeStakeRegistration,
} from './nodeStakeOnboardingApplicationService'
import type { WalletAdapter, WalletCapabilities } from '../../../../domains/wallet/adapter'

const ledgerCapabilities: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

function makeLedgerAdapter(signedTx: unknown, address = 'AQledger'): WalletAdapter {
  return {
    identity: { type: 'ledger', address, publicKey: 'pk', label: 'L' },
    capabilities: ledgerCapabilities,
    signTransaction: vi.fn(),
    signMessage: vi.fn(),
    addSignature: vi.fn().mockResolvedValue(signedTx),
  } as WalletAdapter
}

const submitParams = {
  network: 'net' as never,
  ontid: 'did:ont:1',
  publicKey: 'pk',
  stakeWalletAddress: 'AQstake',
  stakeQuantity: 10,
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('ensureNodeStakeQualification states', () => {
  it('rejects an invalid ontid qualification state', async () => {
    mocks.nodeStakeService.fetchQualifiedState.mockResolvedValue({ QualifiedState: 1 })
    await expect(
      ensureNodeStakeQualification({ network: 'net' as never, ontid: 'x', stakeWalletAddress: 'a' })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.invalidOntid' })
  })

  it('rejects an invalid address qualification state', async () => {
    mocks.nodeStakeService.fetchQualifiedState.mockResolvedValue({ QualifiedState: 2 })
    await expect(
      ensureNodeStakeQualification({ network: 'net' as never, ontid: 'x', stakeWalletAddress: 'a' })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.invalidAddress' })
  })
})

describe('signNodeStakeRegistrationOntid identity guard', () => {
  it('rejects when the identity control is incomplete', async () => {
    const result = await signNodeStakeRegistrationOntid({
      tx: { id: 'tx' },
      password: 'pwd',
      stakeIdentity: { ontid: 'x', label: 'l', controls: [{ key: 'k', address: 'a' }] } as never,
    })
    expect(result).toEqual({ ok: false, errorKey: 'common.networkErr' })
  })
})

describe('submitNodeStakeRegistration ledger branches', () => {
  it('reports cancellation when a ledger device returns no signature', async () => {
    const result = await submitNodeStakeRegistration({
      ...submitParams,
      tx: { id: 'tx' },
      adapter: makeLedgerAdapter(null),
      ledgerConnected: true,
    })
    expect(result).toEqual({ ok: false, cancelled: true })
  })

  it('flags the submit stage when delegation fails', async () => {
    mocks.nodeStakeService.createDelegatedStakeTransactionBody.mockReturnValue({ body: true })
    mocks.nodeStakeService.submitDelegatedStakeTransaction.mockRejectedValue(new Error('boom'))
    const result = await submitNodeStakeRegistration({
      ...submitParams,
      tx: { id: 'tx' },
      adapter: makeLedgerAdapter('signed'),
      ledgerConnected: true,
    })
    expect(result).toMatchObject({ ok: false, stage: 'submit', errorKey: 'nodeStake.txFailed' })
  })

  it('returns persisted=false when saving stake info fails', async () => {
    mocks.nodeStakeService.createDelegatedStakeTransactionBody.mockReturnValue({ body: true })
    mocks.nodeStakeService.submitDelegatedStakeTransaction.mockResolvedValue(undefined)
    mocks.nodeStakeService.saveStakeInfo.mockRejectedValue(new Error('save failed'))
    const result = await submitNodeStakeRegistration({
      ...submitParams,
      tx: { id: 'tx' },
      adapter: makeLedgerAdapter('signed'),
      ledgerConnected: true,
    })
    expect(result).toMatchObject({ ok: true, persisted: false })
  })
})
