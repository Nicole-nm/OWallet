import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { SdkPrivateKeyLike } from '../../shared/chain/types'

const mocks = vi.hoisted(() => ({
  loadOntologySdk: vi.fn(),
  restClient: {
    sendRawTransaction: vi.fn(),
  },
  formatScryptParams: vi.fn(),
  serializeTx: vi.fn(),
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: () => mocks.loadOntologySdk(),
}))

vi.mock('../../shared/chain/restClient', () => ({
  getRestClient: () => mocks.restClient,
}))

vi.mock('../../shared/lib/scryptParams', () => ({
  formatScryptParams: (...args: unknown[]) => mocks.formatScryptParams(...args),
}))

vi.mock('../transaction/serializationService', () => ({
  serializeTx: (...args: unknown[]) => mocks.serializeTx(...args),
}))

vi.mock('../../shared/lib/constants', () => ({
  GAS_PRICE: '500',
  GAS_LIMIT: '20000',
}))

import {
  buildIdentityRegistration,
  importIdentityFromSerializedKeystore,
  verifyIdentityExistsOnChain,
} from './identityDomainService'

describe('identity/identityDomainService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('buildIdentityRegistration', () => {
    it('builds a register-ontid tx for the new identity and returns the identity envelope', async () => {
      const identityInstance = {
        ontid: 'did:ont:new',
        toJsonObj: vi.fn().mockReturnValue({ ontid: 'did:ont:new', label: 'Alice' }),
      }
      const Identity = { create: vi.fn().mockReturnValue(identityInstance) }
      const tx: { payer?: unknown } = {}
      const OntidContract = { buildRegisterOntidTx: vi.fn().mockReturnValue(tx) }
      const TransactionBuilder = { signTransaction: vi.fn() }
      const privateKey = {
        getPublicKey: vi.fn().mockReturnValue('pubkey-hex'),
      } as unknown as SdkPrivateKeyLike

      mocks.loadOntologySdk.mockResolvedValue({ Identity, OntidContract, TransactionBuilder })

      const payer = { address: 'AAddr' }
      const result = await buildIdentityRegistration({
        privateKey,
        password: 'pw',
        label: 'Alice',
        payer,
      })

      expect(Identity.create).toHaveBeenCalledWith(privateKey, 'pw', 'Alice')
      expect(OntidContract.buildRegisterOntidTx).toHaveBeenCalledWith(
        'did:ont:new',
        'pubkey-hex',
        '500',
        '20000'
      )
      expect(tx.payer).toBe(payer)
      expect(TransactionBuilder.signTransaction).toHaveBeenCalledWith(tx, privateKey)
      expect(result).toEqual({
        label: 'Alice',
        ontid: 'did:ont:new',
        identity: { ontid: 'did:ont:new', label: 'Alice' },
        tx,
      })
    })
  })

  describe('importIdentityFromSerializedKeystore', () => {
    it('formats scrypt params from the keystore and threads them into the SDK import call', async () => {
      const imported = {
        toJsonObj: vi.fn().mockReturnValue({ ontid: 'did:ont:imported', label: 'Bob' }),
      }
      const Crypto = {
        PrivateKey: class {
          constructor(public key: string) {}
        },
        Address: class {
          constructor(public addr: string) {}
        },
      }
      const SDK = { transformPassword: vi.fn().mockReturnValue('transformed-pw') }
      const Identity = { importIdentity: vi.fn().mockReturnValue(imported) }
      mocks.loadOntologySdk.mockResolvedValue({ Crypto, SDK, Identity })
      const formattedParams = { cost: 4096, blockSize: 8, parallel: 8, size: 64 }
      mocks.formatScryptParams.mockReturnValue(formattedParams)

      const keystore = {
        key: 'encrypted-key',
        address: 'AAddr',
        label: 'Bob',
        salt: 'salt-hex',
        scrypt: { n: 4096, p: 8, r: 8, dkLen: 64 },
      }
      const result = await importIdentityFromSerializedKeystore(keystore, 'pw')

      expect(mocks.formatScryptParams).toHaveBeenCalledWith(keystore.scrypt)
      expect(SDK.transformPassword).toHaveBeenCalledWith('pw')
      expect(Identity.importIdentity).toHaveBeenCalledWith(
        'Bob',
        expect.any(Crypto.PrivateKey),
        'transformed-pw',
        expect.any(Crypto.Address),
        'salt-hex',
        formattedParams
      )
      // The imported identity is returned with the original scrypt attached for round-tripping
      expect(result).toEqual({
        ontid: 'did:ont:imported',
        label: 'Bob',
        scrypt: keystore.scrypt,
      })
    })

    it('uses a default label when the keystore has none', async () => {
      const imported = { toJsonObj: vi.fn().mockReturnValue({}) }
      const Crypto = {
        PrivateKey: class {
          constructor(public key: string) {}
        },
        Address: class {
          constructor(public addr: string) {}
        },
      }
      const SDK = { transformPassword: vi.fn().mockReturnValue('pw') }
      const Identity = { importIdentity: vi.fn().mockReturnValue(imported) }
      mocks.loadOntologySdk.mockResolvedValue({ Crypto, SDK, Identity })
      mocks.formatScryptParams.mockReturnValue({})

      await importIdentityFromSerializedKeystore(
        { key: 'k', address: 'a', salt: 's', scrypt: {} },
        'pw'
      )

      expect(Identity.importIdentity).toHaveBeenCalledWith(
        'Identity',
        expect.anything(),
        expect.anything(),
        expect.anything(),
        's',
        expect.anything()
      )
    })
  })

  describe('verifyIdentityExistsOnChain', () => {
    it('returns true when the DDO query comes back with Error=0 and a Result', async () => {
      const OntidContract = {
        buildGetDDOTx: vi.fn().mockReturnValue('ddo-tx'),
        buildGetDocumentTx: vi.fn(),
      }
      mocks.loadOntologySdk.mockResolvedValue({ OntidContract, utils: { hexstr2str: vi.fn() } })
      mocks.serializeTx.mockReturnValue('serialized-ddo-tx')
      mocks.restClient.sendRawTransaction.mockResolvedValue({ Error: 0, Result: 'ddo-payload' })

      const result = await verifyIdentityExistsOnChain('did:ont:abc')

      expect(result).toBe(true)
      expect(OntidContract.buildGetDDOTx).toHaveBeenCalledWith('did:ont:abc')
      expect(mocks.serializeTx).toHaveBeenCalledWith(
        'ddo-tx',
        'identity.verifyIdentityExistsOnChain.serialize'
      )
      expect(mocks.restClient.sendRawTransaction).toHaveBeenCalledWith('serialized-ddo-tx', true)
    })

    it('falls back to the OntID document lookup when the DDO query has no Result', async () => {
      const OntidContract = {
        buildGetDDOTx: vi.fn().mockReturnValue('ddo-tx'),
        buildGetDocumentTx: vi.fn().mockReturnValue('doc-tx'),
      }
      const documentJson = {
        publicKey: [{ id: 'did:ont:abc#keys-1' }],
      }
      const utils = {
        hexstr2str: vi.fn().mockReturnValue(JSON.stringify(documentJson)),
      }
      mocks.loadOntologySdk.mockResolvedValue({ OntidContract, utils })
      mocks.serializeTx.mockReturnValue('serialized')
      mocks.restClient.sendRawTransaction
        .mockResolvedValueOnce({ Error: 1 }) // DDO call failed
        .mockResolvedValueOnce({ Result: { Result: '<doc-hex>' } }) // document call

      const result = await verifyIdentityExistsOnChain('did:ont:abc')

      expect(result).toBe(true)
      expect(OntidContract.buildGetDocumentTx).toHaveBeenCalledWith('did:ont:abc')
    })

    it('returns false when neither the DDO nor the document lookup contain a matching key', async () => {
      const OntidContract = {
        buildGetDDOTx: vi.fn().mockReturnValue('ddo-tx'),
        buildGetDocumentTx: vi.fn().mockReturnValue('doc-tx'),
      }
      const documentJson = {
        publicKey: [{ id: 'did:ont:other#keys-1' }],
      }
      const utils = {
        hexstr2str: vi.fn().mockReturnValue(JSON.stringify(documentJson)),
      }
      mocks.loadOntologySdk.mockResolvedValue({ OntidContract, utils })
      mocks.serializeTx.mockReturnValue('serialized')
      mocks.restClient.sendRawTransaction
        .mockResolvedValueOnce({ Error: 1 })
        .mockResolvedValueOnce({ Result: { Result: '<doc-hex>' } })

      const result = await verifyIdentityExistsOnChain('did:ont:abc')

      expect(result).toBe(false)
    })
  })
})
