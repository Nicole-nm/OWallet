import { logger } from '../../shared/lib/logger'
import type { SdkTransactionLike } from '../../shared/chain/types'

interface SerializableTxSignature {
  M?: number
  pubKeys?: Array<{ serializeHex?: () => string }>
  sigData?: string[]
}

export function summarizeTx(tx: SdkTransactionLike | null | undefined) {
  return {
    hasPayload: Boolean(tx?.payload),
    sigCount: Array.isArray(tx?.sigs) ? tx.sigs.length : 0,
    sigs: Array.isArray(tx?.sigs)
      ? (tx.sigs as SerializableTxSignature[]).map((sig) => ({
          m: sig?.M,
          pubKeyCount: Array.isArray(sig?.pubKeys) ? sig.pubKeys.length : 0,
          pubKeys: Array.isArray(sig?.pubKeys)
            ? sig.pubKeys.map((pk) => {
                try {
                  return pk?.serializeHex?.() || ''
                } catch {
                  return ''
                }
              })
            : [],
          sigDataCount: Array.isArray(sig?.sigData) ? sig.sigData.length : 0,
          sigData: Array.isArray(sig?.sigData) ? sig.sigData : [],
        }))
      : [],
  }
}

export function serializeTx(tx: SdkTransactionLike, context = 'transaction.serialize') {
  try {
    return tx.serialize()
  } catch (err: unknown) {
    logger.error(context, summarizeTx(tx))
    throw err
  }
}
