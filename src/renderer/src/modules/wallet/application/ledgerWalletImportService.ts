import { deriveAddressFromPublicKey } from '../../../domains/wallet/accountService'
import { findByPublicKeys } from '../../../domains/wallet/applicationService'
import { persistWallet, refreshWalletCollections } from './walletPersistenceService'

interface LedgerWalletSelectionInput {
  publicKey?: string
  acct?: number
}

interface LedgerWalletAccount {
  publicKey: string
  address: string
  neo: boolean
  acct: number
  timestamp: number
  label?: string
}

interface LedgerWalletImportParams {
  selections?: Array<LedgerWalletSelectionInput | null | undefined>
  label?: string
  neo?: boolean
}

function sortSelectionsByAccount(
  selections: Array<LedgerWalletSelectionInput | null | undefined> = []
) {
  return selections
    .filter((selection): selection is LedgerWalletSelectionInput & { publicKey: string } =>
      Boolean(selection?.publicKey)
    )
    .slice()
    .sort((left, right) => Number(left.acct || 0) - Number(right.acct || 0))
}

export async function buildLedgerWalletAccount({
  publicKey,
  neo = false,
  acct,
}: {
  publicKey: string
  neo?: boolean
  acct: number
}): Promise<LedgerWalletAccount> {
  return {
    publicKey,
    address: await deriveAddressFromPublicKey(publicKey),
    neo,
    acct,
    timestamp: Date.now(),
  }
}

export function buildLedgerWalletLabel({
  label,
  neo,
  acct,
}: {
  label: string
  neo?: boolean
  acct: number
}) {
  return `${label}${neo ? '-Compatible NEO' : ''}-${acct}`
}

export async function importLedgerWalletSelections({
  selections = [],
  label = '',
  neo = false,
}: LedgerWalletImportParams) {
  try {
    const orderedSelections = sortSelectionsByAccount(selections)
    const existingAccounts = await findByPublicKeys(
      orderedSelections.map((selection) => selection.publicKey)
    )
    const existingPublicKeys = new Set(
      (existingAccounts || [])
        .map((account) => (account as unknown as { publicKey?: string }).publicKey)
        .filter((publicKey): publicKey is string => Boolean(publicKey))
    )
    const insertedAccounts: LedgerWalletAccount[] = []
    let duplicateCount = 0

    for (const selection of orderedSelections) {
      if (existingPublicKeys.has(selection.publicKey)) {
        duplicateCount += 1
        continue
      }

      const account = await buildLedgerWalletAccount({
        publicKey: selection.publicKey,
        neo,
        acct: Number(selection.acct || 0),
      })
      account.label = buildLedgerWalletLabel({ label, neo, acct: account.acct })

      const result = await persistWallet(
        'HardwareWallet',
        account as unknown as Record<string, unknown>,
        { refresh: false }
      )
      if (result.inserted) {
        insertedAccounts.push(account)
        existingPublicKeys.add(selection.publicKey)
        continue
      }

      if (result.duplicate) {
        duplicateCount += 1
        existingPublicKeys.add(selection.publicKey)
        continue
      }

      return {
        ok: false,
        errorKey: result.errorKey || 'common.savedbFailed',
        error: result.error,
        insertedAccounts,
        duplicateCount,
        collectionsResult: null,
      }
    }

    return {
      ok: true,
      insertedAccounts,
      duplicateCount,
      collectionsResult: insertedAccounts.length > 0 ? await refreshWalletCollections() : null,
    }
  } catch (error: unknown) {
    return {
      ok: false,
      errorKey: 'common.savedbFailed',
      error,
      insertedAccounts: [] as LedgerWalletAccount[],
      duplicateCount: 0,
      collectionsResult: null,
    }
  }
}
