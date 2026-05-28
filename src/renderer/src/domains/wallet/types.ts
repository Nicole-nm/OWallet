export type {
  CommonWallet,
  HardwareWallet,
  SharedWallet,
  WalletCollections,
  WalletRecord,
  Identity,
} from '../../shared/lib/types'
// Note: '../../shared/lib/types' also exports a separate string-union `WalletType`.
// This file re-exports only the enum version from '../../shared/types/wallet'.
export { WalletType } from '../../shared/types/wallet'
export type {
  WalletRecord as DbWalletRecord,
  SharedWalletRecord,
  HardwareWalletRecord,
} from '../../shared/types/wallet'
export type { TrackedOep4Token } from '../../shared/types'

export interface Oep4ContractRecord {
  scriptHash: string
  name: string
  symbol: string
  decimals: number
  totalSupply?: string
}
