import { GAS_LIMIT, resolveDefaultGasPrice } from '../../../../shared/lib/constants'
import { buildClaimOng } from '../../../../domains/transaction/assetBuilder'
import { buildAndSubmit } from '../../../../domains/transaction/submitWithAdapter'
import type {
  SendTransactionResult,
  TransactionFailureResult,
} from '../../../../domains/transaction/types'
import type { SdkTransactionLike, WalletAdapter } from '../adapter/WalletAdapterFactory'

export type CommonRedeemSubmissionResult = SendTransactionResult | TransactionFailureResult

export async function submitWalletRedeem({
  address,
  adapter,
  claimableOng,
  password,
}: {
  address: string
  adapter: WalletAdapter
  claimableOng: number | string
  password?: string
}): Promise<CommonRedeemSubmissionResult> {
  return buildAndSubmit({
    adapter,
    password,
    build: async () =>
      (await buildClaimOng(
        address,
        claimableOng,
        String(resolveDefaultGasPrice(adapter.identity.type === 'ledger' ? 'ledger' : 'common')),
        String(GAS_LIMIT)
      )) as SdkTransactionLike,
  })
}
