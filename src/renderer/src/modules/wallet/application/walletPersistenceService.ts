import {
  findByAddress,
  insertWallet,
  updateWalletField,
} from '../../../domains/wallet/applicationService'
import { loadWalletCollections } from './walletCollectionApplicationService'

const SHARED_WALLET = 'SharedWallet'

type WalletDocumentType = string
type WalletRecord = Record<string, unknown>
type WalletDbDocument = Parameters<typeof insertWallet>[0]

interface PersistWalletOptions {
  overwrite?: boolean
  refresh?: boolean
}

function resolveWalletAddress(type: WalletDocumentType, wallet: WalletRecord) {
  if (type === SHARED_WALLET) {
    return String(wallet.sharedWalletAddress || '')
  }

  return String(wallet.address || '')
}

export async function refreshWalletCollections() {
  return loadWalletCollections({ force: true })
}

export function buildWalletDocument(
  type: WalletDocumentType,
  wallet: WalletRecord
): WalletDbDocument {
  return {
    type: type as WalletDbDocument['type'],
    address: resolveWalletAddress(type, wallet),
    wallet,
  }
}

export async function persistWallet(
  type: WalletDocumentType,
  wallet: WalletRecord,
  options: PersistWalletOptions = {}
) {
  const { overwrite = false, refresh = true } = options
  const doc = buildWalletDocument(type, wallet)

  if (!doc.address) {
    return { ok: false, status: 'invalid', doc, errorKey: 'common.savedbFailed' }
  }

  try {
    const existing = await findByAddress(doc.address)
    if (existing) {
      if (!overwrite) {
        return { ok: false, status: 'duplicate', duplicate: true, existing, doc }
      }

      await updateWalletField(doc.address, { wallet: doc.wallet })
      const collectionsResult = refresh ? await refreshWalletCollections() : null
      return {
        ok: true,
        status: 'updated',
        updated: true,
        existing,
        doc,
        collectionsResult,
      }
    }

    await insertWallet(doc)
    const collectionsResult = refresh ? await refreshWalletCollections() : null
    return {
      ok: true,
      status: 'inserted',
      inserted: true,
      doc,
      collectionsResult,
    }
  } catch (error: unknown) {
    return {
      ok: false,
      status: 'failed',
      doc,
      errorKey: 'common.savedbFailed',
      error,
    }
  }
}
