import { GAS_LIMIT, GAS_PRICE } from '../../../shared/lib/constants'
import {
  createRedeemTransaction,
  signAndSendTransaction,
} from '../../../domains/transaction/applicationService'
import type { CurrentWalletRecord } from '../../../shared/types'
import type { WalletSigner } from '../../../shared/lib/types'
import type { TransactionFailureResult } from '../../../domains/transaction/types'

type CommonRedeemWallet = CurrentWalletRecord & {
  address: string
}

export type CommonRedeemSubmissionResult =
  | Awaited<ReturnType<typeof signAndSendTransaction>>
  | TransactionFailureResult

export async function submitWalletRedeem({
  wallet,
  claimableOng,
  password,
}: {
  wallet: CommonRedeemWallet
  claimableOng: number | string
  password?: string
}): Promise<CommonRedeemSubmissionResult> {
  try {
    const tx = await createRedeemTransaction({
      address: wallet.address,
      claimableOng,
      gasPrice: GAS_PRICE,
      gasLimit: GAS_LIMIT,
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
