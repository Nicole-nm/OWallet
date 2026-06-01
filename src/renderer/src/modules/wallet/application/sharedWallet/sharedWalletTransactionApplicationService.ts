import {
  countSerializedSharedTransactionSignatures as countSerializedSharedTransactionSignaturesFromDomain,
  createSerializedSharedInvokeTransaction as createSerializedSharedInvokeTransactionFromDomain,
  prepareSharedTransferDraft,
  sendSerializedSharedTransaction as sendSerializedSharedTransactionFromDomain,
  signSerializedSharedTransaction as signSerializedSharedTransactionFromDomain,
  signSharedTransactionDraft,
  submitCreatedSharedTransfer,
  submitPendingSharedSignature as submitPendingSharedSignatureFromDomain,
} from '../../../../domains/sharedWallet/sharedWalletDomainService'
import { validateWalletAddress } from '../../../../domains/wallet/accountService'
import { createLogger } from '../../../../shared/lib/logger'
import { WalletAdapterFactory, type SharedCosignerInput } from '../adapter/WalletAdapterFactory'

import type { CreatedSharedTransferResult } from '../../../../domains/sharedWallet/sharedWalletDraftService'
import type {
  PendingSharedSignatureResult,
  SharedWalletSendResult,
} from '../../../../domains/sharedWallet/sharedWalletSigningService'
import type { CommonWallet, HardwareWalletSigner, SharedWallet } from '../../../../shared/lib/types'
import type {
  PendingSharedTransfer,
  SharedWalletSession,
  SharedWalletSigner,
} from '../../../../shared/types'

type SharedTransferPayload = Record<string, unknown> & {
  coPayers?: unknown[]
}
type SharedTransferFailure = { ok: false; errorKey?: string; cancelled?: boolean }
type CreateSharedTransferResult = CreatedSharedTransferResult | SharedTransferFailure

const logger = createLogger('sharedWalletTransactionApplicationService')

function getNestedSignerWallet(signer: SharedWalletSigner) {
  return signer.wallet && typeof signer.wallet === 'object'
    ? (signer.wallet as Record<string, unknown>)
    : {}
}

function buildCosigner(
  signer: SharedWalletSigner,
  sharedWalletAddress: string
): SharedCosignerInput | null {
  if (!signer.address) return null
  const wallet = getNestedSignerWallet(signer)

  if (signer.type === 'CommonWallet') {
    return {
      type: 'common',
      wallet: {
        ...wallet,
        address: signer.address,
        label: String(wallet.label ?? signer.label ?? signer.name ?? ''),
        publicKey: String(wallet.publicKey ?? signer.publicKey ?? signer.publickey ?? ''),
        key: String(wallet.key ?? signer.key ?? ''),
        salt: String(wallet.salt ?? signer.salt ?? ''),
        algorithm: String(wallet.algorithm ?? ''),
        parameters: (wallet.parameters as CommonWallet['parameters']) ?? { curve: '' },
        scrypt: (wallet.scrypt as CommonWallet['scrypt']) ?? {},
      } as CommonWallet,
    }
  }

  const publicKey = String(wallet.publicKey ?? signer.publicKey ?? signer.publickey ?? '')
  if (!publicKey) return null
  return {
    type: 'ledger',
    wallet: {
      ...wallet,
      address: signer.address,
      publicKey,
      neo: wallet.neo ?? signer.neo,
      acct: Number(wallet.acct ?? signer.acct ?? 0),
      sharedWalletAddress,
    } as HardwareWalletSigner & { publicKey: string; [key: string]: unknown },
  }
}

function buildSharedAdapter(
  sharedWallet: SharedWallet | SharedWalletSession,
  signer: SharedWalletSigner
) {
  const sharedAddress =
    (sharedWallet as SharedWallet).sharedWalletAddress ??
    (sharedWallet as SharedWalletSession).sharedWalletAddress ??
    ''
  const cosigner = buildCosigner(signer, sharedAddress)
  if (!cosigner) return null

  const label =
    (sharedWallet as SharedWallet).label ??
    (sharedWallet as SharedWalletSession).sharedWalletName ??
    ''
  const threshold = Number((sharedWallet as SharedWallet).requiredNumber ?? 0)
  const coPayers = (sharedWallet as { coPayers?: { publickey?: string }[] }).coPayers ?? []
  const publicKeys = coPayers.map((cp) => String(cp.publickey ?? ''))

  return WalletAdapterFactory.create({
    kind: 'shared',
    identity: { type: 'shared', address: sharedAddress, publicKey: '', label },
    threshold,
    publicKeys,
    activeCosigner: cosigner,
  })
}

