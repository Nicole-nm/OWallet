import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    remove: vi.fn(),
  },
  dbFind: vi.fn(),
}))

vi.mock('../../shared/persistence/dbService', () => ({
  default: mocks.db,
  dbFind: (...args: any[]) => mocks.dbFind(...args),
}))

import {
  containsLocalCopayer,
  findLocalCopayers,
  findWalletCollections,
  insertWalletRecord,
  updateWalletRecord,
} from './repository'
import { WalletType } from './types'

describe('wallet/repository', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('findWalletCollections', () => {
    it('groups db records into normalWallets, sharedWallets, and hardwareWallets', async () => {
      const normalDoc = {
        type: 'CommonWallet',
        address: 'ACommon1',
        wallet: {
          address: 'ACommon1',
          label: 'Alice',
          publicKey: 'pk-1',
          key: 'enc',
          salt: 'salt',
          algorithm: 'ECDSA',
          parameters: { curve: 'P-256' },
          scrypt: {},
        },
      }
      const sharedDoc = {
        type: 'SharedWallet',
        address: 'AShared1',
        wallet: {
          address: 'AShared1',
          label: 'Shared',
          publicKey: 'pk-shared',
          sharedWalletAddress: 'AShared1',
          coPayers: [],
          requiredNumber: '2',
          totalNumber: '3',
        },
      }
      const hardwareDoc = {
        type: 'HardwareWallet',
        address: 'AHardware1',
        wallet: { address: 'AHardware1', label: 'Ledger', publicKey: 'pk-hw', neo: 0, acct: 0 },
      }

      mocks.dbFind.mockResolvedValue([normalDoc, sharedDoc, hardwareDoc])

      const result = await findWalletCollections()

      expect(result.normalWallets).toHaveLength(1)
      expect(result.sharedWallets).toHaveLength(1)
      expect(result.hardwareWallets).toHaveLength(1)
      expect(result.normalWallets[0]).toBe(normalDoc.wallet)
      expect(result.sharedWallets[0]).toBe(sharedDoc.wallet)
      expect(result.hardwareWallets[0]).toBe(hardwareDoc.wallet)
    })

    it('returns empty collections when no wallet docs exist', async () => {
      mocks.dbFind.mockResolvedValue([])

      const result = await findWalletCollections()

      expect(result).toEqual({
        normalWallets: [],
        sharedWallets: [],
        hardwareWallets: [],
      })
    })

    it('ignores records with unknown wallet types', async () => {
      // Simulates a doc that might arrive from a schema migration with a type
      // value that is not one of CommonWallet / SharedWallet / HardwareWallet.
      const unknownDoc = {
        type: 'UnknownLegacyType',
        address: 'ALegacy1',
        wallet: { address: 'ALegacy1', label: 'Legacy' },
      }

      mocks.dbFind.mockResolvedValue([unknownDoc])

      const result = await findWalletCollections()

      expect(result).toEqual({
        normalWallets: [],
        sharedWallets: [],
        hardwareWallets: [],
      })
    })
  })

  describe('insertWalletRecord', () => {
    it('inserts the record into the db and returns the result', async () => {
      const doc = {
        type: WalletType.CommonWallet,
        address: 'AInserted1',
        wallet: {
          address: 'AInserted1',
          label: 'New Wallet',
          publicKey: 'pk-new',
          key: 'enc',
          salt: 'salt',
          algorithm: 'ECDSA',
          parameters: { curve: 'P-256' },
          scrypt: {},
        },
      }
      const inserted = { ...doc, _id: 'generated-id' }
      mocks.db.insert.mockResolvedValue(inserted)

      const result = await insertWalletRecord(doc)

      expect(mocks.db.insert).toHaveBeenCalledWith(doc)
      expect(result).toEqual(inserted)
    })
  })

  describe('updateWalletRecord', () => {
    it('updates the wallet fields by address', async () => {
      mocks.db.update.mockResolvedValue(1)

      await updateWalletRecord('AUpdated1', { label: 'Renamed' })

      expect(mocks.db.update).toHaveBeenCalledWith(
        { address: 'AUpdated1' },
        { $set: { label: 'Renamed' } },
        {}
      )
    })

    it('passes through multiple field updates to the db', async () => {
      mocks.db.update.mockResolvedValue(1)

      await updateWalletRecord('AUpdated2', { key: 'new-encrypted-key', salt: 'new-salt' })

      expect(mocks.db.update).toHaveBeenCalledWith(
        { address: 'AUpdated2' },
        { $set: { key: 'new-encrypted-key', salt: 'new-salt' } },
        {}
      )
    })
  })

  describe('containsLocalCopayer', () => {
    it('returns true when at least one copayer address matches a local account', async () => {
      const localDoc = {
        type: 'CommonWallet',
        address: 'ALocal1',
        wallet: { address: 'ALocal1', label: 'Local', publicKey: 'pk-local' },
      }
      mocks.dbFind.mockResolvedValue([localDoc])

      const result = await containsLocalCopayer([{ address: 'ALocal1' }, { address: 'ARemote1' }])

      expect(result).toBe(true)
    })

    it('returns false when no copayer addresses match any local account', async () => {
      mocks.dbFind.mockResolvedValue([])

      const result = await containsLocalCopayer([{ address: 'ARemote1' }])

      expect(result).toBe(false)
    })
  })

  describe('findLocalCopayers', () => {
    it('returns enriched copayer entries for addresses that exist locally', async () => {
      const localDoc = {
        type: 'CommonWallet',
        address: 'ALocal1',
        wallet: { address: 'ALocal1', label: 'Alice', publicKey: 'pk-1', name: 'Alice' },
      }
      mocks.dbFind.mockResolvedValue([localDoc])

      const copayers = [
        { address: 'ALocal1', role: 'primary' },
        { address: 'ARemote1', role: 'secondary' },
      ]
      const result = await findLocalCopayers(copayers)

      // Only the copayer whose address is stored locally should be returned
      expect(result).toHaveLength(1)
      expect(result[0]!.address).toBe('ALocal1')
      expect(result[0]!.value).toBe('ALocal1')
      expect(result[0]!.label).toBe('Alice')
      expect(result[0]!.role).toBe('primary')
    })

    it('returns an empty array when none of the copayer addresses are stored locally', async () => {
      mocks.dbFind.mockResolvedValue([])

      const result = await findLocalCopayers([{ address: 'ARemote1' }])

      expect(result).toEqual([])
    })
  })
})
