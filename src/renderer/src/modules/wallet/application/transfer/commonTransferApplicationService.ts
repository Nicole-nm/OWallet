import { GAS_LIMIT } from '../../../../shared/lib/constants'
import { convertTransferFeeToGasPrice } from '../../../../shared/lib/transferGas'
import { createTransferTransaction } from '../../../../domains/transaction/transactionDomainService'
import { submitWithAdapter } from '../../../../domains/transaction/submitWithAdapter'
import type { TransferState } from '../../../../shared/types'
import type {
  SendTransactionResult,
  TransactionFailureResult,
} from '../../../../domains/transaction/types'
import type { SdkTransactionLike, WalletAdapter } from '../adapter/WalletAdapterFactory'

type CommonTransferInput = Pick<TransferState, 'asset' | 'to' | 'amount'> & {
  gas: number | string
  scriptHash?: string
  decimal?: number
}

export type CommonTransferSubmissionResult = SendTransactionResult | TransactionFailureResult

export function buildTransferGasPrice(gas: number | string) {
  return convertTransferFeeToGasPrice(gas)
}

export async function submitCommonTransfer({
  address,
  adapter,
  transfer,
  password,
}: {
  address: string
  adapter: WalletAdapter
  transfer: CommonTransferInput
  password?: string
}): Promise<CommonTransferSubmissionResult> {
  let tx: SdkTransactionLike
  try {
    tx = (await createTransferTransaction({
      fromAddress: address,
      transfer: {
        ...transfer,
        gasPrice: buildTransferGasPrice(transfer.gas),
        gasLimit: GAS_LIMIT,
      },
    })) as SdkTransactionLike
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }

  return submitWithAdapter({ tx, adapter, password })
}
