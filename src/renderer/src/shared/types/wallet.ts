export enum WalletType {
  CommonWallet = 'CommonWallet',
  SharedWallet = 'SharedWallet',
  HardwareWallet = 'HardwareWallet',
}

export interface WalletRecord {
  address: string
  label: string
  name: string
  publicKey: string
  type?: WalletType
  key?: string
}

export interface CurrentWalletRecord extends Partial<WalletRecord> {
  address: string
  label: string
  name: string
  publicKey: string
  coPayers: string[]
  requiredNumber: string
  totalNumber: string
  sharedWalletAddress?: string
}

export interface SharedWalletRecord extends WalletRecord {
  coPayers: string[]
  requiredNumber: number | string
  totalNumber: number | string
  sharedWalletAddress?: string
}

export interface HardwareWalletRecord extends WalletRecord {
  isHardwareLogin?: boolean
}

export interface WalletBalance {
  ont: number
  ong: number
  waitBoundOng?: number
  unboundOng?: number
}

export interface SharedCopayer {
  address: string
  name: string
  publickey?: string
  publicKey?: string
  isSign?: boolean
  [key: string]: unknown
}

export interface SharedWalletSession {
  sharedWalletAddress: string
  sharedWalletName: string
  coPayers: SharedCopayer[]
  requiredNumber: number | string
  totalNumber: number | string
  address?: string
  label?: string
  name?: string
  publicKey?: string
  type?: WalletType | string
  [key: string]: unknown
}

export interface SharedWalletSigner {
  type: string
  address: string
  publicKey: string
  key?: string
  salt?: string
  acct?: number
  neo?: boolean
  label?: string
  name?: string
  [key: string]: unknown
}

export interface PendingSharedTransfer {
  amount: string | number
  assetName: string
  receiveaddress: string
  sendaddress: string
  gasprice: string | number
  gaslimit: string | number
  coPayerSignDtos: SharedCopayer[]
  transactionbodyhash: string
  transactionidhash: string
  [key: string]: unknown
}

export interface TransferState {
  balance: { ont: number; ong: number }
  oep4s: unknown[]
  from: string
  to: string
  amount: number
  asset: string
  gas: number
  coPayers: Array<string | SharedCopayer>
  sponsorPayer: string
  isRedeem: boolean
  scriptHash?: string
  decimal?: number
}

export interface Oep4Token {
  contractHash: string
  name: string
  symbol: string
  decimals: number
  balance?: string | number
}

export interface TrackedOep4Token extends Oep4Token {
  contract_hash?: string
  decimal?: number
  selected?: boolean
  net?: string
  [key: string]: unknown
}

export type Oep4TokenMap = Record<string, TrackedOep4Token>

export type Oep4TokensByNetwork = Record<string, Oep4TokenMap>

export interface LedgerWalletSelection {
  address: string
  publicKey: string
  acct?: number
  neo?: boolean | number
  timestamp?: number
}

export interface ImportedDatWalletAccount {
  address?: string
  [key: string]: unknown
}

export interface ImportedDatWallet {
  accounts: ImportedDatWalletAccount[]
  [key: string]: unknown
}
