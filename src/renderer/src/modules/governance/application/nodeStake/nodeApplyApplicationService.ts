import { createRegisterCandidateTransaction } from '../../../../domains/governance/governanceDomainService'
import { getPeerPoolMap } from '../../../../domains/governance/governanceStorageReader'
import { fetchNativeBalance } from '../../../../domains/wallet/walletDomainService'
import { deriveAddressFromPublicKey } from '../../../../shared/chain/walletSdk'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import { verifyPositiveInt } from '../../../../shared/lib/validators'
import { createPendingNodeStakeInfo } from './nodeStakeApplicationService'
import { NetworkId } from '../../../../shared/lib/types'
import { BigNumber } from 'bignumber.js'

const logger = createLogger('nodeApplyApplicationService')

function normalizePublicKeyForCompare(publicKey: string) {
  return publicKey.trim().toLowerCase()
}

export function isNodeApplyAmountValid(amount: string | number) {
  return !(amount && !verifyPositiveInt(amount))
}

export function validateNodeApplyForm({
  stakeWalletAddress,
  operationWalletPublicKey,
  stakeAmount,
  minStakeAmount = 10000,
  amountIsValid = true,
  ontBalance,
  ongBalance,
  gasPrice = 500,
  gasLimit = 200000,
}: {
  stakeWalletAddress: string
  operationWalletPublicKey: string
  stakeAmount: string | number
  minStakeAmount?: string | number
  amountIsValid?: boolean
  ontBalance?: string | number
  ongBalance?: string | number
  gasPrice?: string | number
  gasLimit?: string | number
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

  if (ontBalance !== undefined) {
    if (new BigNumber(ontBalance).isLessThan(stakeAmount)) {
      return { ok: false, errorKey: 'nodeApply.ontBalanceInsufficient' }
    }
  }

  if (ongBalance !== undefined) {
    const requiredGas = new BigNumber(gasPrice).multipliedBy(gasLimit).dividedBy(1e9)
    const requiredOng = new BigNumber(500).plus(requiredGas)
    if (new BigNumber(ongBalance).isLessThan(requiredOng)) {
      return { ok: false, errorKey: 'nodeApply.ongBalanceInsufficient' }
    }
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

export async function loadNodeApplyStakeWalletBalance(address: string) {
  return fetchNativeBalance(address)
}

export async function validateNodeApplyRegistrationInput({
  network,
  stakeWalletAddress,
  operationWalletPublicKey,
}: {
  network: NetworkId
  stakeWalletAddress: string
  operationWalletPublicKey: string
}) {
  if (!network || !stakeWalletAddress) {
    return { ok: false as const, errorKey: 'nodeApply.stakeWalletRequired' }
  }

  if (!operationWalletPublicKey) {
    return { ok: false as const, errorKey: 'nodeApply.operationWalletRequired' }
  }

  const walletResult = await validateNodeApplyOperationWallet({
    stakeWalletAddress,
    operationWalletPublicKey,
  })
  if (!walletResult.ok) return walletResult

  const peerPoolResult = await tryCatch(
    async () => ({
      peerPool: await getPeerPoolMap(),
    }),
    {
      context: 'validateNodeApplyRegistrationInput.peerPool',
      errorKey: 'common.networkErr',
      logger,
    }
  )

  if (!peerPoolResult.ok) return peerPoolResult

  const operationKey = normalizePublicKeyForCompare(operationWalletPublicKey)
  const registered = Object.keys(peerPoolResult.peerPool || {}).some(
    (peerPublicKey) => normalizePublicKeyForCompare(peerPublicKey) === operationKey
  )

  if (registered) {
    return {
      ok: false as const,
      level: 'warning' as const,
      errorKey: 'nodeApply.publicKeyAlreadyRegistered',
      address: walletResult.address,
    }
  }

  return { ok: true as const, address: walletResult.address }
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
