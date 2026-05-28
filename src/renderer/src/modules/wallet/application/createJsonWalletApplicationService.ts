import { buildJsonWallet } from '../../../domains/wallet/jsonWalletService'
import { downloadWalletFile, validateWalletWif } from '../../../domains/wallet/detailService'
import { generateWalletKeyPair } from '../../../domains/wallet/accountService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { persistWallet } from './walletPersistenceService'
import type { SdkPrivateKeyLike } from '../../../shared/chain/types'

export type JsonWalletDraft = Record<string, unknown> & {
  address?: string
  publicKey?: string
  label?: string
}

interface BuildJsonWalletDraftInput {
  label: string
  privateKey: SdkPrivateKeyLike | unknown
  password?: string
  wif?: string
}

const logger = createLogger('createJsonWalletApplicationService')

export async function buildJsonWalletDraftFromPrivateKey({
  label,
  privateKey,
  password,
  wif,
}: BuildJsonWalletDraftInput) {
  return tryCatch(
    async () =>
      await buildJsonWallet({
        label,
        privateKey: privateKey as string,
        password: password as string,
        wif,
      }),
    {
      context: 'buildJsonWalletDraftFromPrivateKey',
      errorKey: 'createJsonWallet.createFail',
      logger,
    }
  )
}

export async function createJsonWalletDraft({
  label,
  password,
}: {
  label: string
  password?: string
}) {
  const seed = await tryCatch(async () => await generateWalletKeyPair(), {
    context: 'createJsonWalletDraft',
    errorKey: 'createJsonWallet.createFail',
    logger,
  })
  if (!seed.ok) return seed
  return buildJsonWalletDraftFromPrivateKey({
    label,
    privateKey: seed.privateKey,
    password,
    wif: seed.wif,
  })
}

export async function downloadCreatedJsonWallet(account: JsonWalletDraft) {
  return tryCatch(
    async () => {
      await downloadWalletFile(account as never)
    },
    { context: 'downloadCreatedJsonWallet', errorKey: 'common.networkErr', logger }
  )
}

export async function persistCreatedJsonWallet({
  account,
  wif,
}: {
  account: JsonWalletDraft | null
  wif?: string
}) {
  if (!account?.address) {
    return { ok: false as const, errorKey: 'common.savedbFailed' }
  }

  if (wif && !(await validateWalletWif(wif, account.address))) {
    return { ok: false as const, errorKey: 'createJsonWallet.createFail', reason: 'invalid_wif' }
  }

  const persisted = await tryCatch(async () => await persistWallet('CommonWallet', account), {
    context: 'persistCreatedJsonWallet',
    errorKey: 'common.savedbFailed',
    logger,
  })

  if (!persisted.ok) return persisted
  if (!persisted.inserted) {
    return {
      ok: false as const,
      errorKey: persisted.errorKey || 'common.savedbFailed',
      status: persisted.status,
      error: persisted.error,
    }
  }

  return {
    ok: true as const,
    account,
    collectionsResult: persisted.collectionsResult,
  }
}
