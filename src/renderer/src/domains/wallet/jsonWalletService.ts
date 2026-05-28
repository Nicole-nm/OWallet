import { DEFAULT_SCRYPT } from '../../shared/lib/constants'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'

type JsonWalletDraftLike = Record<string, unknown> & {
  address?: string
  publicKey?: string
  label?: string
}

interface BuildJsonWalletInput {
  label?: string
  privateKey: string
  password: string
  wif?: string
}

export async function buildJsonWallet(body: BuildJsonWalletInput) {
  const { Account, Wallet } = await loadOntologySdk()
  const wallet = Wallet.create(body.label || '')
  wallet.scrypt.n = DEFAULT_SCRYPT.cost
  let account = Account.create(
    body.privateKey as never,
    body.password,
    body.label,
    DEFAULT_SCRYPT as never
  )
  account.isDefault = true
  wallet.addAccount(account)
  account = account.toJsonObj()
  return {
    label: body.label,
    account: account as unknown as JsonWalletDraftLike,
    content: wallet.toJsonObj(),
    wif: body.wif,
  }
}
