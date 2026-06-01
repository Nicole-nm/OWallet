import { GAS_LIMIT, resolveDefaultGasPrice } from '../../../../shared/lib/constants'
import { createRedeemTransaction } from '../../../../domains/transaction/transactionDomainService'
import { submitWithAdapter } from '../../../../domains/transaction/submitWithAdapter'
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
  let tx: SdkTransactionLike
  try {
    tx = (await createRedeemTransaction({
      address,
      claimableOng,
      gasPrice: resolveDefaultGasPrice(adapter.identity.type === 'ledger' ? 'ledger' : 'common'),
      gasLimit: GAS_LIMIT,
    })) as SdkTransactionLike
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }

  return submitWithAdapter({ tx, adapter, password })
}
