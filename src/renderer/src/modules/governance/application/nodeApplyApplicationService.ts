import { createRegisterCandidateTransaction } from '../../../domains/governance/applicationService'
import { deriveAddressFromPublicKey } from '../../../domains/wallet/accountService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { varifyPositiveInt } from '../../../shared/lib/validators'
import { createPendingNodeStakeInfo } from './nodeStakeApplicationService'
import { NetworkId } from '../../../shared/lib/types'

const logger = createLogger('nodeApplyApplicationService')

export function isNodeApplyAmountValid(amount: string | number) {
  return !(amount && !varifyPositiveInt(amount))
}

export function validateNodeApplyForm({
  stakeWalletAddress,
  operationWalletPublicKey,
  stakeAmount,
  minStakeAmount = 10000,
  amountIsValid = true,
}: {
  stakeWalletAddress: string
  operationWalletPublicKey: string
  stakeAmount: string | number
  minStakeAmount?: string | number
  amountIsValid?: boolean
}) {
  if (!stakeWalletAddress) {
    return { ok: false, errorKey: 'nodeApply.stakeWalletRequired' }
  }

  if (!operationWalletPublicKey) {
    return { ok: false, errorKey: 'nodeApply.operationWalletRequired' }
  }

  if (!stakeAmount) {
    return { ok: false, errorKey: 'nodeApply.stakeAmountRequired' }
  }

  if (Number(stakeAmount) < Number(minStakeAmount)) {
    return { ok: false, errorKey: 'nodeApply.minStateAmount' }
  }

  if (!amountIsValid) {
    return { ok: false, silent: true }
  }

  return { ok: true }
}

export async function validateNodeApplyOperationWallet({
  stakeWalletAddress,
  operationWalletPublicKey,
}: {
  stakeWalletAddress: string
  operationWalletPublicKey: string
}) {
  if (!stakeWalletAddress || !operationWalletPublicKey) {
    return { ok: true as const, address: null }
  }

  const result = await tryCatch(
    async () => ({ address: await deriveAddressFromPublicKey(operationWalletPublicKey) }),
    {
      context: 'validateNodeApplyOperationWallet',
      errorKey: 'nodeApply.invalidOperationPk',
      logger,
    }
  )

  if (!result.ok) return { ...result, level: 'warning' as const }
  if (stakeWalletAddress === result.address) {
    return {
      ok: false as const,
      level: 'warning' as const,
      errorKey: 'nodeApply.sameWalletNotAllowed',
      address: result.address,
    }
  }
  return result
}

export async function createNodeApplyTransactionDraft({
  stakeWalletAddress,
  operationWalletPublicKey,
  stakeAmount,
}: {
  stakeWalletAddress: string
  operationWalletPublicKey: string
  stakeAmount: string | number
}) {
  return tryCatch(
    async () => ({
      tx: await createRegisterCandidateTransaction({
        ontid: 'did:ont' + stakeWalletAddress,
        publicKey: operationWalletPublicKey,
        initPos: Number(stakeAmount),
        stakeWalletAddress,
      }),
    }),
    { context: 'createNodeApplyTransactionDraft', errorKey: 'common.networkErr', logger }
  )
}

export async function createPendingNodeApplyInfo({
  network,
  stakeWalletAddress,
  nodePublicKey,
}: {
  network: NetworkId
  stakeWalletAddress: string
  nodePublicKey: string
}) {
  if (!network || !stakeWalletAddress || !nodePublicKey) {
    return {
      ok: false,
      errorKey: 'common.networkErr',
      nodePublicKey: nodePublicKey || '',
    }
  }

  const result = await createPendingNodeStakeInfo({
    network,
    info: {
      name: 'Node_' + String(nodePublicKey).substr(0, 6),
      address: stakeWalletAddress,
      publicKey: nodePublicKey,
    },
  })

  return {
    ...result,
    nodePublicKey,
  }
}
