import type { SdkTransactionLike } from '../../../../shared/chain/types'
export { isSdkTransactionLike } from '../../../../shared/chain/sdkBoundary'

export type GovernanceSignablePayload = string | SdkTransactionLike | null | undefined
