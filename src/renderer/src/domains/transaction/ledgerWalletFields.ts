/**
 * Pure normalizers for the loosely-typed `neo`/`acct` fields that legacy
 * Ledger wallet records carry. Kept separate from `shared/chain/ledgerSigner`
 * (which performs device I/O and is mocked in tests) so consumers can use the
 * real implementations without stubbing the transport.
 */

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
