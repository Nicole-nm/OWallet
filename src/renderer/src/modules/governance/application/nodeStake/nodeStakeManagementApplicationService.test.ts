import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  governanceService: {
    createAddInitPosTransaction: vi.fn(),
    createChangeAuthorizationTransaction: vi.fn(),
    createQuitNodeTransaction: vi.fn(),
    createReduceInitPosTransaction: vi.fn(),
    createSetFeePercentageTransaction: vi.fn(),
    createUnregisterCandidateTransaction: vi.fn(),
    createWithdrawAuthorizationTransaction: vi.fn(),
    createWithdrawFeeTransaction: vi.fn(),
    createWithdrawPeerUnboundOngTransaction: vi.fn(),
  },
  nodeStakeService: {
    createDelegatedStakeTransactionBody: vi.fn(),
    submitDelegatedStakeTransaction: vi.fn(),
  },
  transactionService: {
    sendTransaction: vi.fn(),
  },
  authorizationService: {
    refreshAuthorizationNodeSettings: vi.fn(),
    refreshAuthorizationStakeInfo: vi.fn(),
  },
  nodeStakeApplicationService: {
    loadStakeDetail: vi.fn(),
  },
}))

vi.mock('../../../../domains/governance/governanceDomainService', () => ({
  createAddInitPosTransaction: (...args: any[]) =>
    mocks.governanceService.createAddInitPosTransaction(...args),
  createChangeAuthorizationTransaction: (...args: any[]) =>
    mocks.governanceService.createChangeAuthorizationTransaction(...args),
  createQuitNodeTransaction: (...args: any[]) =>
    mocks.governanceService.createQuitNodeTransaction(...args),
  createReduceInitPosTransaction: (...args: any[]) =>
    mocks.governanceService.createReduceInitPosTransaction(...args),
  createSetFeePercentageTransaction: (...args: any[]) =>
    mocks.governanceService.createSetFeePercentageTransaction(...args),
  createUnregisterCandidateTransaction: (...args: any[]) =>
    mocks.governanceService.createUnregisterCandidateTransaction(...args),
  createWithdrawAuthorizationTransaction: (...args: any[]) =>
    mocks.governanceService.createWithdrawAuthorizationTransaction(...args),
  createWithdrawFeeTransaction: (...args: any[]) =>
    mocks.governanceService.createWithdrawFeeTransaction(...args),
  createWithdrawPeerUnboundOngTransaction: (...args: any[]) =>
    mocks.governanceService.createWithdrawPeerUnboundOngTransaction(...args),
}))

vi.mock('../../../../domains/governance/nodeStakeDomainService', () => ({
  createDelegatedStakeTransactionBody: (...args: any[]) =>
    mocks.nodeStakeService.createDelegatedStakeTransactionBody(...args),
  submitDelegatedStakeTransaction: (...args: any[]) =>
    mocks.nodeStakeService.submitDelegatedStakeTransaction(...args),
}))

vi.mock('../../../../domains/transaction/transactionDomainService', () => ({
  sendTransaction: (...args: any[]) => mocks.transactionService.sendTransaction(...args),
}))

vi.mock('../authorization/authorizationQueryApplicationService', () => ({
  refreshAuthorizationNodeSettings: (...args: any[]) =>
    mocks.authorizationService.refreshAuthorizationNodeSettings(...args),
  refreshAuthorizationStakeInfo: (...args: any[]) =>
    mocks.authorizationService.refreshAuthorizationStakeInfo(...args),
}))

vi.mock('./nodeStakeApplicationService', () => ({
  loadStakeDetail: (...args: any[]) => mocks.nodeStakeApplicationService.loadStakeDetail(...args),
}))

