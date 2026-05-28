import type { SdkTransactionLike } from '../../shared/chain/types'

export type GovernanceSignablePayload = string | SdkTransactionLike | null | undefined
