import { formatScryptParams } from '../../shared/lib/scryptParams'
import { getRestClient } from '../../shared/chain/restClient'
import { loadOntologySdk } from '../../shared/chain/loadOntologySdk'
import { GAS_PRICE, GAS_LIMIT } from '../../shared/lib/constants'
import { serializeTx } from '../transaction/serializationService'
import type { SdkPrivateKeyLike, SdkTransactionLike } from '../../shared/chain/types'

function serializeIdentityTx(tx: unknown, context: string) {
  return serializeTx(tx as SdkTransactionLike, context)
}
export async function buildIdentityRegistration(body: {
  privateKey: SdkPrivateKeyLike
  password: string
  label: string
  payer: unknown
}) {
  const { Identity, OntidContract, TransactionBuilder } = await loadOntologySdk()
  let identity = Identity.create(body.privateKey as never, body.password, body.label)
  const publicKey = body.privateKey.getPublicKey()
  const tx = OntidContract.buildRegisterOntidTx(
    identity.ontid,
    publicKey as never,
    GAS_PRICE,
    GAS_LIMIT
  )
  tx.payer = body.payer as never
  TransactionBuilder.signTransaction(tx, body.privateKey as never)
  identity = identity.toJsonObj()
  return {
    label: body.label,
    ontid: identity.ontid,
    identity,
    tx,
  }
}

type IdentityKeystore = Record<string, unknown> & {
  key: string
  address: string
  label?: string
  salt: string
  scrypt?: Record<string, unknown>
}

export async function importIdentityFromSerializedKeystore(
  keystore: IdentityKeystore,
  password: string
) {
  const params = keystore.scrypt
    ? formatScryptParams(keystore.scrypt as Record<string, unknown>)
    : undefined
  return importIdentityFromKeystore(keystore, password, params)
}

export async function verifyIdentityExistsOnChain(ontid: string) {
  const { OntidContract } = await loadOntologySdk()
  const tx = OntidContract.buildGetDDOTx(ontid)
  const restClient = getRestClient()
  const res = await restClient.sendRawTransaction(
    serializeIdentityTx(tx, 'identity.verifyIdentityExistsOnChain.serialize'),
    true
  )
  if (res.Error === 0 && res.Result) {
    return true
  }

  const doc = await getOntidDocumentJson(ontid)
  return Boolean(doc.publicKey.find((item: { id: string }) => item.id.split('#')[0] === ontid))
}

async function importIdentityFromKeystore(
  keystoreObj: IdentityKeystore,
  password: string,
  params: unknown
) {
  const { Crypto, SDK, Identity } = await loadOntologySdk()
  const encryptedPrivateKey = new Crypto.PrivateKey(keystoreObj.key)
  const address = new Crypto.Address(keystoreObj.address)
  const label = keystoreObj.label || 'Identity'
  const salt = keystoreObj.salt
  const transformedPassword = SDK.transformPassword(password)
  let identity = Identity.importIdentity(
    label,
    encryptedPrivateKey,
    transformedPassword,
    address,
    salt,
    params as never
  )
  identity = identity.toJsonObj()
  ;(identity as { scrypt?: unknown }).scrypt = keystoreObj.scrypt
  return identity
}

async function getOntidDocumentJson(ontid: string) {
  const { OntidContract, utils } = await loadOntologySdk()
  const tx = OntidContract.buildGetDocumentTx(ontid)
  const client = getRestClient()
  const res = await client.sendRawTransaction(
    serializeIdentityTx(tx, 'identity.getOntidDocumentJson.serialize'),
    true
  )
  const str = utils.hexstr2str(res.Result.Result)
  return JSON.parse(str)
}
