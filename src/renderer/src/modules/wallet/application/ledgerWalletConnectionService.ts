import { deriveAddressFromPublicKey } from '../../../domains/wallet/accountService'
import {
  fetchLedgerConnectionSnapshot,
  fetchLedgerDeviceInfo,
  fetchLedgerPublicKey,
} from '../../../domains/wallet/ledgerService'
import type { LedgerWalletSelection } from '../../../shared/types'

interface LedgerAccountPageResult {
  ok: boolean
  accounts: LedgerWalletSelection[]
  error?: unknown
}

interface LedgerAccountSelectionResult {
  ok: boolean
  selection?: LedgerWalletSelection
  error?: unknown
}

interface LedgerConnectionSelectionResult {
  ok: boolean
  deviceInfo?: unknown
  selection?: LedgerWalletSelection
  error?: unknown
}

export async function readLedgerDeviceInfo() {
  try {
    return { ok: true, deviceInfo: await fetchLedgerDeviceInfo() }
  } catch (error: unknown) {
    return { ok: false, error }
  }
}

export async function readLedgerPublicKey({
  acct = 0,
  neo = false,
}: { acct?: number; neo?: boolean } = {}) {
  try {
    return { ok: true, publicKey: await fetchLedgerPublicKey({ acct, neo }) }
  } catch (error: unknown) {
    return { ok: false, error }
  }
}

export async function loadLedgerAccountSelection({
  acct = 0,
  neo = false,
}: {
  acct?: number
  neo?: boolean
} = {}): Promise<LedgerAccountSelectionResult> {
  const publicKeyResult = await readLedgerPublicKey({ acct, neo })
  if (!publicKeyResult.ok || !publicKeyResult.publicKey) {
    return { ok: false, error: publicKeyResult.error }
  }

  try {
    return {
      ok: true,
      selection: {
        publicKey: publicKeyResult.publicKey,
        acct,
        neo,
        address: await deriveAddressFromPublicKey(publicKeyResult.publicKey),
      },
    }
  } catch (error: unknown) {
    return { ok: false, error }
  }
}

export async function readLedgerConnectionSelection({
  acct = 0,
  neo = false,
}: {
  acct?: number
  neo?: boolean
} = {}): Promise<LedgerConnectionSelectionResult> {
  try {
    const snapshot = await fetchLedgerConnectionSnapshot({ acct, neo })
    return {
      ok: true,
      deviceInfo: snapshot.deviceInfo,
      selection: {
        publicKey: snapshot.publicKey,
        acct,
        neo,
        address: await deriveAddressFromPublicKey(snapshot.publicKey),
      },
    }
  } catch (error: unknown) {
    return { ok: false, error }
  }
}

export async function loadLedgerAccountPage({
  page = 1,
  pageSize = 5,
  neo = false,
}: {
  page?: number
  pageSize?: number
  neo?: boolean
} = {}): Promise<LedgerAccountPageResult> {
  const accounts: LedgerWalletSelection[] = []

  for (let index = 0; index < pageSize; index += 1) {
    const acct = (page - 1) * pageSize + index
    const selectionResult = await loadLedgerAccountSelection({ acct, neo })
    if (!selectionResult.ok) {
      return { ok: false, error: selectionResult.error, accounts: [] }
    }

    if (selectionResult.selection) {
      accounts.push(selectionResult.selection)
    }
  }

  return { ok: true, accounts }
}
