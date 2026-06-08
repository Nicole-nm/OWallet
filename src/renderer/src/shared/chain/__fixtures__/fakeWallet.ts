import type { CommonWallet, HardwareWallet } from '../../lib/types'
import type { PendingSharedTransfer, SharedWalletSigner } from '../../types'

/**
 * Build a CommonWallet test fixture. The defaults satisfy the strict
 * CommonWallet shape (all fields populated) so callers can pass it to
 * production code that requires `key`, `salt`, `algorithm`, `scrypt`, etc.
 */
export function createFakeCommonWallet(overrides: Partial<CommonWallet> = {}): CommonWallet {
  return {
    address: 'AQ123',
    key: 'encrypted-key',
    label: 'Test Wallet',
    publicKey: 'pubkey-hex',
    salt: 'salt-hex',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: {},
    ...overrides,
  }
}

/**
 * Build a HardwareWallet test fixture (Ledger). Defaults include a non-empty
 * publicKey, since most callers narrow on `publicKey` being set.
 */
export function createFakeHardwareWallet(overrides: Partial<HardwareWallet> = {}): HardwareWallet {
  return {
    address: 'ALedger123',
    label: 'My Ledger',
    publicKey: 'ledger-pubkey-hex',
    neo: false,
    acct: 0,
    ...overrides,
  }
}

/**
 * Build a SharedWalletSigner test fixture (the active cosigner in a multi-sig
 * flow). Defaults to a CommonWallet-typed signer.
 */
export function createFakeSharedSigner(
  overrides: Partial<SharedWalletSigner> = {}
): SharedWalletSigner {
  return {
    type: 'CommonWallet',
    address: 'AQ1',
    publicKey: 'pubkey',
    ...overrides,
  }
}

/**
 * Build a PendingSharedTransfer test fixture (a multi-sig transfer awaiting
 * additional cosigner signatures).
 */
export function createFakePendingTransfer(
  overrides: Partial<PendingSharedTransfer> = {}
): PendingSharedTransfer {
  return {
    amount: 0,
    assetName: 'ONT',
    receiveaddress: 'AQ2',
    sendaddress: 'AS123',
    gasprice: 500,
    gaslimit: 20000,
    coPayerSignDtos: [],
    transactionBodyHash: '',
    transactionIdHash: '',
    ...overrides,
  }
}