import {
  createChangeStakeAuthorizationTransaction,
  createNodeRefundTransaction,
  createStakeRewardsRedeemTransaction,
  createStakeUnboundOngRedeemTransaction,
  refreshNodeStakeAuthorizationDetails,
  refreshNodeStakeManagementDetails,
  submitSignedNodeStakeManagementTransaction,
  validateReduceInitPosAmount,
  validateStakeAuthorizationUnit,
} from './nodeStakeManagementApplicationService'
import type { WalletAdapter, WalletCapabilities } from '../../../../domains/wallet/adapter'

function makeAdapter(
  capabilities: WalletCapabilities,
  signTxResult: unknown | null = 'signed-tx',
  shouldThrow = false
): WalletAdapter {
  return {
    identity: {
      type: capabilities.requiresPassword ? 'common' : 'ledger',
      address: 'AQ123',
      publicKey: 'pk',
      label: 'L',
    },
    capabilities,
    signTransaction: vi.fn(() =>
      shouldThrow ? Promise.reject(new Error('sign fail')) : Promise.resolve(signTxResult)
    ),
    signMessage: vi.fn(),
    addSignature: vi.fn(),
  } as WalletAdapter
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

describe('nodeStakeManagementApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('refreshes node stake detail and authorization state together', async () => {
    mocks.nodeStakeApplicationService.loadStakeDetail.mockResolvedValue({
      ok: true,
      detail: { status: 8, publicKey: 'pk-1' },
      stakeStatus: { status1: 'step-1', status2: 'step-2', status3: 'step-3', current: 2 },
    })
    mocks.authorizationService.refreshAuthorizationStakeInfo.mockResolvedValue({
      ok: true,
      currentPeer: { peerPubkey: 'pk-1' },
      posLimit: 10,
      authorizationInfo: { claimableVal: 0 },
    })

    await expect(
      refreshNodeStakeManagementDetails({
        network: 'TEST_NET',
        stakeWalletAddress: 'AQ123',
        nodePublicKey: 'pk-1',
      })
    ).resolves.toEqual({
      ok: true,
      detail: { status: 8, publicKey: 'pk-1' },
      stakeStatus: { status1: 'step-1', status2: 'step-2', status3: 'step-3', current: 2 },
      currentPeer: { peerPubkey: 'pk-1' },
      posLimit: 10,
      authorizationInfo: { claimableVal: 0 },
    })
  })

  it('validates reduce-init-pos constraints against commitment and delegated stake totals', () => {
    expect(
      validateReduceInitPosAmount({
        amount: '10',
        currentPeer: { totalPos: 0, initPos: 100 },
        detail: { commitmentQuantity: 95 },
        posLimit: 10,
      })
    ).toEqual({ ok: false, errorKey: 'nodeMgmt.notThanCommitment' })

    expect(
      validateReduceInitPosAmount({
        amount: '20',
        currentPeer: { totalPos: 900, initPos: 100 },
        detail: { commitmentQuantity: 10 },
        posLimit: 10,
      })
    ).toEqual({ ok: false, errorKey: 'nodeMgmt.notLessTotalPos' })
  })

  it('returns a warning when refunding without claimable authorization', async () => {
    await expect(
      createNodeRefundTransaction({
        stakeWalletAddress: 'AQ123',
        nodePublicKey: 'pk-1',
        claimableAmount: 0,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.noClaimbleToRefund',
    })
  })

  it('validates allowed stake units and avoids no-op authorization changes', async () => {
    expect(
      validateStakeAuthorizationUnit({
        unit: '11',
        unitVal: 1,
        currentPeer: { initPos: 10 },
        posLimit: 1,
      })
    ).toEqual({ ok: false, errorKey: 'nodeMgmt.notThanMax' })

    await expect(
      createChangeStakeAuthorizationTransaction({
        stakeDetail: { publicKey: 'pk-1' },
        stakeWalletAddress: 'AQ123',
        unit: '10',
        unitVal: 1,
        currentMaxAuthorize: 10,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'nodeMgmt.noChange',
    })
  })

  it('delegates signed node stake transactions when requested', async () => {
    mocks.nodeStakeService.createDelegatedStakeTransactionBody.mockReturnValue({ tx: 'body' })
    mocks.nodeStakeService.submitDelegatedStakeTransaction.mockResolvedValue(undefined)

    await expect(
      submitSignedNodeStakeManagementTransaction({
        tx: 'tx',
        adapter: makeAdapter(commonCapabilities, 'signed-tx'),
        password: 'secret',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        nodePublicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        delegate: true,
      })
    ).resolves.toEqual({
      ok: true,
      delegated: true,
    })
  })

  it('maps missing common-wallet signatures to a password error', async () => {
    await expect(
      submitSignedNodeStakeManagementTransaction({
        tx: 'tx',
        adapter: makeAdapter(commonCapabilities, null),
        password: 'wrong-password',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        nodePublicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        delegate: true,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.pwdErr',
    })
  })

  it('blocks ledger submission when no device is connected and refreshes authorization settings by node detail', async () => {
    await expect(
      submitSignedNodeStakeManagementTransaction({
        tx: 'tx',
        adapter: makeAdapter(ledgerCapabilities),
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        nodePublicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
        delegate: false,
        ledgerConnected: false,
      })
    ).resolves.toEqual({
      ok: false,
      level: 'warning',
      errorKey: 'ledgerWallet.connectApp',
    })

    mocks.authorizationService.refreshAuthorizationNodeSettings.mockResolvedValue({
      ok: true,
      currentPeer: { peerPubkey: 'pk-1' },
      peerAttributes: { maxAuthorize: 10 },
      splitFee: { address: 'AQ123', amount: 1 },
      posLimit: 10,
      peerUnboundOng: 2,
    })

    await expect(
      refreshNodeStakeAuthorizationDetails({
        stakeDetail: { public_key: 'pk-1' },
        stakeWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({
      ok: true,
      currentPeer: { peerPubkey: 'pk-1' },
      peerAttributes: { maxAuthorize: 10 },
      splitFee: { address: 'AQ123', amount: 1 },
      posLimit: 10,
      peerUnboundOng: 2,
    })
  })

  it('requires a password for common wallets before submitting', async () => {
    await expect(
      submitSignedNodeStakeManagementTransaction({
        tx: 'tx',
        adapter: makeAdapter(commonCapabilities),
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        nodePublicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'nodeStake.passwordEmpty' })
  })

  it('fails fast when there is no transaction to submit', async () => {
    await expect(
      submitSignedNodeStakeManagementTransaction({
        tx: null,
        adapter: makeAdapter(commonCapabilities),
        password: 'secret',
        network: 'TEST_NET',
        ontid: 'did:ont:1',
        nodePublicKey: 'pk-1',
        stakeWalletAddress: 'AQ123',
      })
    ).resolves.toEqual({ ok: false, errorKey: 'common.txFailed' })
  })

  it('warns and builds stake reward redemption transactions', async () => {
    await expect(
      createStakeRewardsRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 0 })
    ).resolves.toEqual({ ok: false, level: 'warning', errorKey: 'nodeMgmt.noRewards' })

    mocks.governanceService.createWithdrawFeeTransaction.mockResolvedValue('fee-tx')
    await expect(
      createStakeRewardsRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 5 })
    ).resolves.toEqual({ ok: true, tx: 'fee-tx' })
    expect(mocks.governanceService.createWithdrawFeeTransaction).toHaveBeenCalledWith({
      stakeWalletAddress: 'AQ123',
    })
  })

  it('warns and builds unbound ONG redemption transactions', async () => {
    await expect(
      createStakeUnboundOngRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 0 })
    ).resolves.toEqual({ ok: false, level: 'warning', errorKey: 'nodeMgmt.noUnboundOng' })

    mocks.governanceService.createWithdrawPeerUnboundOngTransaction.mockResolvedValue('ong-tx')
    await expect(
      createStakeUnboundOngRedeemTransaction({ stakeWalletAddress: 'AQ123', amount: 3 })
    ).resolves.toEqual({ ok: true, tx: 'ong-tx' })
  })
})
