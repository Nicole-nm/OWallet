import { BigNumber } from 'bignumber.js'
import {
  findLocalAccount,
  getLocalCopayers,
  hasLocalCopayer,
} from '../../../../domains/wallet/walletDomainService'
import { queryPendingTransfer } from '../../../../domains/sharedWallet/sharedWalletDomainService'
import { createLogger } from '../../../../shared/lib/logger'
import { tryCatch } from '../../../../shared/lib/result'
import type {
  PendingSharedTransfer,
  SharedCopayer,
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

function stringValue(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

function booleanValue(value: unknown): boolean {
  if (typeof value === 'boolean') {
    return value
  }
  if (typeof value === 'number') {
    return value !== 0
  }
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes'].includes(normalized)) return true
    if (['false', '0', 'no'].includes(normalized)) return false
  }
  return false
}

function normalizePendingSigner(item: unknown): SharedCopayer | null {
  if (!item || typeof item !== 'object') {
    return null
  }

  const record = item as Record<string, unknown>
  const address = stringValue(record.address).trim()
  if (!address) {
    return null
  }

  const publickey = stringValue(record.publickey ?? record.publicKey).trim()

  return {
    address,
    name: stringValue(record.name).trim(),
    publickey,
    publicKey: publickey,
    isSign: booleanValue(record.isSign ?? record.is_sign ?? record.signed),
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
  const transactionIdHash = stringValue(item.transactionIdHash ?? item.transactionidhash).trim()
  const transactionBodyHash = stringValue(
    item.transactionBodyHash ?? item.transactionbodyhash
  ).trim()

  if (!transactionIdHash || !transactionBodyHash) {
    return null
  }

  const assetName = stringValue(item.assetName)
  const rawAmount = item.amount === undefined || item.amount === null ? 0 : stringValue(item.amount)
  const amount =
    assetName.toLowerCase() === 'ong' ? new BigNumber(rawAmount).div(1e9).toFixed(9) : rawAmount

  return {
    amount,
    assetName,
    receiveaddress: stringValue(item.receiveaddress ?? item.receiveAddress),
    sendaddress: stringValue(item.sendaddress ?? item.sendAddress),
    gasprice: (item.gasprice ?? item.gasPrice ?? 0) as string | number,
    gaslimit: (item.gaslimit ?? item.gasLimit ?? 0) as string | number,
    coPayerSignDtos: normalizePendingSigners(
      item.coPayerSignDtos ?? item.coPayerSignVOS ?? item.coPayerSignVos
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
    type: stringValue(account.type),
    address: stringValue(account.wallet.address),
    publicKey: stringValue(account.wallet.publicKey ?? account.wallet.publickey),
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
