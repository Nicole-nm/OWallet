import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  fetchWalletCollections: vi.fn(),
}))

vi.mock('../../../domains/wallet/applicationService', () => ({
  fetchWalletCollections: (...args: any[]) => mocks.fetchWalletCollections(...args),
}))

import { loadWalletCollections } from './walletCollectionApplicationService'
import type { CommonWallet, HardwareWallet, SharedWallet } from '../../../shared/lib/types'

function makeCommonWallet(address = 'AQ1'): CommonWallet {
  return {
    address,
    label: 'Wallet',
    publicKey: 'pk',
    key: 'key',
    salt: 'salt',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: {},
  }
}

function createWalletsStore() {
  return {
    normalWallets: [] as CommonWallet[],
    sharedWallets: [] as SharedWallet[],
    hardwareWallets: [] as HardwareWallet[],
    hasLoadedWallets: false,
  }
}

describe('walletCollectionApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('returns fetched wallet collections without mutating the store', async () => {
    const walletsStore = createWalletsStore()
    mocks.fetchWalletCollections.mockResolvedValue({
      ok: true,
      data: {
        normalWallets: [{ address: 'AQ1' }],
        sharedWallets: [{ sharedWalletAddress: 'AS1' }],
        hardwareWallets: [{ address: 'AL1' }],
      },
    })

    await expect(
      loadWalletCollections({
        currentCollections: walletsStore,
        hasLoadedWallets: walletsStore.hasLoadedWallets,
      })
    ).resolves.toEqual({
      ok: true,
      collections: {
        normalWallets: [{ address: 'AQ1' }],
        sharedWallets: [{ sharedWalletAddress: 'AS1' }],
        hardwareWallets: [{ address: 'AL1' }],
      },
    })
  })

  it('returns the current snapshot when fetching wallet collections fails', async () => {
    const walletsStore = createWalletsStore()
    walletsStore.normalWallets = [makeCommonWallet()]
    mocks.fetchWalletCollections.mockResolvedValue({
      ok: false,
      errorKey: 'common.networkErr',
    })

    await expect(
      loadWalletCollections({
        currentCollections: walletsStore,
        hasLoadedWallets: walletsStore.hasLoadedWallets,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'common.networkErr',
      collections: {
        normalWallets: [makeCommonWallet()],
        sharedWallets: [],
        hardwareWallets: [],
      },
    })
  })

  it('returns cached wallet collections when the store is already loaded', async () => {
    const walletsStore = createWalletsStore()
    walletsStore.normalWallets = [makeCommonWallet()]
    walletsStore.hasLoadedWallets = true

    await expect(
      loadWalletCollections({
        currentCollections: walletsStore,
        hasLoadedWallets: walletsStore.hasLoadedWallets,
      })
    ).resolves.toEqual({
      ok: true,
      cached: true,
      collections: {
        normalWallets: [makeCommonWallet()],
        sharedWallets: [] as unknown[],
        hardwareWallets: [] as unknown[],
      },
    })

    expect(mocks.fetchWalletCollections).not.toHaveBeenCalled()
  })
})
