import { BigNumber } from 'bignumber.js'
import {
  createDelegatedStakeTransactionBody,
  createNodeStakeRegistrationTransaction,
  fetchQualifiedState,
  saveStakeInfo,
  submitDelegatedStakeTransaction,
} from '../../../../domains/governance/nodeStakeDomainService'
import {
  signTransactionWithPrivateKey,
  tryDecryptWallet,
} from '../../../../shared/chain/transactionSdk'
import { fetchNativeBalance } from '../../../../domains/wallet/walletDomainService'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import { verifyPositiveInt } from '../../../../shared/lib/validators'
import { loadStakeDetail } from './nodeStakeApplicationService'
import { normalizeNodePublicKey } from '../../domain/nodeMapper'
import { NetworkId, Identity, CommonWallet } from '../../../../shared/lib/types'
import { GAS_PRICE } from '../../../../shared/lib/constants'
import type { SdkTransactionLike } from '../../../../shared/chain/types'
import type { WalletAdapter } from '../../../wallet/application/adapter/WalletAdapterFactory'

const logger = createLogger('nodeStakeOnboardingApplicationService')
const ONTID_DECRYPT_OPTIONS = {
  cost: 4096,
  blockSize: 8,
  parallel: 8,
  size: 64,
}

function createIdentityWallet(stakeIdentity?: Identity) {
  const control = stakeIdentity?.controls?.[0]

  if (!control?.key || !control?.address || !control?.salt) {
    return null
  }

  return {
    key: control.key,
    address: control.address,
    salt: control.salt,
  }
}

type NodeStakeRegistrationDetail = Record<string, unknown>

function normalizeStakeRegistrationDetail(stakeDetail: NodeStakeRegistrationDetail = {}) {
  return {
    ontid: String(stakeDetail.ontid || ''),
    publicKey: normalizeNodePublicKey(stakeDetail),
    stakeWalletAddress: String(stakeDetail.stakeWalletAddress || ''),
  }
}

export function loadNodeStakeRegistrationDetail({
  network,
  ontid,
}: {
  network: NetworkId
  ontid: string
}) {
  return loadStakeDetail({
    network,
    payload: { ontid },
  })
}

export async function ensureNodeStakeQualification({
  network,
  ontid,
  stakeWalletAddress,
}: {
  network: NetworkId
  ontid: string
  stakeWalletAddress: string
}) {
  const result = await tryCatch(
    async () => ({
      qualifiedState: (await fetchQualifiedState(network, ontid, stakeWalletAddress)) as
        | { QualifiedState?: number }
        | undefined,
    }),
    { context: 'ensureNodeStakeQualification', errorKey: 'common.networkErr', logger }
  )

  if (!result.ok) return result
  if (result.qualifiedState?.QualifiedState === 1) {
    return { ok: false as const, errorKey: 'nodeStake.invalidOntid' }
  }
  if (result.qualifiedState?.QualifiedState === 2) {
    return { ok: false as const, errorKey: 'nodeStake.invalidAddress' }
  }
  return result
}

export async function validateNodeStakeRegistrationBalance({
  stakeWalletAddress,
  stakeQuantity,
}: {
  stakeWalletAddress: string
  stakeQuantity: string | number
}) {
  const balanceResult = await fetchNativeBalance(stakeWalletAddress)
  if (!balanceResult.ok) {
    return { ok: false as const, errorKey: balanceResult.errorKey || 'common.networkErr' }
  }

  if (new BigNumber(stakeQuantity).isGreaterThan(balanceResult.data.ont || 0)) {
    return { ok: false as const, errorKey: 'nodeStake.ontBalanceInsufficient' }
  }

  return { ok: true as const }
}