export function validateSharedTransferAddress(address: string) {
  return validateWalletAddress(address)
}

export async function createAndSubmitSharedTransfer({
  network,
  sharedWallet,
  transfer,
  redeem,
  sponsorWallet,
  password,
}: {
  network: string
  sharedWallet: SharedWallet | SharedWalletSession
  transfer: SharedTransferPayload
  redeem: Record<string, unknown>
  sponsorWallet: SharedWalletSigner
  password?: string
}): Promise<CreateSharedTransferResult> {
  const adapter = buildSharedAdapter(sharedWallet, sponsorWallet)
  if (!adapter) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  try {
    const draft = await prepareSharedTransferDraft({
      sharedWallet: sharedWallet as SharedWallet,
      transfer,
      redeem,
    })
    let signedTx: Awaited<ReturnType<typeof signSharedTransactionDraft>>
    try {
      signedTx = await signSharedTransactionDraft({
        tx: draft.tx,
        adapter,
        password: sponsorWallet.type === 'CommonWallet' ? password : undefined,
        isFirstSign: true,
      })
    } catch (error: unknown) {
      logger.error('createAndSubmitSharedTransfer.sign', error)
      return {
        ok: false,
        errorKey:
          sponsorWallet.type === 'HardwareWallet' ? 'ledgerWallet.signFailed' : 'common.networkErr',
      }
    }

    if (!signedTx) {
      return sponsorWallet.type === 'CommonWallet'
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, cancelled: true }
    }

    return await submitCreatedSharedTransfer({
      network,
      sharedWallet: sharedWallet as SharedWallet,
      transfer,
      payers: (transfer.coPayers || []) as Record<string, unknown>[],
      draft: {
        ...draft,
        tx: signedTx,
      },
    })
  } catch (error: unknown) {
    logger.error('createAndSubmitSharedTransfer', error)
    return { ok: false, errorKey: 'common.networkErr' }
  }
}

export function submitPendingSharedTransferSignature({
  network,
  pendingTx,
  sharedWallet,
  currentSigner,
  password,
}: {
  network: string
  pendingTx: PendingSharedTransfer
  sharedWallet: SharedWallet | SharedWalletSession
  currentSigner: SharedWalletSigner
  password?: string
}): Promise<PendingSharedSignatureResult> {
  const adapter = buildSharedAdapter(sharedWallet, currentSigner)
  if (!adapter) {
    return Promise.resolve({ ok: false, errorKey: 'common.networkErr' })
  }
  return submitPendingSharedSignatureFromDomain({
    network,
    pendingTx,
    adapter,
    signedAddress: currentSigner.address,
    password,
  })
}

export function signSerializedSharedTransaction({
  serializedTx,
  sharedWallet,
  wallet,
  password,
  isFirstSign = false,
}: {
  serializedTx: string
  sharedWallet: SharedWallet | SharedWalletSession
  wallet: SharedWalletSigner
  password?: string
  isFirstSign?: boolean
}) {
  const adapter = buildSharedAdapter(sharedWallet, wallet)
  if (!adapter) {
    return Promise.resolve({ ok: false as const, errorKey: 'common.networkErr' })
  }
  return signSerializedSharedTransactionFromDomain({
    serializedTx,
    adapter,
    password,
    isFirstSign,
  })
}

export function createSerializedSharedInvokeTransaction({
  sharedWalletAddress,
  contractHash,
  method,
  parameters,
}: {
  sharedWalletAddress: string
  contractHash: string
  method: string
  parameters: string
}) {
  return createSerializedSharedInvokeTransactionFromDomain({
    sharedWalletAddress,
    contractHash,
    method,
    parameters,
  })
}

export function countSerializedSharedTransactionSignatures(serializedTx: string) {
  return countSerializedSharedTransactionSignaturesFromDomain(serializedTx)
}

export function sendSerializedSharedTransaction(
  serializedTx: string
): Promise<SharedWalletSendResult> {
  return sendSerializedSharedTransactionFromDomain(serializedTx)
}
