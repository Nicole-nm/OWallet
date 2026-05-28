import { buildIdentityRegistration } from '../../../domains/identity/applicationService'
import {
  addSignerSignature,
  sendTransaction,
} from '../../../domains/transaction/applicationService'
import { createChainAddress, generateWalletKeyPair } from '../../../domains/wallet/accountService'
import { fetchCommonWalletDocs, insertIdentity } from '../../../domains/wallet/applicationService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import type {
  CommonWallet,
  HardwareWalletSigner,
  Identity,
  WalletOption,
} from '../../../shared/lib/types'

const logger = createLogger('createIdentityApplicationService')

type IdentityRegistrationDraftData = {
  label: string
  ontid: string
  identity: Identity
  tx: unknown
}

type IdentityRegistrationDraftFailure = {
  ok: false
  errorKey: string
  level?: string
  error?: unknown
}

type IdentityRegistrationDraftResult =
  | ({ ok: true } & IdentityRegistrationDraftData)
  | IdentityRegistrationDraftFailure

type CommonWalletOptionSource = Partial<CommonWallet> & {
  wallet?: Partial<CommonWallet>
  address?: string
}

type CommonWalletOption = Partial<CommonWallet> & WalletOption

function mapCommonWalletOption(account: CommonWalletOptionSource): CommonWalletOption {
  const wallet = account.wallet || account
  const address = account.address || wallet.address || ''

  return {
    ...wallet,
    value: address,
    label: `${wallet.label || ''} ${address}`.trim(),
    address,
    publicKey: wallet.publicKey || '',
  }
}

export async function loadIdentityPayerWalletOptions() {
  return tryCatch(
    async () => {
      const accounts = await fetchCommonWalletDocs()
      return {
        options: Array.isArray(accounts) ? accounts.map(mapCommonWalletOption) : [],
      }
    },
    {
      context: 'loadIdentityPayerWalletOptions',
      errorKey: 'common.savedbFailed',
      logger,
      onFailure: () => ({ options: [] as unknown[] }),
    }
  )
}

export async function createIdentityRegistrationDraft({
  label,
  password,
  payerWalletType,
  payerWallet,
  ledgerWallet,
}: {
  label: string
  password?: string
  payerWalletType: string
  payerWallet?: CommonWallet
  ledgerWallet?: HardwareWalletSigner
}): Promise<IdentityRegistrationDraftResult> {
  const signerWallet = payerWalletType === 'commonWallet' ? payerWallet : ledgerWallet

  if (!signerWallet?.address) {
    return payerWalletType === 'commonWallet'
      ? { ok: false, errorKey: 'createIdentity.selectOneWallet' }
      : { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  return tryCatch(
    async () => {
      const payer = await createChainAddress(signerWallet.address)
      const { privateKey } = await generateWalletKeyPair()
      const draft = await buildIdentityRegistration({
        label,
        privateKey,
        password: password || '',
        payer,
      })

      return {
        label: draft.label,
        ontid: draft.ontid,
        identity: draft.identity as unknown as Identity,
        tx: draft.tx,
      }
    },
    { context: 'createIdentityRegistrationDraft', errorKey: 'common.networkErr', logger }
  )
}

export async function submitIdentityRegistration({
  tx,
  payerWalletType,
  payerWallet,
  payerPassword,
  ledgerWallet,
  ledgerConnected = true,
}: {
  tx: unknown
  payerWalletType: string
  payerWallet?: CommonWallet
  payerPassword?: string
  ledgerWallet?: HardwareWalletSigner
  ledgerConnected?: boolean
}) {
  if (!tx) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  if (payerWalletType === 'commonWallet') {
    if (!payerWallet?.address) {
      return { ok: false, errorKey: 'createIdentity.selectOneWallet' }
    }

    if (!payerPassword) {
      return { ok: false, errorKey: 'createIdentity.enterPassword' }
    }
  } else if (!ledgerConnected || !ledgerWallet?.address) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  const signerWallet = payerWalletType === 'commonWallet' ? payerWallet : ledgerWallet

  try {
    const signedTx = await addSignerSignature({
      tx: tx as never,
      wallet: signerWallet as unknown as CommonWallet, // Cast since wallet interfaces might be complex
      password: payerWalletType === 'commonWallet' ? payerPassword : undefined,
    })

    if (!signedTx) {
      return payerWalletType === 'commonWallet'
        ? { ok: false, errorKey: 'common.pwdErr' }
        : { ok: false, cancelled: true }
    }

    return await sendTransaction(signedTx)
  } catch (err: unknown) {
    logger.error('submitIdentityRegistration', err)
    return {
      ok: false,
      errorKey:
        payerWalletType === 'commonWallet' ? 'common.networkErr' : 'ledgerWallet.signFailed',
      error: err,
    }
  }
}

export async function persistCreatedIdentity({
  ontid,
  identity,
}: {
  ontid: string
  identity: Identity
}) {
  if (!ontid || !identity) {
    return { ok: false, errorKey: 'common.savedbFailed' }
  }

  return tryCatch(
    async () => {
      await insertIdentity({ type: 'Identity', address: ontid, wallet: identity })
    },
    { context: 'persistCreatedIdentity', errorKey: 'common.savedbFailed', logger }
  )
}
