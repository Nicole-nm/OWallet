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

  it('toNodeApplyWallet returns null when the address is missing', () => {
    expect(
      toNodeApplyWallet({
        walletType: 'commonWallet',
        wallet: { label: 'no-address' },
      })
    ).toBeNull()
  })

  it('toNodeApplyWallet falls back to empty strings for missing label/publicKey on ledger wallets', () => {
    expect(
      toNodeApplyWallet({
        walletType: 'ledgerWallet',
        wallet: { address: 'AQ-ledger' },
      })
    ).toMatchObject({ address: 'AQ-ledger', label: '', publicKey: '' })
  })

  it('getNodePublicKey returns operationPk when operationWallet is empty', () => {
    const selection = useNodeApplyWalletSelection({
      normalWallets: [],
      hardwareWallets: [],
    })

    selection.operationPk.value = 'fallback-pk'
    expect(selection.getNodePublicKey()).toBe('fallback-pk')

    selection.operationWallet.value = 'primary-pk'
    expect(selection.getNodePublicKey()).toBe('primary-pk')
  })

  it('onSelectOperationWallet exits early when stake wallet or operation pk is missing', async () => {
    const selection = useNodeApplyWalletSelection({
      normalWallets: [],
      hardwareWallets: [],
    })

    await selection.onSelectOperationWallet()
    expect(mocks.validateNodeApplyOperationWallet).not.toHaveBeenCalled()
  })

  it('onWalletSelected exits early when the selection has no address', () => {
    const selection = useNodeApplyWalletSelection({
      normalWallets: [],
      hardwareWallets: [],
    })
    selection.onWalletSelected({
      walletType: 'commonWallet',
      wallet: { label: 'no-address' },
    })
    expect(selection.stakeWalletValue.value).toBeUndefined()
  })

  it('orders ledger wallets in normalWalletAndLedgerWallet by timestamp then acct', () => {
    const selection = useNodeApplyWalletSelection({
      normalWallets: [],
      hardwareWallets: [
        { address: 'AQ-l1', publicKey: 'pk1', timestamp: 5, acct: 1 },
        { address: 'AQ-l2', publicKey: 'pk2', timestamp: 10, acct: 1 },
        { address: 'AQ-l3', publicKey: 'pk3', timestamp: 10, acct: 5 },
      ],
    })

    expect(selection.normalWalletAndLedgerWallet.value.map((wallet) => wallet.address)).toEqual([
      'AQ-l3',
      'AQ-l2',
      'AQ-l1',
    ])
  })

  it('falls back to common networkErr key when the validation result has no errorKey', async () => {
    mocks.validateNodeApplyOperationWallet.mockResolvedValueOnce({ ok: false })
    const selection = useNodeApplyWalletSelection({
      normalWallets: [{ address: 'AQ-stake', publicKey: 'stake-pk' }],
      hardwareWallets: [],
    })
    selection.onWalletSelected({
      walletType: 'commonWallet',
      wallet: { address: 'AQ-stake', publicKey: 'stake-pk' },
    })
    selection.operationWallet.value = 'operation-pk'
    await selection.onSelectOperationWallet()
    expect(mocks.notifyWarning).toHaveBeenCalledWith('common.networkErr')
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
