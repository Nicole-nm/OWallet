import { buildIdentityRegistration } from '../../../domains/identity/identityDomainService'
import { submitWithAdapter } from '../../../domains/transaction/submitWithAdapter'
import { createChainAddress, generateWalletKeyPair } from '../../../domains/wallet/accountService'
import { fetchCommonWalletDocs, insertIdentity } from '../../../domains/wallet/walletDomainService'
import { createLogger } from '../../../shared/lib/logger'
import { tryCatch } from '../../../shared/lib/result'
import { resolveDefaultGasPrice } from '../../../shared/lib/constants'
import type {
  CommonWallet,
  HardwareWalletSigner,
  Identity,
  WalletOption,
} from '../../../shared/lib/types'
import type {
  SdkTransactionLike,
  WalletAdapter,
} from '../../wallet/application/adapter/WalletAdapterFactory'

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
        gasPrice: resolveDefaultGasPrice(payerWalletType === 'commonWallet' ? 'common' : 'ledger'),
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
  adapter,
  payerPassword,
  ledgerConnected = true,
}: {
  tx: unknown
  adapter: WalletAdapter
  payerPassword?: string
  ledgerConnected?: boolean
}) {
  if (!tx) {
    return { ok: false, errorKey: 'common.networkErr' }
  }

  const { requiresPassword, requiresHardwareDevice } = adapter.capabilities

  if (requiresPassword && !payerPassword) {
    return { ok: false, errorKey: 'createIdentity.enterPassword' }
  }

  if (requiresHardwareDevice && (!ledgerConnected || !adapter.identity.address)) {
    return { ok: false, level: 'warning', errorKey: 'ledgerWallet.connectApp' }
  }

  return submitWithAdapter({
    tx: tx as SdkTransactionLike,
    adapter,
    password: payerPassword,
    useAddSignature: true,
    networkErrorKey: requiresHardwareDevice ? 'ledgerWallet.signFailed' : 'common.unexpectedError',
    logger,
    errorContext: 'submitIdentityRegistration',
  })
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
