import { createCommonWalletAdapter } from '../../../../domains/wallet/adapter/commonAdapter'
import {
  createLedgerWalletAdapter,
  type LedgerWalletInput,
} from '../../../../domains/wallet/adapter/ledgerAdapter'
import {
  createSharedWalletAdapter,
  type SharedAdapterConfig,
  type SharedCosignerInput,
} from '../../../../domains/wallet/adapter/sharedAdapter'
import type { WalletAdapter } from '../../../../domains/wallet/adapter'
import { isCommonWallet } from '../../../../shared/lib/types'
import type { CommonWallet, WalletSigner } from '../../../../shared/lib/types'

export type { WalletAdapter, SharedCosignerInput }
export type { SdkTransactionLike } from '../../../../shared/chain/types'
export type { WalletCapabilities } from '../../../../domains/wallet/adapter'

export type CommonWalletInput = { kind: 'common'; wallet: CommonWallet }
export type LedgerWalletAdapterInput = { kind: 'ledger'; wallet: LedgerWalletInput }
export type SharedWalletAdapterInput = { kind: 'shared' } & SharedAdapterConfig

export type WalletAdapterInput =
  | CommonWalletInput
  | LedgerWalletAdapterInput
  | SharedWalletAdapterInput

export const WalletAdapterFactory = {
  create(input: WalletAdapterInput): WalletAdapter {
    switch (input.kind) {
      case 'common':
        return createCommonWalletAdapter(input.wallet)
      case 'ledger':
        return createLedgerWalletAdapter(input.wallet)
      case 'shared':
        return createSharedWalletAdapter(input)
      default: {
        const exhaustive: never = input
        throw new Error(`Unrecognized wallet input: ${JSON.stringify(exhaustive)}`)
      }
    }
  },

  /**
   * Build a Common or Ledger adapter from a raw WalletSigner. Returns null when
   * the signer shape is too thin (e.g. missing publicKey for a Ledger signer).
   * For shared-wallet contexts, use `create({ kind: 'shared', ... })` directly.
   */
  fromWalletSigner(wallet: WalletSigner | null | undefined): WalletAdapter | null {
    if (!wallet) return null

    if (isCommonWallet(wallet)) {
      return createCommonWalletAdapter(wallet)
    }

    const publicKey = typeof wallet.publicKey === 'string' ? wallet.publicKey : ''
    if (!publicKey) return null

    return createLedgerWalletAdapter({
      ...wallet,
      publicKey,
      label: typeof wallet.label === 'string' ? wallet.label : '',
    })
  },
}
