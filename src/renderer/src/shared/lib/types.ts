/**
 * Shared domain types for the OWallet renderer process.
 * Provides type safety across domains, modules, workflows, and stores.
 */

// ---------------------------------------------------------------------------
// Network
// ---------------------------------------------------------------------------

export type NetworkId = 'TEST_NET' | 'MAIN_NET'

// ---------------------------------------------------------------------------
// Wallet
// ---------------------------------------------------------------------------

export interface WalletBase {
  address: string
  label: string
  publicKey: string
}

export interface CommonWallet extends WalletBase {
  key: string
  salt: string
  algorithm: string
  parameters: { curve: string }
  scrypt: ScryptParams
}

export interface HardwareWallet extends WalletBase {
  neo: number | boolean
  acct: number
  timestamp?: number
}

export interface SharedWallet extends WalletBase {
  sharedWalletAddress: string
  coPayers: Copayer[]
  requiredNumber: string
  totalNumber: string
}

export interface Copayer {
  name: string
  publickey: string
  address: string
}

export interface WalletCollections {
  normalWallets: CommonWallet[]
  sharedWallets: SharedWallet[]
  hardwareWallets: HardwareWallet[]
}

export type WalletRecord = CommonWallet | HardwareWallet | SharedWallet

export type HardwareWalletSigner = Pick<WalletBase, 'address'> &
  Partial<Omit<HardwareWallet, 'address'>>

export type WalletSigner = CommonWallet | HardwareWalletSigner

export type WalletType = 'CommonWallet' | 'SharedWallet' | 'HardwareWallet'

export function isCommonWallet(wallet: unknown): wallet is CommonWallet {
  return Boolean(
    wallet &&
    typeof wallet === 'object' &&
    'key' in wallet &&
    typeof (wallet as { key?: unknown }).key === 'string'
  )
}

export function isHardwareWallet(wallet: unknown): wallet is HardwareWalletSigner {
  return Boolean(
    wallet &&
    typeof wallet === 'object' &&
    !('key' in wallet) &&
    'address' in wallet &&
    typeof (wallet as { address?: unknown }).address === 'string'
  )
}

// ---------------------------------------------------------------------------
// Identity
// ---------------------------------------------------------------------------

export interface ScryptParams {
  n?: number
  p?: number
  r?: number
  dkLen?: number
  cost?: number
  blockSize?: number
  parallel?: number
  size?: number
}

export interface IdentityControl {
  key: string
  salt: string
  address: string
}

export interface Identity {
  ontid: string
  label: string
  controls: IdentityControl[]
  scrypt?: ScryptParams
}

// ---------------------------------------------------------------------------
// Balance & Transfer
// ---------------------------------------------------------------------------

export interface NativeBalance {
  ont: string
  ong: string
  waitBoundOng?: string
  unboundOng?: string
}

export interface TransferParams {
  asset: string
  to: string
  amount: number | string
  gasPrice: number | string
  gasLimit: number | string
  scriptHash?: string
  decimal?: number
}

// ---------------------------------------------------------------------------
// Transaction
// ---------------------------------------------------------------------------

export interface SendResult {
  ok: boolean
  response?: unknown
  txHash?: string
  messageKey?: string
  detail?: string
  message?: string | null
  sentToChain?: boolean
}

export interface SignResult {
  ok: boolean
  messageKey?: string
  cancelled?: boolean
  message?: string | null
}

// ---------------------------------------------------------------------------
// Governance
// ---------------------------------------------------------------------------

export interface AuthorizationInfo {
  consensusPos: number
  freezePos: number
  newPos: number
  withdrawPos: number
  withdrawFreezePos: number
  withdrawUnfreezePos: number
}

export interface FormattedAuthorizationInfo {
  inAuthorization: string
  locked: string
  claimable: string
  claimableVal: number
  newStakePortion: string
  receiveProfitPortion: string
}

export interface StakeHistoryRecord extends FormattedAuthorizationInfo {
  name: string
  pk: string
  stakeWallet: string
}

export interface NodeInfo {
  name: string
  address: string
  public_key: string
  status?: number
}

// ---------------------------------------------------------------------------
// Market
// ---------------------------------------------------------------------------

export interface ExchangeRateResponse {
  Result?: {
    Money?: number | string
  }
}

// ---------------------------------------------------------------------------
// Wallet Option (UI select)
// ---------------------------------------------------------------------------

export interface WalletOption {
  label: string
  value: string
  address: string
  publicKey: string
}

export interface StakeWalletOption extends WalletOption {
  timestamp?: number
  acct?: number
}
