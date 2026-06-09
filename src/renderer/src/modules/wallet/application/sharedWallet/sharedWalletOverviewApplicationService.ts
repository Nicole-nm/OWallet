import { BigNumber } from 'bignumber.js'
import {
  findLocalAccount,
  getLocalCopayers,
  hasLocalCopayer,
} from '../../../../domains/wallet/walletDomainService'
import {
  createSharedWallet,
  queryPendingTransfer,
  querySharedWallet,
} from '../../../../domains/wallet/shared'
import { asBoolean, asString, pick } from '../../../../shared/lib/coercion'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import type {
  PendingSharedTransfer,
  SharedCopayer,
  SharedWalletSession,
  SharedWalletSigner,
} from '../../../../shared/types'

const logger = createLogger('sharedWalletOverviewApplicationService')

interface PendingSharedTransferParams {
  network: string
  sharedWalletAddress: string
}

type PendingSharedTransferResponse = {
  SigningSharedTransfers?: Array<
    Record<string, unknown> & { assetName?: string; amount?: string | number }
  >
}

function normalizePendingSigner(item: unknown): SharedCopayer | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  const address = asString(record.address).trim()
  if (!address) {
    return null
  }

  const publickey = asString(pick(record, 'publickey', 'publicKey')).trim()

  return {
    address,
    name: asString(record.name).trim(),
    publickey,
    publicKey: publickey,
    isSign: asBoolean(pick(record, 'isSign', 'is_sign', 'signed')),
  }
}

function normalizePendingSigners(value: unknown): SharedCopayer[] {
  if (!Array.isArray(value)) {
    return []
  }

  return value
    .map((item) => normalizePendingSigner(item))
    .filter((item): item is SharedCopayer => item !== null)
}

function normalizePendingSharedTransfer(
  item: Record<string, unknown>
): PendingSharedTransfer | null {
  const transactionIdHash = asString(pick(item, 'transactionIdHash', 'transactionidhash')).trim()
  const transactionBodyHash = asString(
    pick(item, 'transactionBodyHash', 'transactionbodyhash')
  ).trim()

  if (!transactionIdHash || !transactionBodyHash) {
    return null
  }

  const assetName = asString(item.assetName)
  const rawAmount = item.amount === undefined || item.amount === null ? 0 : asString(item.amount)
  const amount =
    assetName.toLowerCase() === 'ong' ? new BigNumber(rawAmount).div(1e9).toString() : rawAmount

  return {
    amount,
    assetName,
    receiveaddress: asString(pick(item, 'receiveaddress', 'receiveAddress')),
    sendaddress: asString(pick(item, 'sendaddress', 'sendAddress')),
    gasprice: (pick(item, 'gasprice', 'gasPrice') ?? 0) as string | number,
    gaslimit: (pick(item, 'gaslimit', 'gasLimit') ?? 0) as string | number,
    coPayerSignDtos: normalizePendingSigners(
      pick(item, 'coPayerSignDtos', 'coPayerSignVOS', 'coPayerSignVos')
    ),
    transactionBodyHash,
    transactionIdHash,
  }
}

function localAccountToSigner(account?: {
  type?: string
  wallet?: Record<string, unknown>
}): SharedWalletSigner | null {
  if (!account?.wallet) {
    return null
  }

  return {
    ...account.wallet,
    type: asString(account.type),
    address: asString(account.wallet.address),
    publicKey: asString(pick(account.wallet, 'publicKey', 'publickey')),
  }
}

export async function loadPendingSharedTransfers({
  network,
  sharedWalletAddress,
}: PendingSharedTransferParams) {
  return tryCatch(
    async () => {
      const result = (await queryPendingTransfer(network, {
        sharedAddress: sharedWalletAddress,
        assetName: '',
        beforeTimeStamp: Date.now(),
      })) as PendingSharedTransferResponse
      return {
        transfers: (result.SigningSharedTransfers || [])
          .map((item) => normalizePendingSharedTransfer(item))
          .filter((item): item is PendingSharedTransfer => item !== null),
      }
    },
    {
      context: 'loadPendingSharedTransfers',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ transfers: [] as PendingSharedTransfer[] }),
    }
  )
}

export async function loadLocalSharedCopayers(copayers: SharedCopayer[] = []) {
  return tryCatch(async () => ({ copayers: await getLocalCopayers(copayers) }), {
    context: 'loadLocalSharedCopayers',
    errorKey: 'common.networkErr',
    logger,
    onFailure: () => ({ copayers: [] as SharedCopayer[] }),
  })
}

export async function findLocalSharedSigner(address: string) {
  return tryCatch(
    async () => {
      const account = await findLocalAccount(address)
      return {
        signer: localAccountToSigner(
          account as { type?: string; wallet?: Record<string, unknown> } | undefined
        ),
      }
    },
    {
      context: 'findLocalSharedSigner',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ signer: null }),
    }
  )
}

export async function findNextLocalSharedSigner(copayers: SharedCopayer[] = []) {
  return tryCatch(
    async () => {
      const unsignedCopayers = copayers.filter((copayer) => copayer.isSign !== true)
      const localCopayers = await getLocalCopayers(unsignedCopayers)
      const nextLocalCopayer = localCopayers[0] as
        | { type?: string; wallet?: Record<string, unknown> }
        | undefined

      return { signer: localAccountToSigner(nextLocalCopayer) }
    },
    {
      context: 'findNextLocalSharedSigner',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ signer: null }),
    }
  )
}

export async function checkSharedWalletHasLocalCopayer(copayers: SharedCopayer[] = []) {
  return tryCatch(async () => ({ hasLocalCopayer: await hasLocalCopayer(copayers) }), {
    context: 'checkSharedWalletHasLocalCopayer',
    errorKey: 'common.networkErr',
    logger,
    onFailure: () => ({ hasLocalCopayer: false }),
  })
}

export async function checkSharedWalletRegistrationStatus(
  network: string,
  sharedWalletAddress: string
) {
  return tryCatch(
    async () => {
      const result = (await querySharedWallet(network, sharedWalletAddress)) as {
        sharedWalletAddress?: string
      }
      return { registered: Boolean(result?.sharedWalletAddress) }
    },
    {
      context: 'checkSharedWalletRegistrationStatus',
      errorKey: 'common.networkErr',
      logger,
      onFailure: () => ({ registered: false }),
    }
  )
}

export async function registerSharedWalletOnNetwork(
  network: string,
  sharedWallet: SharedWalletSession
) {
  return tryCatch(
    async () => {
      const body = {
        sharedWalletAddress: sharedWallet.sharedWalletAddress,
        sharedWalletName: sharedWallet.sharedWalletName,
        totalNumber: Number(sharedWallet.totalNumber),
        requiredNumber: Number(sharedWallet.requiredNumber),
        coPayers: (sharedWallet.coPayers || []).map((payer) => ({
          name: String(payer.name || ''),
          publickey: String(payer.publickey || payer.publicKey || ''),
          address: String(payer.address || ''),
        })),
      }
      const response = (await createSharedWallet(network, body)) as { Error?: number } | undefined
      if (response?.Error !== 0) {
        return { ok: false as const, errorKey: 'sharedWalletHome.registerFailed' }
      }
      return { ok: true as const }
    },
    {
      context: 'registerSharedWalletOnNetwork',
      errorKey: 'sharedWalletHome.registerFailed',
      logger,
      onFailure: () => ({ ok: false as const, errorKey: 'sharedWalletHome.registerFailed' }),
    }
  )
}
