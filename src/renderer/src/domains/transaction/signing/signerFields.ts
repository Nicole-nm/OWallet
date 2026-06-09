/**
 * Pure normalizers for the loosely-typed Ledger wallet records that flow into
 * the signing layer. Kept separate from `shared/chain/ledgerSigner` (which does
 * device I/O and is mocked in tests) so callers use the real implementations
 * without stubbing the transport.
 */

import type { WalletSigner } from '../../../shared/lib/types'

export function normalizeLedgerBoolean(value: unknown): boolean {
  return value === true || value === 1
}

export function normalizeLedgerAccountIndex(value: unknown): number {
  const accountIndex = Number(value ?? 0)
  if (!Number.isInteger(accountIndex) || accountIndex < 0) {
    throw new Error('Ledger account index is invalid')
  }
  return accountIndex
}

interface LegacyNestedWallet {
  wallet?: {
    address?: string
    publicKey?: string
    neo?: boolean | number
    acct?: number
    sharedWalletAddress?: string
  }
}

export interface NormalizedLedgerSigner {
  address: string
  sharedWalletAddress: string
  publicKey: string
  accountIndex: number
  isNeo: boolean
}

/**
 * Flatten a (possibly legacy nested) Ledger wallet record into a validated,
 * strongly-typed signer. Throws when the public key is missing or the account
 * index is not a non-negative integer.
 */
export function normalizeLedgerSigner(
  wallet: WalletSigner & Record<string, unknown>
): NormalizedLedgerSigner {
  const legacyWallet = wallet as WalletSigner & LegacyNestedWallet
  const nestedWallet = legacyWallet.wallet
  const address = String(nestedWallet?.address || wallet.address || '')
  const sharedWalletAddress = String(
    nestedWallet?.sharedWalletAddress || wallet.sharedWalletAddress || address
  )
  const publicKey = String(nestedWallet?.publicKey || wallet.publicKey || '')
  if (!publicKey) {
    throw new Error('Ledger public key is unavailable')
  }

  return {
    address,
    sharedWalletAddress,
    publicKey,
    accountIndex: normalizeLedgerAccountIndex(nestedWallet?.acct ?? wallet.acct),
    isNeo: normalizeLedgerBoolean(nestedWallet?.neo ?? wallet.neo),
  }
}
