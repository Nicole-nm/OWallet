import {
  sendTransaction,
  signLedgerPayload,
  signPayload,
} from '../../../domains/transaction/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { mapSigningFailure } from '../../../shared/lib/transactionHelper'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import { isCommonWallet } from '../../../shared/lib/types'
import type { HardwareWalletSigner, WalletSigner } from '../../../shared/lib/types'
import type { TransactionFailureResult } from '../../../domains/transaction/types'

const logger = createLogger('governanceSigningApplicationService')

type GovernanceSignResult = { ok: true; signedPayload: unknown } | TransactionFailureResult

function hasLedgerPublicKey(
  wallet: WalletSigner
): wallet is HardwareWalletSigner & { publicKey: string } {
  return typeof wallet.publicKey === 'string' && wallet.publicKey.length > 0
}

export async function signGovernancePayload({
  payload,
  wallet,
  password,
  ledgerConnected = true,
}: {
  payload: string | SdkTransactionLike
  wallet: WalletSigner
  password?: string
  ledgerConnected?: boolean
}): Promise<GovernanceSignResult> {
  const usesCommonWallet = isCommonWallet(wallet)

  if (usesCommonWallet && !password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (!usesCommonWallet && !ledgerConnected) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  if (!usesCommonWallet && !hasLedgerPublicKey(wallet)) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  const result = await tryCatch<{ signedPayload: unknown }>(
    async () => {
      const signedPayload = usesCommonWallet
        ? await signPayload({ payload, wallet, password })
        : await signLedgerPayload({ payload, wallet })
      return { signedPayload }
    },
    {
      context: 'signGovernancePayload',
      errorKey: usesCommonWallet ? 'common.networkErr' : 'ledgerWallet.signFailed',
      logger,
    }
  )

  if (!result.ok) return result
  if (!result.signedPayload) return mapSigningFailure({ wallet, field: 'errorKey' })
  return result
}

export async function submitGovernanceSignedTransaction({ tx }: { tx: SdkTransactionLike }) {
  try {
    return await sendTransaction(tx)
  } catch (err: unknown) {
    logger.error('submitGovernanceSignedTransaction', err)
    return { ok: false, errorKey: 'common.networkErr', error: err }
  }
}
