import {
  createPrivateKeyFromHexString,
  createPrivateKeyFromWifString,
  createWalletAccountFromPrivateKey,
  decryptImportedWallet,
  importWalletAccountFromMnemonic,
} from '../../../domains/wallet/importService'
import { DEFAULT_SCRYPT } from '../../../shared/lib/constants'
import { convertScryptParams } from '../../../shared/lib/scryptParams'
import { isHexString } from '../../../shared/lib/validators'
import type { ImportedDatWallet } from '../../../shared/types'
import type { ScryptParams } from '../../../shared/lib/types'
import { buildJsonWalletDraftFromPrivateKey } from './createJsonWalletApplicationService'
import { persistWallet, refreshWalletCollections } from './walletPersistenceService'

type ImportedJsonWalletAccount = Record<string, unknown> & {
  address?: string
  publicKey?: string
  label?: string
  key?: string
  salt?: string
}

interface ImportedDatWalletAccount extends Record<string, unknown> {
  key: string
  address: string
  salt: string
}

interface ImportedDatWalletEntry {
  sourceAccount: ImportedDatWalletAccount
  label: string
  password: string
}

function normalizeImportedScrypt(scrypt: Record<string, unknown>): ScryptParams {
  const converted = convertScryptParams(scrypt)
  return {
    cost: Number(converted.cost) || undefined,
    blockSize: Number(converted.blockSize) || undefined,
    parallel: Number(converted.parallel) || undefined,
    size: Number(converted.size) || undefined,
  }
}

interface ImportedWalletPersistOptions extends Record<string, unknown> {
  refresh?: boolean
  overwrite?: boolean
}

function normalizeImportedWallet(account: ImportedJsonWalletAccount) {
  return {
    ...account,
    isDefault: true,
  }
}

export function validateImportedDatWallet(wallet: ImportedDatWallet | null | undefined) {
  if (!wallet?.scrypt || !Array.isArray(wallet.accounts) || wallet.accounts.length === 0) {
    return {
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    }
  }

  const accounts = wallet.accounts.filter((account): account is ImportedDatWalletAccount =>
    Boolean(account?.key && account?.address && account?.salt)
  )
  if (accounts.length === 0) {
    return {
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    }
  }

  return {
    ok: true,
    wallet: {
      ...wallet,
      accounts,
    },
  }
}

export function parseImportedDatWallet(content: string) {
  try {
    return validateImportedDatWallet(JSON.parse(content) as ImportedDatWallet)
  } catch {
    return {
      ok: false,
      errorKey: 'importJsonWallet.invalidDatFile',
    }
  }
}

export async function buildImportedJsonWalletDraftFromPrivateKeyHex({
  label,
  privateKeyHex,
  password,
}: {
  label: string
  privateKeyHex: string
  password?: string
}) {
  if (!isHexString(privateKeyHex)) {
    return { ok: false, errorKey: 'importJsonWallet.invalidPrivateKey' }
  }

  return buildJsonWalletDraftFromPrivateKey({
    label,
    privateKey: await createPrivateKeyFromHexString(privateKeyHex),
    password,
  })
}

export async function buildImportedJsonWalletDraftFromWif({
  label,
  wif,
  password,
}: {
  label: string
  wif: string
  password?: string
}) {
  let privateKey
  try {
    privateKey = await createPrivateKeyFromWifString(wif)
  } catch {
    return { ok: false, errorKey: 'basicInfo.errWif' }
  }

  return buildJsonWalletDraftFromPrivateKey({
    label,
    privateKey,
    password,
  })
}

export async function buildImportedJsonWalletDraftFromMnemonic({
  label,
  mnemonic,
  password,
}: {
  label: string
  mnemonic: string
  password?: string
}) {
  try {
    const account = await importWalletAccountFromMnemonic(
      label,
      mnemonic,
      password || '',
      DEFAULT_SCRYPT
    )
    return { ok: true, account }
  } catch {
    return { ok: false, errorKey: 'basicInfo.InvalidMnemonic' }
  }
}

export async function persistImportedJsonWallet(
  account: ImportedJsonWalletAccount,
  options: ImportedWalletPersistOptions = {}
) {
  const normalizedAccount = normalizeImportedWallet(account)
  const result = await persistWallet('CommonWallet', normalizedAccount, options)

  return {
    ...result,
    account: normalizedAccount,
    collectionsResult: result.collectionsResult,
  }
}

export async function importDatWalletAccounts({
  datWallet,
  entries = [],
}: {
  datWallet: ImportedDatWallet
  entries?: ImportedDatWalletEntry[]
}) {
  const scrypt = normalizeImportedScrypt(datWallet.scrypt as Record<string, unknown>)
  let insertedCount = 0
  let duplicateCount = 0

  for (const entry of entries) {
    if (!entry?.label || !entry?.password || !entry?.sourceAccount) {
      continue
    }

    try {
      const decryptedPrivateKey = await decryptImportedWallet(
        {
          key: entry.sourceAccount.key,
          address: entry.sourceAccount.address,
          salt: entry.sourceAccount.salt,
        },
        entry.password,
        scrypt
      )
      if (!decryptedPrivateKey) {
        continue
      }

      let account = {
        ...entry.sourceAccount,
        label: entry.label,
      } as ImportedJsonWalletAccount

      if (datWallet.scrypt && (datWallet.scrypt as { n?: unknown }).n !== 16384) {
        account = (await createWalletAccountFromPrivateKey(
          decryptedPrivateKey,
          entry.password,
          entry.label,
          DEFAULT_SCRYPT
        )) as ImportedJsonWalletAccount
      }

      const result = await persistImportedJsonWallet(account, { refresh: false })
      if (result.inserted) {
        insertedCount += 1
      } else if (result.duplicate) {
        duplicateCount += 1
      }
    } catch {
      continue
    }
  }

  if (insertedCount > 0) {
    const collectionsResult = await refreshWalletCollections()
    return {
      ok: true,
      insertedCount,
      duplicateCount,
      collectionsResult,
    }
  }

  return {
    ok: false,
    insertedCount,
    duplicateCount,
    collectionsResult: null,
  }
}
