export interface VoteStringReader {
  readVarUint: () => number
  read: (len: number) => string
  readUint128: () => number | bigint
  readUint64: () => number | bigint
  readUint8: () => number
  readH256: () => string
  readBoolean?: () => boolean
}

export interface VoteCrypto {
  Address: new (addr: string) => { toBase58: () => string }
}

export interface VoteUtils {
  StringReader: new (data: string) => VoteStringReader
  hexstr2str: (hex: string) => string
  reverseHex: (v: string) => string
}

export interface VoteSdkContext {
  Crypto: VoteCrypto
  utils: VoteUtils
}

export interface VoteStringReaderWithBoolean extends VoteStringReader {
  readBoolean: () => boolean
}

export interface VoteUtilsWithBoolean extends VoteUtils {
  StringReader: new (data: string) => VoteStringReaderWithBoolean
}
