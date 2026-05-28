import { querySharedWallet } from '../../../domains/sharedWallet/applicationService'
import { persistWallet } from './walletPersistenceService'

export async function queryImportableSharedWallet({
  network,
  sharedWalletAddress,
}: {
  network: string
  sharedWalletAddress: string
}) {
  try {
    const wallet = (await querySharedWallet(network, sharedWalletAddress)) as {
      sharedWalletAddress?: string
    }
    if (!wallet?.sharedWalletAddress) {
      return { ok: false, errorKey: 'importSharedWallet.notFound' }
    }

    return { ok: true, wallet }
  } catch {
    return { ok: false, errorKey: 'commonWalletHome.networkError' }
  }
}

export async function persistImportedSharedWallet(sharedWallet: Record<string, unknown>) {
  const result = await persistWallet('SharedWallet', sharedWallet)

  if (result.inserted) {
    return {
      ok: true,
      sharedWallet,
      collectionsResult: result.collectionsResult,
    }
  }

  if (result.duplicate) {
    return {
      ok: false,
      duplicate: true,
      errorKey: 'importSharedWallet.joinBefore',
    }
  }

  return {
    ok: false,
    errorKey: result.errorKey || 'common.savedbFailed',
    error: result.error,
  }
}
