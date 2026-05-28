import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  accountService: {
    createMultiSigWalletAddress: vi.fn(),
    deriveAddressFromPublicKey: vi.fn(),
  },
  sharedWalletService: {
    createSharedWallet: vi.fn(),
  },
  walletPersistenceService: {
    persistWallet: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  createMultiSigWalletAddress: (...args: unknown[]) =>
    mocks.accountService.createMultiSigWalletAddress(...args),
  deriveAddressFromPublicKey: (...args: unknown[]) =>
    mocks.accountService.deriveAddressFromPublicKey(...args),
}))

vi.mock('../../../domains/sharedWallet/applicationService', () => ({
  createSharedWallet: (...args: unknown[]) => mocks.sharedWalletService.createSharedWallet(...args),
}))

vi.mock('./walletPersistenceService', () => ({
  persistWallet: (...args: unknown[]) => mocks.walletPersistenceService.persistWallet(...args),
}))

import {
  createSharedWalletDraft,
  submitSharedWalletCreation,
  validateSharedWalletLabel,
} from './createSharedWalletApplicationService'

describe('createSharedWalletApplicationService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('validates shared wallet labels', () => {
    expect(validateSharedWalletLabel('')).toEqual({
      ok: false,
      errorKey: 'createSharedWallet.emptyLabel',
    })

    expect(validateSharedWalletLabel('1234567890123')).toEqual({
      ok: false,
      errorKey: 'createSharedWallet.walletNameErr',
    })

    expect(validateSharedWalletLabel('Core Team')).toEqual({
      ok: true,
      label: 'Core Team',
    })
  })

  it('builds a shared wallet draft with derived copayer addresses', async () => {
    mocks.accountService.deriveAddressFromPublicKey
      .mockResolvedValueOnce('AQ111')
      .mockResolvedValueOnce('AQ222')

    await expect(
      createSharedWalletDraft({
        label: 'Core Team',
        copayerInputs: [
          { name: 'Alice', publickey: 'A'.repeat(66) },
          { name: 'Bob', publickey: 'B'.repeat(66) },
        ],
      })
    ).resolves.toEqual({
      ok: true,
      label: 'Core Team',
      copayers: [
        { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
        { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
      ],
    })
  })

  it('rejects duplicate copayer public keys', async () => {
    await expect(
      createSharedWalletDraft({
        label: 'Core Team',
        copayerInputs: [
          { name: 'Alice', publickey: 'A'.repeat(66) },
          { name: 'Bob', publickey: 'A'.repeat(66) },
        ],
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'createSharedWallet.duplicatePks',
    })
  })

  it('submits shared wallet creations and persists them locally', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('shared-address')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      ok: true,
      inserted: true,
      status: 'inserted',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })

    await expect(
      submitSharedWalletCreation({
        network: 'testnet',
        label: 'Core Team',
        copayers: [
          { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
          { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
        ],
        requiredSigNum: 2,
      })
    ).resolves.toEqual({
      ok: true,
      body: {
        sharedWalletAddress: 'shared-address',
        sharedWalletName: 'Core Team',
        totalNumber: 2,
        requiredNumber: 2,
        coPayers: [
          { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
          { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
        ],
      },
      sharedWalletAddress: 'shared-address',
      collectionsResult: {
        ok: true,
        collections: {
          normalWallets: [] as unknown[],
          sharedWallets: [{ sharedWalletAddress: 'shared-address' }],
          hardwareWallets: [] as unknown[],
        },
      },
    })
  })

  it('maps duplicate local wallets to duplicateCreate', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('shared-address')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      ok: false,
      duplicate: true,
      status: 'duplicate',
    })

    await expect(
      submitSharedWalletCreation({
        network: 'testnet',
        label: 'Core Team',
        copayers: [
          { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
          { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
        ],
        requiredSigNum: 2,
      })
    ).resolves.toEqual({
      ok: false,
      errorKey: 'createSharedWallet.duplicateCreate',
      duplicate: true,
      body: {
        sharedWalletAddress: 'shared-address',
        sharedWalletName: 'Core Team',
        totalNumber: 2,
        requiredNumber: 2,
        coPayers: [
          { name: 'Alice', publickey: 'A'.repeat(66), address: 'AQ111' },
          { name: 'Bob', publickey: 'B'.repeat(66), address: 'AQ222' },
        ],
      },
    })
  })
})
