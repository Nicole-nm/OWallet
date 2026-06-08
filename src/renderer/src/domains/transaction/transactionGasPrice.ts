import type { SdkTransactionLike } from '../../shared/chain/types'

export function assertTransactionGasPrice(tx: SdkTransactionLike) {
  if (!tx.gasPrice) {
    throw new Error('Transaction gas price is unavailable')
  }
}

export function setUnsignedTransactionGasPrice(tx: SdkTransactionLike, gasPrice: string) {
  if (tx.sigs?.some((signature) => signature.sigData?.length)) {
    throw new Error('Cannot change gas price after transaction signing')
  }
  if (!tx.gasPrice) {
    throw new Error('Transaction gas price is unavailable')
  }

  tx.gasPrice = new tx.gasPrice.constructor(gasPrice) as SdkTransactionLike['gasPrice']
  return tx
}
