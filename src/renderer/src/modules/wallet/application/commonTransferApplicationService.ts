import { GAS_LIMIT } from '../../../shared/lib/constants'
import { convertTransferFeeToGasPrice } from '../../../shared/lib/transferGas'
import {
  createTransferTransaction,
  signAndSendTransaction,
} from '../../../domains/transaction/applicationService'
import type { CurrentWalletRecord, TransferState } from '../../../shared/types'
import type { WalletSigner } from '../../../shared/lib/types'
import type { TransactionFailureResult } from '../../../domains/transaction/types'

type CommonTransferInput = Pick<TransferState, 'asset' | 'to' | 'amount'> & {
  gas: number | string
  scriptHash?: string
  decimal?: number
}

type CommonTransferWallet = CurrentWalletRecord & {
  address: string
}

export type CommonTransferSubmissionResult =
  | Awaited<ReturnType<typeof signAndSendTransaction>>
  | TransactionFailureResult

export function buildTransferGasPrice(gas: number | string) {
  return convertTransferFeeToGasPrice(gas)
}

export async function submitCommonTransfer({
  wallet,
  transfer,
  password,
}: {
  wallet: CommonTransferWallet
  transfer: CommonTransferInput
  password?: string
}): Promise<CommonTransferSubmissionResult> {
  try {
    const tx = await createTransferTransaction({
      fromAddress: wallet.address,
      transfer: {
        ...transfer,
        gasPrice: buildTransferGasPrice(transfer.gas),
        gasLimit: GAS_LIMIT,
      },
    })

    return signAndSendTransaction({
      tx,
      wallet: wallet as WalletSigner,
      password,
    })
  } catch (error: unknown) {
    return { ok: false, errorKey: 'common.networkErr', error }
  }
}
