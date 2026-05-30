import type { HardwareWalletSigner } from '../../lib/types'

export type FakeLedgerWallet = HardwareWalletSigner & {
  label: string
  publicKey: string
  sharedWalletAddress?: string
  [key: string]: unknown
}

export function createFakeLedgerWallet(
  overrides: Partial<FakeLedgerWallet> = {}
): FakeLedgerWallet {
  return {
    address: 'ALedger1234567890',
    label: 'Ledger',
    publicKey: 'ledger-pubkey-hex',
    neo: false,
    acct: 0,
    ...overrides,
  }
}

export function createFakeSharedLedgerWallet(
  overrides: Partial<FakeLedgerWallet> = {}
): FakeLedgerWallet {
  return createFakeLedgerWallet({
    sharedWalletAddress: 'ASharedWalletAddress',
    ...overrides,
  })
}
