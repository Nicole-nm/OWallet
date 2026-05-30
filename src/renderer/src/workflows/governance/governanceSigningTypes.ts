import type { SdkTransactionLike } from '../../modules/wallet/application/adapter/WalletAdapterFactory'

export type GovernanceSignablePayload = string | SdkTransactionLike | null | undefined
