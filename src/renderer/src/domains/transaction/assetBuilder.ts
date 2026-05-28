import { BigNumber } from 'bignumber.js'
import { GAS_LIMIT, GAS_PRICE } from '../../shared/lib/constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import type { SdkTransactionLike } from '../../shared/chain/types'

export async function buildNativeTransfer(
  asset: string,
  from: string,
  to: string,
  amount: number | string,
  payer?: string,
  gasPrice = GAS_PRICE,
  gasLimit = GAS_LIMIT
): Promise<SdkTransactionLike> {
  const { Crypto, OntAssetTxBuilder } = await loadOntologySdk()
  const fromAddr = new Crypto.Address(from)
  const toAddr = new Crypto.Address(to)
  const payerAddr = payer ? new Crypto.Address(payer) : fromAddr
  const sdkAmount =
    asset === 'ONG' ? new BigNumber(amount).multipliedBy(1e9).toString() : String(amount)

  return OntAssetTxBuilder.makeTransferTx(
    asset,
    fromAddr,
    toAddr,
    sdkAmount,
    gasPrice,
    gasLimit,
    payerAddr
  ) as unknown as SdkTransactionLike
}

export async function buildOep4Transfer(
  scriptHash: string,
  from: string,
  to: string,
  amount: number | string,
  decimal: number,
  payer?: string,
  gasPrice = GAS_PRICE,
  gasLimit = GAS_LIMIT
): Promise<SdkTransactionLike> {
  const { Crypto, Oep4, utils } = await loadOntologySdk()
  const contractAddr = new Crypto.Address(utils.reverseHex(scriptHash))
  const oep4 = new Oep4.Oep4TxBuilder(contractAddr)
  const fromAddr = new Crypto.Address(from)
  const toAddr = new Crypto.Address(to)
  const payerAddr = payer ? new Crypto.Address(payer) : fromAddr
  const sdkAmount = new BigNumber(amount).multipliedBy(Math.pow(10, decimal)).toString()

  return oep4.makeTransferTx(
    fromAddr,
    toAddr,
    sdkAmount,
    gasPrice,
    gasLimit,
    payerAddr
  ) as unknown as SdkTransactionLike
}

export async function buildClaimOng(
  address: string,
  ongAmount: number | string,
  gasPrice = GAS_PRICE,
  gasLimit = GAS_LIMIT
): Promise<SdkTransactionLike> {
  const { Crypto, OntAssetTxBuilder } = await loadOntologySdk()
  const addr = new Crypto.Address(address)
  const amount = new BigNumber(ongAmount).multipliedBy(1e9).toString()
  return OntAssetTxBuilder.makeWithdrawOngTx(
    addr,
    addr,
    amount,
    addr,
    gasPrice,
    gasLimit
  ) as unknown as SdkTransactionLike
}
