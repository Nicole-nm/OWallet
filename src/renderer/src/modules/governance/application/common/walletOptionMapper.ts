/**
 * Maps wallet arrays to select-option lists used in governance forms.
 * Extracted from useNodeApplyPage to be reusable across governance workflows.
 */

export interface WalletSelectOption {
  label: string
  value: string
  address: string
  publicKey: string
  timestamp?: number
  acct?: number
}

type WalletOptionInput = Record<string, unknown> & {
  label?: string
  address?: string
  publicKey?: string
  timestamp?: number
  acct?: number
}

export function mapOperationWalletOptions(wallets: WalletOptionInput[] = []): WalletSelectOption[] {
  return wallets.map((wallet) => ({
    ...wallet,
    label: `${wallet.label || ''} ${wallet.address || ''}`,
    value: wallet.publicKey || '',
    address: wallet.address || '',
    publicKey: wallet.publicKey || '',
  }))
}

export function mapStakeWalletOptions(
  wallets: WalletOptionInput[] = [],
  { ledger = false } = {}
): WalletSelectOption[] {
  return wallets
    .map((wallet) => ({
      ...wallet,
      label: `${wallet.label || ''} ${wallet.address || ''}${ledger ? ' (Ledger)' : ''}`,
      value: wallet.address || '',
      address: wallet.address || '',
      publicKey: wallet.publicKey || '',
    }))
    .sort((left, right) => {
      if (!ledger) {
        return 0
      }

      const leftTime = left.timestamp || 0
      const rightTime = right.timestamp || 0

      if (rightTime !== leftTime) {
        return rightTime - leftTime
      }

      const leftAcct = left.acct || 0
      const rightAcct = right.acct || 0

      return rightAcct - leftAcct
    })
}
