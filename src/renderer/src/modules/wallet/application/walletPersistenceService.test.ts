import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  findByAddress: vi.fn(),
  insertWallet: vi.fn(),
  updateWalletField: vi.fn(),
  loadWalletCollections: vi.fn(),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  findByAddress: mocks.findByAddress,
  insertWallet: mocks.insertWallet,
  updateWalletField: mocks.updateWalletField,
}))

vi.mock('./walletCollectionApplicationService', () => ({
  loadWalletCollections: (...args: unknown[]) => mocks.loadWalletCollections(...args),
}))

import { buildWalletDocument, persistWallet } from './walletPersistenceService'

describe('walletPersistenceService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.loadWalletCollections.mockResolvedValue({
      ok: true,
      collections: {
        normalWallets: [{ address: 'AQ123' }],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
    })
  })

  it('builds shared wallet documents with shared wallet address', () => {
    const wallet = { sharedWalletAddress: 'shared-address', sharedWalletName: 'Core Team' }

    expect(buildWalletDocument('SharedWallet', wallet)).toEqual({
      type: 'SharedWallet',
      address: 'shared-address',
      wallet,
    })
  })

  it('returns invalid when wallet address cannot be resolved', async () => {
    const result = await persistWallet('CommonWallet', {})

    expect(result.ok).toBe(false)
    expect(result.status).toBe('invalid')
    expect(mocks.findByAddress).not.toHaveBeenCalled()
    expect(mocks.insertWallet).not.toHaveBeenCalled()
  })

  it('inserts new wallets and refreshes wallet collections', async () => {
    mocks.findByAddress.mockResolvedValue(undefined)

    const wallet = { address: 'AQ123' }
    const result = await persistWallet('CommonWallet', wallet)

    expect(result.ok).toBe(true)
    expect(result.inserted).toBe(true)
    expect(result.status).toBe('inserted')
    expect(mocks.insertWallet).toHaveBeenCalledWith({
      type: 'CommonWallet',
      address: 'AQ123',
      wallet,
    })
    expect(mocks.loadWalletCollections).toHaveBeenCalledWith({ force: true })
    expect(result.collectionsResult).toEqual({
      ok: true,
      collections: {
        normalWallets: [{ address: 'AQ123' }],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
    })
  })

  it('returns duplicate without writing when overwrite is disabled', async () => {
    mocks.findByAddress.mockResolvedValue({ address: 'AQ123' })

    const result = await persistWallet('CommonWallet', { address: 'AQ123' })

    expect(result.ok).toBe(false)
    expect(result.duplicate).toBe(true)
    expect(result.status).toBe('duplicate')
    expect(mocks.insertWallet).not.toHaveBeenCalled()
    expect(mocks.updateWalletField).not.toHaveBeenCalled()
  })

  it('updates existing wallets when overwrite is enabled', async () => {
    mocks.findByAddress.mockResolvedValue({ address: 'AQ123' })

    const wallet = { address: 'AQ123', label: 'Updated' }
    const result = await persistWallet('CommonWallet', wallet, { overwrite: true })

    expect(result.ok).toBe(true)
    expect(result.updated).toBe(true)
    expect(result.status).toBe('updated')
    expect(mocks.updateWalletField).toHaveBeenCalledWith('AQ123', { wallet })
    expect(mocks.loadWalletCollections).toHaveBeenCalledWith({ force: true })
    expect(result.collectionsResult).toEqual(
      expect.objectContaining({
        ok: true,
      })
    )
  })

  it('can skip list refresh for batch persistence flows', async () => {
    mocks.findByAddress.mockResolvedValue(undefined)

    await persistWallet('HardwareWallet', { address: 'AH123' }, { refresh: false })

    expect(mocks.loadWalletCollections).not.toHaveBeenCalled()
  })
})
