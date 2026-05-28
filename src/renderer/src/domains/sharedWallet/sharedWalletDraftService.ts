import { BigNumber } from 'bignumber.js'
import {
  GAS_LIMIT,
  GAS_PRICE,
  getOntPassHost,
  ONT_PASS_API_PATHS,
} from '../../shared/lib/constants'
import { convertTransferFeeToGasPrice } from '../../shared/lib/transferGas'
import httpClient from '../../shared/network/httpClient'
import { createInvokeTransaction, createSdkParameter } from '../../shared/chain/transactionSdk'
import { createSdkAddress } from '../../shared/chain/walletSdk'
import { reverseHex } from '../../shared/chain/sdkHex'
import type { SdkTransactionLike } from '../../shared/chain/types'
import { buildClaimOng, buildNativeTransfer, buildOep4Transfer } from '../transaction/assetBuilder'
import { serializeTx } from '../transaction/serializationService'
import type { SharedWallet } from '../../shared/lib/types'

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
  | { ok: false; messageKey: string; response: HttpBody }

type HttpBody = Record<string, unknown>

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

export function queryPendingTransfer(network: string, params: HttpBody) {
  return httpClient.post(getOntPassHost(network) + ONT_PASS_API_PATHS.QueryPendingTransfer, params)
}

// ---------------------------------------------------------------------------
// Draft creation
// ---------------------------------------------------------------------------

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
  const gasLimit = GAS_LIMIT
  let gasPrice: string
  let amount: string
  let tx: SdkTransactionLike

  if (transfer.isRedeem) {
    gasPrice = GAS_PRICE
    const claimableOng = redeem.claimableOng ?? 0
    amount = new BigNumber(claimableOng).multipliedBy(1e9).toString()
    tx = await buildClaimOng(sharedAddress, claimableOng, gasPrice, gasLimit)
  } else {
    gasPrice = convertTransferFeeToGasPrice(transfer.gas ?? 0, gasLimit)

    if (tokenType === 'ONT' || tokenType === 'ONG') {
      amount =
        tokenType === 'ONT'
          ? String(transfer.amount ?? '')
          : new BigNumber(transfer.amount ?? 0).multipliedBy(1e9).toString()
      tx = await buildNativeTransfer(
        tokenType,
        sharedAddress,
        String(transfer.to || ''),
        transfer.amount ?? 0,
        sharedAddress,
        gasPrice,
        gasLimit
      )
    } else {
      amount = new BigNumber(transfer.amount ?? 0)
        .multipliedBy(Math.pow(10, transfer.decimal ?? 0))
        .toString()
      tx = await buildOep4Transfer(
        String(transfer.scriptHash || ''),
        sharedAddress,
        String(transfer.to || ''),
        transfer.amount ?? 0,
        transfer.decimal ?? 0,
        sharedAddress,
        gasPrice,
        gasLimit
      )
    }
  }

  return {
    tx,
    amount: amount!,
    gasPrice,
    gasLimit,
    tokenType,
  }
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
  payers: HttpBody[]
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
    coPayers: payers,
  })) as HttpBody

  if (response && response.Error && response.Error !== 0) {
    return { ok: false, messageKey: 'sharedWalletHome.createTransferFailed', response }
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
  const parsedParameters = parameters ? JSON.parse(parameters) : []
  const invokeParameters = await Promise.all(
    (Array.isArray(parsedParameters) ? parsedParameters : []).map(
      async (item: InvokeParameterDraft) => {
        if (item.type === 'Address') {
          const address = await createSdkAddress(item.value.trim())
          return createSdkParameter('', item.type, address.serialize())
        }
        return createSdkParameter('', item.type, item.value)
      }
    )
  )

  const contractAddress = await createSdkAddress(reverseHex(trimmedContractHash))
  const payer = await createSdkAddress(sharedWalletAddress)
  const tx = await createInvokeTransaction(
    trimmedMethod,
    invokeParameters,
    contractAddress,
    GAS_PRICE,
    GAS_LIMIT,
    payer
  )
  return serializeTx(
    tx as unknown as SdkTransactionLike,
    'sharedWallet.createSerializedSharedInvokeTransaction.serialize'
  )
}
