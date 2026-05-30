import type { SdkTransactionLike } from '../../../shared/chain/types'
import type { WalletCapabilities } from './WalletCapabilities'

export type WalletAdapterType = 'common' | 'ledger' | 'shared'

export interface WalletIdentity {
  type: WalletAdapterType
  address: string
  publicKey: string
  label: string
}

export interface SigningContext {
  password?: string
  cosignerIndex?: number
  isFirstSignature?: boolean
}

export interface WalletAdapter {
  readonly identity: WalletIdentity
  readonly capabilities: WalletCapabilities

  signTransaction(tx: SdkTransactionLike, ctx: SigningContext): Promise<SdkTransactionLike | null>

  addSignature(tx: SdkTransactionLike, ctx: SigningContext): Promise<SdkTransactionLike | null>

  signMessage(message: string, ctx: SigningContext): Promise<string | null>
}
