import type { ScryptParams } from '../lib/types'

export interface SdkAddressLike {
  serialize(): string
}

export interface SdkPublicKeyLike {
  serializeHex(): string
}

export interface SdkSignatureLike {
  serializeHex(): string
}

export interface SdkPrivateKeyLike {
  decrypt(
    password: string,
    address: SdkAddressLike,
    salt: string,
    scrypt: ScryptParams
  ): Promise<unknown> | unknown
  serializeWIF(): string
  getPublicKey(): SdkPublicKeyLike
  sign(data: unknown, schema?: unknown): SdkSignatureLike
  algorithm?: { defaultSchema?: unknown }
}

export interface SdkTxSignatureLike {
  M?: number
  pubKeys?: SdkPublicKeyLike[]
  sigData?: string[]
}

export interface SdkTransactionPayloadLike {
  code?: string
}

export interface SdkTransactionLike {
  [key: string]: unknown
  payer?: unknown
  // The SDK exposes `gasPrice` as a class instance whose constructor accepts a
  // numeric/string price. The signing flow re-binds the field, so we only need
  // structural access to `.constructor`. Typed as `object` since SDK declares
  // it as the unbounded `Function` (banned by lint), and we never invoke it.
  gasPrice?: { constructor: new (price: string | number) => unknown }
  sigs?: SdkTxSignatureLike[]
  payload?: SdkTransactionPayloadLike
  serializeUnsignedData(): Uint8Array | Buffer | string
  serialize(): string
  getHash(): string
}

export interface SerializedWalletLike {
  key: string
  address: string
  salt: string
  [key: string]: unknown
}

export interface SdkTransactionResponseLike {
  Error?: number
  Result?: string
  [key: string]: unknown
}
