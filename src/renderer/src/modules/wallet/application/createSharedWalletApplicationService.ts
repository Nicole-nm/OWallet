import {
  createMultiSigWalletAddress,
  deriveAddressFromPublicKey,
} from '../../../domains/wallet/accountService'
import { createSharedWallet } from '../../../domains/sharedWallet/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { persistWallet } from './walletPersistenceService'

const logger = createLogger('createSharedWalletApplicationService')

interface SharedWalletCopayerInput {
  name?: unknown
  publickey?: unknown
}

interface SharedWalletDraftParams {
  label?: unknown
  copayerInputs?: SharedWalletCopayerInput[]
}

interface SharedWalletCreationParams {
  network?: string
  label?: string
  copayers?: unknown[]
  requiredSigNum?: number
}

function normalizeCopayer(entry: SharedWalletCopayerInput = {}) {
  return {
    name: String(entry.name || '').trim(),
    publickey: String(entry.publickey || '').trim(),
  }
}

export function validateSharedWalletLabel(label: unknown) {
  const normalizedLabel = String(label || '').trim()

  if (!normalizedLabel) {
    return { ok: false, errorKey: 'createSharedWallet.emptyLabel' }
  }

  if (normalizedLabel.length > 12) {
    return { ok: false, errorKey: 'createSharedWallet.walletNameErr' }
  }

  return { ok: true, label: normalizedLabel }
}

export async function createSharedWalletDraft({ label, copayerInputs }: SharedWalletDraftParams) {
  const labelValidation = validateSharedWalletLabel(label)
  if (!labelValidation.ok) {
    return labelValidation
  }

  const copayers = Array.isArray(copayerInputs) ? copayerInputs.map(normalizeCopayer) : []
  if (copayers.length < 2) {
    return { ok: false, errorKey: 'createSharedWallet.pksLte2' }
  }

  for (const payer of copayers) {
    if (!payer.name || !payer.publickey) {
      return { ok: false, silent: true }
    }

    if (payer.publickey.length !== 66) {
      return { ok: false, errorKey: 'createSharedWallet.invalidPk' }
    }
  }

  const publicKeys = new Set<string>()
  const names = new Set<string>()

  for (const payer of copayers) {
    if (publicKeys.has(payer.publickey)) {
      return { ok: false, errorKey: 'createSharedWallet.duplicatePks' }
    }

    if (names.has(payer.name)) {
      return { ok: false, errorKey: 'createSharedWallet.duplicateNames' }
    }

    publicKeys.add(payer.publickey)
    names.add(payer.name)
  }

  return tryCatch(
    async () => {
      const resolvedCopayers = await Promise.all(
        copayers.map(async (payer) => ({
          ...payer,
          address: await deriveAddressFromPublicKey(payer.publickey),
        }))
      )
      return { label: labelValidation.label, copayers: resolvedCopayers }
    },
    { context: 'createSharedWalletDraft', errorKey: 'createSharedWallet.invalidPk', logger }
  )
}

export async function submitSharedWalletCreation({
  network,
  label,
  copayers,
  requiredSigNum,
}: SharedWalletCreationParams) {
  if (!network || !label || !Array.isArray(copayers) || copayers.length < 2) {
    return { ok: false, errorKey: 'createSharedWallet.createFailed' }
  }
  const normalizedCopayers = copayers as Array<{
    name: string
    publickey: string
    address?: string
  }>
  const normalizedRequiredSigNum = Number(requiredSigNum || normalizedCopayers.length)

  const built = await tryCatch(
    async () => {
      const sharedWalletAddress = await createMultiSigWalletAddress(
        normalizedRequiredSigNum,
        normalizedCopayers.map((payer) => payer.publickey)
      )
      const body = {
        sharedWalletAddress,
        sharedWalletName: label,
        totalNumber: normalizedCopayers.length,
        requiredNumber: normalizedRequiredSigNum,
        coPayers: normalizedCopayers,
      }
      const response = (await createSharedWallet(network, body)) as { Error?: number } | undefined
      const persistResult = response?.Error === 0 ? await persistWallet('SharedWallet', body) : null
      return { sharedWalletAddress, body, response, persistResult }
    },
    { context: 'submitSharedWalletCreation', errorKey: 'createSharedWallet.createFailed', logger }
  )

  if (!built.ok) return built
  const { sharedWalletAddress, body, response, persistResult } = built

  if (response?.Error !== 0) {
    return { ok: false as const, errorKey: 'createSharedWallet.createFailed', response }
  }

  if (persistResult!.duplicate) {
    return {
      ok: false as const,
      errorKey: 'createSharedWallet.duplicateCreate',
      duplicate: true,
      body,
    }
  }

  if (!persistResult!.ok || !persistResult!.inserted) {
    return {
      ok: false as const,
      errorKey: persistResult!.errorKey || 'createSharedWallet.createFailed',
      status: persistResult!.status,
      error: persistResult!.error,
    }
  }

  return {
    ok: true as const,
    body,
    sharedWalletAddress,
    collectionsResult: persistResult!.collectionsResult,
  }
}
