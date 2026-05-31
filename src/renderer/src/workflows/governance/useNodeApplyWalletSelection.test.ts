import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  validateNodeApplyOperationWallet: vi.fn(),
  notifyWarning: vi.fn(),
}))

vi.mock('../../modules/governance/application/nodeStake/nodeApplyApplicationService', () => ({
  validateNodeApplyOperationWallet: (...args: unknown[]) =>
    mocks.validateNodeApplyOperationWallet(...args),
}))

vi.mock('../../shared/ui/feedback', () => ({
  notifyWarning: (...args: unknown[]) => mocks.notifyWarning(...args),
}))

import { toNodeApplyWallet, useNodeApplyWalletSelection } from './useNodeApplyWalletSelection'

describe('useNodeApplyWalletSelection', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.validateNodeApplyOperationWallet.mockResolvedValue({ ok: true, address: 'AQ-operation' })
  })

  it('maps common and ledger wallet selections into node-apply wallet state', () => {
    expect(
      toNodeApplyWallet({
        walletType: 'commonWallet',
        wallet: { address: 'AQ-common', label: 'Common', key: 'encrypted' },
      })
    ).toMatchObject({ address: 'AQ-common', label: 'Common', key: 'encrypted' })

    expect(
      toNodeApplyWallet({
        walletType: 'ledgerWallet',
        wallet: { address: 'AQ-ledger', label: 'Ledger', publicKey: 'ledger-pk', acct: 2, neo: 1 },
      })
    ).toMatchObject({ address: 'AQ-ledger', label: 'Ledger', publicKey: 'ledger-pk', acct: 2 })
  })

  it('builds stake and operation wallet options while excluding the selected stake wallet', () => {
    const selection = useNodeApplyWalletSelection({
      normalWallets: [
        { address: 'AQ-stake', label: 'Stake', publicKey: 'stake-pk' },
        { address: 'AQ-operation', label: 'Operation', publicKey: 'operation-pk' },
      ],
      hardwareWallets: [
        { address: 'AQ-ledger', label: 'Ledger', publicKey: 'ledger-pk', timestamp: 10, acct: 1 },
      ],
    })

    selection.onWalletSelected({
      walletType: 'commonWallet',
      wallet: { address: 'AQ-stake', label: 'Stake', publicKey: 'stake-pk' },
    })

    expect(selection.stakeWalletValue.value).toBe('AQ-stake')
    expect(selection.walletType.value).toBe('commonWallet')
    expect(selection.stakeWalletOptions.value.map((wallet) => wallet.address)).toEqual([
      'AQ-stake',
      'AQ-operation',
      'AQ-ledger',
    ])
    expect(selection.normalWalletAndLedgerWallet.value.map((wallet) => wallet.address)).toEqual([
      'AQ-operation',
      'AQ-ledger',
    ])
  })

  it('clears an invalid operation wallet and warns the user', async () => {
    mocks.validateNodeApplyOperationWallet.mockResolvedValueOnce({
      ok: false,
      errorKey: 'nodeApply.sameWalletNotAllowed',
    })
    const selection = useNodeApplyWalletSelection({
      normalWallets: [{ address: 'AQ-stake', label: 'Stake', publicKey: 'stake-pk' }],
      hardwareWallets: [],
    })
    selection.onWalletSelected({
      walletType: 'commonWallet',
      wallet: { address: 'AQ-stake', label: 'Stake', publicKey: 'stake-pk' },
    })
    selection.operationWallet.value = 'operation-pk'

    await selection.onSelectOperationWallet()

    expect(mocks.validateNodeApplyOperationWallet).toHaveBeenCalledWith({
      stakeWalletAddress: 'AQ-stake',
      operationWalletPublicKey: 'operation-pk',
    })
    expect(selection.operationWallet.value).toBeUndefined()
    expect(mocks.notifyWarning).toHaveBeenCalledWith('nodeApply.sameWalletNotAllowed')
  })
})
