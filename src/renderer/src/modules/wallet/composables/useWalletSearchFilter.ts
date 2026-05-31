import type { Ref } from 'vue'
import { matchesSearchQuery } from '../../../shared/lib/searchQuery'
import type { CommonWallet, HardwareWallet, SharedWallet } from '../../../shared/lib/types'

export type SearchableWallet = CommonWallet | HardwareWallet | SharedWallet

export function walletSearchableFields(wallet: SearchableWallet): Array<string | undefined> {
  if ('sharedWalletAddress' in wallet) {
    return [wallet.sharedWalletName, wallet.sharedWalletAddress]
  }
  return [wallet.label, wallet.address]
}

export function useWalletSearchFilter(query: Ref<string>) {
  return {
    matches: (wallet: SearchableWallet): boolean =>
      matchesSearchQuery(query.value, ...walletSearchableFields(wallet)),
  }
}
