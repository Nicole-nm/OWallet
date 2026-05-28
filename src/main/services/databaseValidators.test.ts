import { describe, expect, it } from 'vitest'

import {
  assertSafeDocument,
  assertSafeQuery,
  assertSafeRemove,
  assertSafeUpdate,
} from './databaseValidators'

const validDocument = {
  type: 'CommonWallet',
  address: 'AKeystoreAddress',
  wallet: { label: 'Main wallet' },
}

describe('database validators', () => {
  describe('assertSafeQuery', () => {
    it('accepts supported concrete and $in filters', () => {
      expect(() => assertSafeQuery({ type: 'CommonWallet' })).not.toThrow()
      expect(() => assertSafeQuery({ address: 'AKeystoreAddress' })).not.toThrow()
      expect(() => assertSafeQuery({ 'wallet.publicKey': { $in: ['pub-key'] } })).not.toThrow()
      expect(() => assertSafeQuery({ type: { $in: ['CommonWallet', 'Identity'] } })).not.toThrow()
    })

    it('rejects empty, unsupported, or unsafe query objects', () => {
      expect(() => assertSafeQuery({})).toThrow('Database query must not be empty')
      expect(() => assertSafeQuery({}, { allowEmpty: true })).not.toThrow()
      expect(() => assertSafeQuery({ wallet: 'anything' })).toThrow(
        'Unsupported database query field: wallet'
      )
      expect(() => assertSafeQuery({ type: 'UnknownWallet' })).toThrow(
        'Invalid keystore record type query'
      )
      expect(() => assertSafeQuery({ address: { $in: [''] } })).toThrow(
        'Invalid query filter for address'
      )
      expect(() =>
        assertSafeQuery({ address: 'AKeystoreAddress', wallet: { constructor: {} } })
      ).toThrow('Rejected unsafe object key: constructor')
    })
  })

  describe('assertSafeDocument', () => {
    it('accepts wallet and identity documents with a wallet object', () => {
      expect(() => assertSafeDocument(validDocument)).not.toThrow()
      expect(() =>
        assertSafeDocument({
          ...validDocument,
          type: 'Identity',
          wallet: { ontid: 'did:ont:test' },
        })
      ).not.toThrow()
    })

    it('rejects invalid document shape and unsafe keys', () => {
      expect(() => assertSafeDocument(null)).toThrow('Database document must be an object')
      expect(() => assertSafeDocument({ ...validDocument, type: 'Unsupported' })).toThrow(
        'Database document has an invalid type'
      )
      expect(() => assertSafeDocument({ ...validDocument, address: '' })).toThrow(
        'Database document requires a non-empty address'
      )
      expect(() => assertSafeDocument({ ...validDocument, wallet: null })).toThrow(
        'Database document requires a wallet object'
      )
      expect(() =>
        assertSafeDocument({ ...validDocument, wallet: { profile: { prototype: {} } } })
      ).toThrow('Rejected unsafe object key: prototype')
    })
  })

  describe('assertSafeUpdate', () => {
    it('accepts single-wallet replacements by concrete address', () => {
      expect(() =>
        assertSafeUpdate(
          { address: 'AKeystoreAddress' },
          { $set: { wallet: { label: 'Renamed wallet' } } },
          {}
        )
      ).not.toThrow()
    })

    it('rejects broad or unsupported updates', () => {
      expect(() =>
        assertSafeUpdate({ type: 'CommonWallet' }, { $set: { wallet: {} } }, {})
      ).toThrow('Database update requires a concrete address')
      expect(() => assertSafeUpdate({ address: 'AKeystoreAddress' }, { wallet: {} }, {})).toThrow(
        'Database update must use $set'
      )
      expect(() =>
        assertSafeUpdate({ address: 'AKeystoreAddress' }, { $set: { address: 'new' } }, {})
      ).toThrow('Database update can only replace the wallet object')
      expect(() =>
        assertSafeUpdate({ address: 'AKeystoreAddress' }, { $set: { wallet: {} } }, { multi: true })
      ).toThrow('Database update does not allow multi=true')
    })
  })

  describe('assertSafeRemove', () => {
    it('accepts single-record deletes by concrete type and address', () => {
      expect(() =>
        assertSafeRemove({ type: 'CommonWallet', address: 'AKeystoreAddress' }, {})
      ).not.toThrow()
    })

    it('rejects broad deletes', () => {
      expect(() => assertSafeRemove({ address: 'AKeystoreAddress' }, {})).toThrow(
        'Database remove requires a concrete record type'
      )
      expect(() => assertSafeRemove({ type: 'CommonWallet' }, {})).toThrow(
        'Database remove requires a concrete address'
      )
      expect(() =>
        assertSafeRemove({ type: 'CommonWallet', address: 'AKeystoreAddress' }, { multi: true })
      ).toThrow('Database remove does not allow multi=true')
    })
  })
})
