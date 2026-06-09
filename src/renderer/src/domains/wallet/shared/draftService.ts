import { BigNumber } from 'bignumber.js'
import {
  GAS_LIMIT,
  getOntPassHost,
  ONT_PASS_API_PATHS,
  resolveDefaultGasPrice,
} from '../../../shared/lib/constants'
import { convertTransferFeeToGasPrice } from '../../../shared/lib/transferGas'
import httpClient from '../../../shared/network/httpClient'
import { createInvokeTransaction, createSdkParameter } from '../../../shared/chain/transactionSdk'
import { createSdkAddress } from '../../../shared/chain/walletSdk'
import { reverseHex } from '../../../shared/chain/sdkHex'
import type { SdkTransactionLike } from '../../../shared/chain/types'
import {
  buildClaimOng,
  buildNativeTransfer,
  buildOep4Transfer,
} from '../../transaction/assetBuilder'
import { serializeTx } from '../../transaction/serializationService'
import type { SharedWallet } from '../../../shared/lib/types'

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface SharedTransactionDraft {
  tx: SdkTransactionLike
  amount: string
  gasPrice: string
  gasLimit: string
  tokenType: string
}

export type CreatedSharedTransferResult =
  | { ok: true; txHash: string; serializedTx: string; response: HttpBody }
  | { ok: false; errorKey: string; response: HttpBody }

type HttpBody = Record<string, unknown>
type HttpQueryParams = Record<string, string | number | boolean | undefined | null>
type SharedTransferPayerBody = {
  address?: string
  name?: string
  publickey?: string
}

interface SharedTransferInput extends HttpBody {
  asset?: string
  isRedeem?: boolean
  gas?: string | number
  amount?: string | number
  to?: string
  decimal?: number
  scriptHash?: string
}

interface SharedRedeemInput extends HttpBody {
  claimableOng?: string | number
}

interface InvokeParameterDraft {
  type: string
  value: string
}

function parseInvokeParameters(parameters: string): InvokeParameterDraft[] {
  if (!parameters) return []
  let parsed: unknown
  try {
    parsed = JSON.parse(parameters)
  } catch {
    throw new Error('Invalid invoke parameters: expected a JSON array')
  }
  return Array.isArray(parsed) ? (parsed as InvokeParameterDraft[]) : []
}

function stringifyPayerField(value: unknown): string | undefined {
  if (value === undefined || value === null) {
    return undefined
  }

  const normalized = String(value).trim()
  return normalized || undefined
}

function normalizeSharedTransferPayer(payer: unknown): SharedTransferPayerBody | null {
  if (typeof payer === 'string') {
    const address = stringifyPayerField(payer)
    return address ? { address } : null
  }

  if (!payer || typeof payer !== 'object') {
    return null
  }

  const record = payer as Record<string, unknown>
  const normalized: SharedTransferPayerBody = {}
  const address = stringifyPayerField(record.address)
  const name = stringifyPayerField(record.name ?? record.label)
  const publickey = stringifyPayerField(record.publickey ?? record.publicKey)

  if (address) normalized.address = address
  if (name) normalized.name = name
  if (publickey) normalized.publickey = publickey

  return Object.keys(normalized).length > 0 ? normalized : null
}

function normalizeSharedTransferPayers(payers: unknown[] = []): SharedTransferPayerBody[] {
  return payers
    .map((payer) => normalizeSharedTransferPayer(payer))
    .filter((payer): payer is SharedTransferPayerBody => payer !== null)
}

// ---------------------------------------------------------------------------
// HTTP thin wrappers
// ---------------------------------------------------------------------------

export function createSharedWallet(network: string, body: HttpBody) {
  return httpClient.post(getOntPassHost(network) + ONT_PASS_API_PATHS.CreateSharedWallet, body, {
    silent: true,
  })
}

export function querySharedWallet(network: string, sharedWalletAddress: string) {
  return httpClient.get(getOntPassHost(network) + ONT_PASS_API_PATHS.QuerySharedWallet, {
    params: { sharedWalletAddress },
  })
}

export function createSharedTransfer(network: string, body: HttpBody) {
  return httpClient.post(getOntPassHost(network) + ONT_PASS_API_PATHS.CreateSharedTransfer, body, {
    silent: true,
  })
}

export function queryPendingTransfer(network: string, params: HttpQueryParams) {
  return httpClient.get(getOntPassHost(network) + ONT_PASS_API_PATHS.QueryPendingTransfer, {
    params,
  })
}

// ---------------------------------------------------------------------------
// Draft creation
// ---------------------------------------------------------------------------

type SharedDraftParts = { tx: SdkTransactionLike; amount: string; gasPrice: string }

