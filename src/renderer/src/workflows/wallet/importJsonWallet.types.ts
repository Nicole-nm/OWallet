import type { Ref } from 'vue'
import type { ImportedDatWallet } from '../../shared/types'

export const IMPORT_JSON_VALIDATION_FIELDS = [
  'wifLabel',
  'wif',
  'wifPassword',
  'wifRePassword',
  'mnemonic',
  'mnemonicPassword',
  'mnemonicRePassword',
  'pk',
  'pkPassword',
  'pkRePassword',
] as const

export type ImportJsonValidationField = (typeof IMPORT_JSON_VALIDATION_FIELDS)[number]
export type ImportJsonTabName = 'pk' | 'dat' | 'wif' | 'mnemonic'

export interface ImportJsonWalletAccount extends Record<string, unknown> {
  address?: string
  publicKey?: string
  label?: string
  key?: string
  salt?: string
}

export interface ImportJsonWalletForm {
  tabName: ImportJsonTabName
  pk: string
  pkLabel: string
  pkPassword: string
  pkRePassword: string
  datPath: string
  datWallet: ImportedDatWallet | null
  datLabel: string[]
  datPassword: string[]
  wif: string
  wifLabel: string
  wifPassword: string
  wifRePassword: string
  mnemonic: string
  mnemonicLabel: string
  mnemonicPassword: string
  mnemonicRePassword: string
  confirmModal: boolean
}

export type ImportJsonWalletValidationErrors = Record<ImportJsonValidationField, string>
export type ImportJsonWalletField = keyof ImportJsonWalletForm

export interface ImportJsonDatAccount extends Record<string, unknown> {
  key: string
  address: string
  salt: string
}

export interface ImportJsonDatEntry {
  sourceAccount: ImportJsonDatAccount
  label: string
  password: string
}

export interface LoadingStoreLike {
  showLoadingModals(): void
  hideLoadingModals(): void
}

export interface ImportJsonNotify {
  (message: string, options?: { literal?: boolean }): void
}

export interface PersistSingleWalletOptions {
  redirect?: boolean
  promptOnDuplicate?: boolean
  showSuccess?: boolean
}

export interface WalletImportTabDependencies {
  form: ImportJsonWalletForm
  validationErrors: ImportJsonWalletValidationErrors
  t: (key: string) => string
  loadingStore: LoadingStoreLike
  notifyError: ImportJsonNotify
  persistSingleWallet: (
    account: ImportJsonWalletAccount,
    options?: PersistSingleWalletOptions
  ) => Promise<unknown>
}

export interface DatWalletImportDependencies {
  form: ImportJsonWalletForm
  datFile: Ref<File | null>
  t: (key: string) => string
  loadingStore: LoadingStoreLike
  notifyError: ImportJsonNotify
  notifySuccess: ImportJsonNotify
  applyCollectionsResult: (collectionsResult: unknown) => void
  goToWallets: () => Promise<unknown>
}