export async function createNodeStakeRegistrationDraft({
  stakeQuantity,
  stakeDetail,
  gasPrice = GAS_PRICE,
}: {
  stakeQuantity: string | number
  stakeDetail?: NodeStakeRegistrationDetail
  gasPrice?: string
}) {
  const detail = normalizeStakeRegistrationDetail(stakeDetail)

  if (!stakeQuantity || !verifyPositiveInt(stakeQuantity)) {
    return { ok: false, errorKey: 'nodeStake.stakeQuantityEmpty' }
  }

  if (!detail.ontid || !detail.publicKey || !detail.stakeWalletAddress) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  const balanceResult = await validateNodeStakeRegistrationBalance({
    stakeWalletAddress: detail.stakeWalletAddress,
    stakeQuantity,
  })
  if (!balanceResult.ok) return balanceResult

  return tryCatch(
    async () => ({
      tx: await createNodeStakeRegistrationTransaction({
        ontid: detail.ontid as string,
        publicKey: detail.publicKey,
        initPos: Number(stakeQuantity),
        stakeWalletAddress: detail.stakeWalletAddress as string,
        gasPrice,
      }),
    }),
    { context: 'createNodeStakeRegistrationDraft', errorKey: 'common.networkErr', logger }
  )
}

export async function signNodeStakeRegistrationOntid({
  tx,
  stakeIdentity,
  password,
}: {
  tx: unknown
  stakeIdentity?: Identity
  password?: string
}) {
  if (!password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (!tx) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  const identityWallet = createIdentityWallet(stakeIdentity)
  if (!identityWallet) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  const result = await tryCatch(
    async () => {
      const privateKey = await tryDecryptWallet(
        identityWallet as unknown as CommonWallet, // Cast: tryDecryptWallet expects { key, address, salt }
        password,
        ONTID_DECRYPT_OPTIONS
      )
      if (!privateKey) return { privateKey: '' as const }
      await signTransactionWithPrivateKey(tx as SdkTransactionLike, privateKey)
      return { privateKey }
    },
    { context: 'signNodeStakeRegistrationOntid', errorKey: 'common.networkErr', logger }
  )

  if (!result.ok) return result
  if (!result.privateKey) return { ok: false as const, errorKey: 'common.pwdErr' }
  return { ok: true as const, tx }
}

export async function submitNodeStakeRegistration({
  tx,
  adapter,
  password,
  network,
  ontid,
  publicKey,
  stakeWalletAddress,
  stakeQuantity,
  ledgerConnected = true,
}: {
  tx: unknown
  adapter: WalletAdapter
  password?: string
  network: NetworkId
  ontid: string
  publicKey: string
  stakeWalletAddress: string
  stakeQuantity: string | number
  ledgerConnected?: boolean
}) {
  const { requiresPassword, requiresHardwareDevice } = adapter.capabilities

  if (requiresPassword && !password) {
    return { ok: false, errorKey: 'nodeStake.passwordEmpty' }
  }

  if (!tx) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  if (requiresHardwareDevice && (!ledgerConnected || !adapter.identity.address)) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  const signResult = await tryCatch(
    async () => ({
      signedTx: await adapter.addSignature(tx as SdkTransactionLike, {
        password: requiresPassword ? password : undefined,
      }),
    }),
    {
      context: 'submitNodeStakeRegistration.sign',
      errorKey: requiresHardwareDevice ? 'ledgerWallet.signFailed' : 'common.unexpectedError',
      logger,
    }
  )

  if (!signResult.ok) return { ...signResult, stage: 'sign' as const }
  if (!signResult.signedTx) {
    return requiresPassword
      ? { ok: false as const, errorKey: 'common.pwdErr' }
      : { ok: false as const, cancelled: true }
  }

  const body = createDelegatedStakeTransactionBody({
    tx: signResult.signedTx,
    ontid,
    publicKey,
    stakeWalletAddress,
  })

  const submitResult = await tryCatch(
    async () => {
      await submitDelegatedStakeTransaction(network, body)
    },
    { context: 'submitNodeStakeRegistration.delegate', errorKey: 'nodeStake.txFailed', logger }
  )

  if (!submitResult.ok) return { ...submitResult, stage: 'submit' as const }

  const saveResult = await tryCatch(
    async () => {
      await saveStakeInfo(network, {
        ontid,
        stakewalletaddress: stakeWalletAddress,
        stakequantity: stakeQuantity,
      })
    },
    { context: 'submitNodeStakeRegistration.saveStakeInfo', errorKey: 'common.networkErr', logger }
  )

  return saveResult.ok
    ? { ok: true as const, persisted: true }
    : {
        ok: true as const,
        persisted: false,
        persistErrorKey: saveResult.errorKey,
        error: saveResult.error,
      }
}
