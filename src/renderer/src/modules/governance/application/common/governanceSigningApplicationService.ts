import { sendTransaction } from '../../../../domains/transaction/transactionDomainService'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import { classifyError } from '../../../../shared/lib/errors'
import type { SdkTransactionLike } from '../../../../shared/chain/types'
import type { TransactionFailureResult } from '../../../../domains/transaction/types'
import type { WalletAdapter } from '../../../wallet/application/adapter/WalletAdapterFactory'
import { resolveDefaultGasPrice } from '../../../../shared/lib/constants'
import { setUnsignedTransactionGasPrice } from '../../../../domains/transaction/transactionGasPrice'

const logger = createLogger('governanceSigningApplicationService')

type GovernanceSignResult = { ok: true; signedPayload: unknown } | TransactionFailureResult

export async function signGovernancePayload({
  payload,
  adapter,
  password,
  ledgerConnected = true,
}: {
  payload: string | SdkTransactionLike
  adapter: WalletAdapter
  password?: string
  ledgerConnected?: boolean
}): Promise<GovernanceSignResult> {
  const { requiresPassword, requiresHardwareDevice } = adapter.capabilities

  if (requiresPassword && !password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (requiresHardwareDevice && !ledgerConnected) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  const ctx = { password }

  const result = await tryCatch<{ signedPayload: unknown }>(
    async () => {
      const signedPayload =
        typeof payload === 'string'
          ? await adapter.signMessage(payload, ctx)
          : await adapter.signTransaction(
              adapter.identity.type === 'ledger'
                ? setUnsignedTransactionGasPrice(payload, resolveDefaultGasPrice('ledger'))
                : payload,
              ctx
            )
      return { signedPayload }
    },
    {
      context: 'signGovernancePayload',
      errorKey: requiresHardwareDevice ? 'ledgerWallet.signFailed' : 'common.unexpectedError',
      logger,
    }
  )

  if (!result.ok) return result
  if (!result.signedPayload) {
    return requiresHardwareDevice
      ? { ok: false, errorKey: 'ledgerWallet.signFailed' }
      : { ok: false, errorKey: 'common.pwdErr' }
  }
  return result
}

export async function submitGovernanceSignedTransaction({ tx }: { tx: SdkTransactionLike }) {
  try {
    return await sendTransaction(tx)
  } catch (err: unknown) {
    logger.error('submitGovernanceSignedTransaction', err)
    const payload = classifyError(err)
    return { ok: false, ...payload, error: err }
  }
}