async function buildRedeemDraft(
  sharedAddress: string,
  redeem: SharedRedeemInput
): Promise<SharedDraftParts> {
  const gasPrice = resolveDefaultGasPrice('shared')
  const claimableOng = redeem.claimableOng ?? 0
  const amount = new BigNumber(claimableOng).multipliedBy(1e9).toString()
  const tx = await buildClaimOng(sharedAddress, claimableOng, gasPrice, GAS_LIMIT)
  return { tx, amount, gasPrice }
}

async function buildNativeDraft(
  tokenType: 'ONT' | 'ONG',
  sharedAddress: string,
  transfer: SharedTransferInput
): Promise<SharedDraftParts> {
  const gasPrice = convertTransferFeeToGasPrice(transfer.gas ?? 0, GAS_LIMIT)
  const amount =
    tokenType === 'ONT'
      ? String(transfer.amount ?? '')
      : new BigNumber(transfer.amount ?? 0).multipliedBy(1e9).toString()
  const tx = await buildNativeTransfer(
    tokenType,
    sharedAddress,
    String(transfer.to || ''),
    transfer.amount ?? 0,
    sharedAddress,
    gasPrice,
    GAS_LIMIT
  )
  return { tx, amount, gasPrice }
}

async function buildOep4Draft(
  sharedAddress: string,
  transfer: SharedTransferInput
): Promise<SharedDraftParts> {
  const gasPrice = convertTransferFeeToGasPrice(transfer.gas ?? 0, GAS_LIMIT)
  const amount = new BigNumber(transfer.amount ?? 0)
    .multipliedBy(Math.pow(10, transfer.decimal ?? 0))
    .toString()
  const tx = await buildOep4Transfer(
    String(transfer.scriptHash || ''),
    sharedAddress,
    String(transfer.to || ''),
    transfer.amount ?? 0,
    transfer.decimal ?? 0,
    sharedAddress,
    gasPrice,
    GAS_LIMIT
  )
  return { tx, amount, gasPrice }
}

export async function prepareSharedTransferDraft({
  sharedWallet,
  transfer,
  redeem,
}: {
  sharedWallet: SharedWallet
  transfer: SharedTransferInput
  redeem: SharedRedeemInput
}): Promise<SharedTransactionDraft> {
  const sharedAddress = sharedWallet.sharedWalletAddress
  const tokenType = String(transfer.asset || '')

  let parts: SharedDraftParts
  if (transfer.isRedeem) {
    parts = await buildRedeemDraft(sharedAddress, redeem)
  } else if (tokenType === 'ONT' || tokenType === 'ONG') {
    parts = await buildNativeDraft(tokenType, sharedAddress, transfer)
  } else {
    parts = await buildOep4Draft(sharedAddress, transfer)
  }

  return { ...parts, gasLimit: GAS_LIMIT, tokenType }
}

export async function submitCreatedSharedTransfer({
  network,
  sharedWallet,
  transfer,
  payers,
  draft,
}: {
  network: string
  sharedWallet: SharedWallet
  transfer: SharedTransferInput
  payers: unknown[]
  draft: SharedTransactionDraft
}): Promise<CreatedSharedTransferResult> {
  const txHash = reverseHex(draft.tx.getHash())
  const txData = serializeTx(draft.tx, 'sharedWallet.submitCreatedSharedTransfer.serialize')
  const response = (await createSharedTransfer(network, {
    sendAddress: sharedWallet.sharedWalletAddress,
    receiveAddress: transfer.isRedeem ? sharedWallet.sharedWalletAddress : transfer.to,
    assetName: draft.tokenType,
    amount: draft.tokenType === 'ONT' || draft.tokenType === 'ONG' ? draft.amount : transfer.amount,
    gasLimit: draft.gasLimit,
    gasPrice: draft.gasPrice,
    transactionIdHash: txHash,
    transactionBodyHash: txData,
    coPayers: normalizeSharedTransferPayers(payers),
  })) as HttpBody

  if (response && response.Error && response.Error !== 0) {
    return { ok: false, errorKey: 'sharedWalletHome.createTransferFailed', response }
  }

  return { ok: true, txHash, serializedTx: txData, response }
}

export async function createSerializedSharedInvokeTransaction({
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
  const trimmedContractHash = contractHash.trim()
  const trimmedMethod = method.trim()
  const invokeParameters = await Promise.all(
    parseInvokeParameters(parameters).map(async (item) => {
      if (item.type === 'Address') {
        const address = await createSdkAddress(item.value.trim())
        return createSdkParameter('', item.type, address.serialize())
      }
      return createSdkParameter('', item.type, item.value)
    })
  )

  const contractAddress = await createSdkAddress(reverseHex(trimmedContractHash))
  const payer = await createSdkAddress(sharedWalletAddress)
  const tx = await createInvokeTransaction(
    trimmedMethod,
    invokeParameters,
    contractAddress,
    resolveDefaultGasPrice('shared'),
    GAS_LIMIT,
    payer
  )
  return serializeTx(
    tx as unknown as SdkTransactionLike,
    'sharedWallet.createSerializedSharedInvokeTransaction.serialize'
  )
}
