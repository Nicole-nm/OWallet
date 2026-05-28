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
    addSignerSignature: vi.fn(),
    applyPrivateKeyTransactionSignature: vi.fn(),
    decryptWalletPrivateKey: vi.fn(),
  },
  nodeStakeApplicationService: {
    loadStakeDetail: vi.fn(),
  },
}))

vi.mock('../../../domains/nodeStake/applicationService', () => ({
  createDelegatedStakeTransactionBody: (...args: any[]) =>
    mocks.nodeStakeService.createDelegatedStakeTransactionBody(...args),
  createNodeStakeRegistrationTransaction: (...args: any[]) =>
    mocks.nodeStakeService.createNodeStakeRegistrationTransaction(...args),
  fetchQualifiedState: (...args: any[]) => mocks.nodeStakeService.fetchQualifiedState(...args),
  saveStakeInfo: (...args: any[]) => mocks.nodeStakeService.saveStakeInfo(...args),
  submitDelegatedStakeTransaction: (...args: any[]) =>
    mocks.nodeStakeService.submitDelegatedStakeTransaction(...args),
}))

vi.mock('../../../domains/transaction/applicationService', () => ({
  addSignerSignature: (...args: any[]) => mocks.transactionService.addSignerSignature(...args),
  applyPrivateKeyTransactionSignature: (...args: any[]) =>
    mocks.transactionService.applyPrivateKeyTransactionSignature(...args),
  decryptWalletPrivateKey: (...args: any[]) =>
    mocks.transactionService.decryptWalletPrivateKey(...args),
}))

vi.mock('./nodeStakeApplicationService', () => ({
  loadStakeDetail: (...args: any[]) => mocks.nodeStakeApplicationService.loadStakeDetail(...args),
}))

import {
  createNodeStakeRegistrationDraft,
  ensureNodeStakeQualification,
  loadNodeStakeRegistrationDetail,
  signNodeStakeRegistrationOntid,
  submitNodeStakeRegistration,
} from './nodeStakeOnboardingApplicationService'
import type { CommonWallet, Identity } from '../../../shared/lib/types'

function makeStakeIdentity(overrides: Partial<Identity> = {}): Identity {
  return {
    ontid: 'did:ont:1',
    label: 'Stake Identity',
    controls: [{ key: 'enc', address: 'AQ123', salt: 'salt' }],
    ...overrides,
  }
}

function makeStakeWallet(overrides: Partial<CommonWallet> = {}): CommonWallet {
  return {
    address: 'AQ123',
    key: 'enc',
    label: 'Stake Wallet',
    publicKey: 'pk',
    salt: 'salt',
    algorithm: 'aes-256-gcm',
    parameters: { curve: 'p256' },
    scrypt: {},
    ...overrides,
  }
}

describe('nodeStakeOnboardingApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('maps qualification states to domain-friendly errors', async () => {
    mocks.nodeStakeService.fetchQualifiedState.mockResolvedValueOnce({ QualifiedState: 1 })
    await expect(
      ensureNodeStakeQualification({
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        stakeWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.invalidOntid' })

    mocks.nodeStakeService.fetchQualifiedState.mockResolvedValueOnce({ QualifiedState: 2 })
    await expect(
      ensureNodeStakeQualification({
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        stakeWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.invalidAddress' })
  })

  it('loads registration detail through the node stake application service', async () => {
    mocks.nodeStakeApplicationService.loadStakeDetail.mockResolvedValue({
      ok: true,
      detail: {} as Record<string, any>,
    })

    await expect(
      loadNodeStakeRegistrationDetail({
        network: 'TEST_NET',
        ontid: 'did:ont:1',
      })
    ).resolves.toEqual({ ok: true, detail: {} as Record<string, any> })
  })

  it('validates registration draft input and creates a registration transaction', async () => {
    await expect(
      createNodeStakeRegistrationDraft({
        stakeQuantity: '0.5',
        stakeDetail: { ontid: 'did:ont:1', publicKey: 'pk-1', stakeWalletAddress: 'AQ123' },
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.stakeQuantityEmpty' })

    mocks.nodeStakeService.createNodeStakeRegistrationTransaction.mockResolvedValue('tx')

    await expect(
      createNodeStakeRegistrationDraft({
        stakeQuantity: '10',
        stakeDetail: {
          ontid: 'did:ont:1',
          publicKey: 'pk-1',
          stakeWalletAddress: 'AQ123',
        },
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })

  it('signs a registration transaction with ontid credentials and maps decrypt failures to password errors', async () => {
    await expect(
      signNodeStakeRegistrationOntid({
        tx: 'tx',
        stakeIdentity: makeStakeIdentity(),
        password: '',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.passwordEmpty' })

    mocks.transactionService.decryptWalletPrivateKey.mockResolvedValueOnce(null)

    await expect(
      signNodeStakeRegistrationOntid({
        tx: 'tx',
        stakeIdentity: makeStakeIdentity(),
        password: 'secret',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.pwdErr' })

    mocks.transactionService.decryptWalletPrivateKey.mockResolvedValueOnce('private-key')
    mocks.transactionService.applyPrivateKeyTransactionSignature.mockResolvedValue(undefined)

    await expect(
      signNodeStakeRegistrationOntid({
        tx: 'tx',
        stakeIdentity: makeStakeIdentity(),
        password: 'secret',
      })
    ).resolves.toEqual({ ok: true, tx: 'tx' })
  })

  it('blocks ledger registration submission when the device is unavailable', async () => {
    await expect(
      submitNodeStakeRegistration({
        tx: 'tx',
        stakeWallet: undefined,
        ledgerWallet: undefined,
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        publicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        stakeQuantity: '10',
        ledgerConnected: false,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })
  })

  it('delegates a signed registration and reports persistence errors separately', async () => {
    mocks.transactionService.addSignerSignature.mockResolvedValue('signed-tx')
    mocks.nodeStakeService.createDelegatedStakeTransactionBody.mockReturnValue({ tx: 'body' })
    mocks.nodeStakeService.submitDelegatedStakeTransaction.mockResolvedValue(undefined)
    mocks.nodeStakeService.saveStakeInfo.mockRejectedValue(new Error('save failed'))

    await expect(
      submitNodeStakeRegistration({
        tx: 'tx',
        stakeWallet: makeStakeWallet(),
        password: 'secret',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        publicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        stakeQuantity: '10',
      })
    ).resolves.toEqual({
      ok: true,
      persisted: false,
      persistErrorKey: 'common.networkErr',
      error: expect.any(Error),
    })
  })

  it('maps missing common-wallet signatures to a password error during registration submission', async () => {
    mocks.transactionService.addSignerSignature.mockResolvedValue(null)

    await expect(
      submitNodeStakeRegistration({
        tx: 'tx',
        stakeWallet: makeStakeWallet(),
        password: 'wrong-password',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        publicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        stakeQuantity: '10',
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
  })

  it('returns a transaction failure when delegated registration submission fails', async () => {
    mocks.transactionService.addSignerSignature.mockResolvedValue('signed-tx')
    mocks.nodeStakeService.createDelegatedStakeTransactionBody.mockReturnValue({ tx: 'body' })
    mocks.nodeStakeService.submitDelegatedStakeTransaction.mockRejectedValue(
      new Error('delegate failed')
    )

    await expect(
      submitNodeStakeRegistration({
        tx: 'tx',
        stakeWallet: makeStakeWallet(),
        password: 'secret',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        publicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        stakeQuantity: '10',
      })
    ).resolves.toEqual({
      ok: false,
      stage: 'submit',
      errorKey: 'nodeStake.txFailed',
      error: expect.any(Error),
    })
  })
})
