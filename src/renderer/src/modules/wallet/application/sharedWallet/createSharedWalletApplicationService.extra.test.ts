import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  accountService: {
    createMultiSigWalletAddress: vi.fn(),
    deriveAddressFromPublicKey: vi.fn(),
  },
  sharedWalletService: { createSharedWallet: vi.fn() },
  walletPersistenceService: { persistWallet: vi.fn() },
}))

vi.mock('../../../../domains/wallet/accountService', () => ({
  createMultiSigWalletAddress: (...args: unknown[]) =>
    mocks.accountService.createMultiSigWalletAddress(...args),
  deriveAddressFromPublicKey: (...args: unknown[]) =>
    mocks.accountService.deriveAddressFromPublicKey(...args),
}))

vi.mock('../../../../domains/sharedWallet/sharedWalletDomainService', () => ({
  createSharedWallet: (...args: unknown[]) => mocks.sharedWalletService.createSharedWallet(...args),
}))

vi.mock('../persistence/walletPersistenceService', () => ({
  persistWallet: (...args: unknown[]) => mocks.walletPersistenceService.persistWallet(...args),
}))

import {
  createSharedWalletDraft,
  submitSharedWalletCreation,
} from './createSharedWalletApplicationService'

const pk = (suffix: string) => suffix.padEnd(66, '0')

beforeEach(() => {
  vi.clearAllMocks()
})

describe('createSharedWalletDraft validation branches', () => {
  it('rejects when fewer than two copayers are provided', async () => {
    await expect(
      createSharedWalletDraft({ label: 'team', copayerInputs: [{ name: 'a', publickey: pk('a') }] })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.pksLte2' })
  })

  it('treats non-array copayer input as empty', async () => {
    await expect(
      createSharedWalletDraft({ label: 'team', copayerInputs: undefined })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.pksLte2' })
  })

  it('silently rejects a copayer missing a name or public key', async () => {
    await expect(
      createSharedWalletDraft({
        label: 'team',
        copayerInputs: [
          { name: 'a', publickey: pk('a') },
          { name: '', publickey: pk('b') },
        ],
      })
    ).resolves.toEqual({ ok: false, silent: true })
  })

  it('rejects a public key of the wrong length', async () => {
    await expect(
      createSharedWalletDraft({
        label: 'team',
        copayerInputs: [
          { name: 'a', publickey: 'short' },
          { name: 'b', publickey: pk('b') },
        ],
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.invalidPk' })
  })

  it('rejects duplicate names', async () => {
    await expect(
      createSharedWalletDraft({
        label: 'team',
        copayerInputs: [
          { name: 'same', publickey: pk('a') },
          { name: 'same', publickey: pk('b') },
        ],
      })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.duplicateNames' })
  })

  it('resolves copayer addresses on success', async () => {
    mocks.accountService.deriveAddressFromPublicKey.mockImplementation(
      async (p: string) => `addr-${p.slice(0, 1)}`
    )
    const result = await createSharedWalletDraft({
      label: 'team',
      copayerInputs: [
        { name: 'a', publickey: pk('a') },
        { name: 'b', publickey: pk('b') },
      ],
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      const copayers = (result as { copayers: { address: string }[] }).copayers
      expect(copayers).toHaveLength(2)
      expect(copayers[0]!.address).toBe('addr-a')
    }
  })

  it('returns the failure fallback when address derivation throws', async () => {
    mocks.accountService.deriveAddressFromPublicKey.mockRejectedValue(new Error('bad pk'))
    const result = await createSharedWalletDraft({
      label: 'team',
      copayerInputs: [
        { name: 'a', publickey: pk('a') },
        { name: 'b', publickey: pk('b') },
      ],
    })
    expect(result.ok).toBe(false)
    if (!result.ok)
      expect((result as { errorKey?: string }).errorKey).toBe('createSharedWallet.invalidPk')
  })
})

describe('submitSharedWalletCreation branches', () => {
  const copayers = [
    { name: 'a', publickey: pk('a'), address: 'addr-a' },
    { name: 'b', publickey: pk('b'), address: 'addr-b' },
  ]

  it('rejects an incomplete request', async () => {
    await expect(
      submitSharedWalletCreation({ network: '', label: 'team', copayers })
    ).resolves.toEqual({ ok: false, errorKey: 'createSharedWallet.createFailed' })
  })

  it('returns createFailed when the remote service reports an error', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('multi-addr')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 1 })
    const result = await submitSharedWalletCreation({ network: 'net', label: 'team', copayers })
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.errorKey).toBe('createSharedWallet.createFailed')
  })

  it('flags a duplicate persisted wallet', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('multi-addr')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({ duplicate: true })
    const result = await submitSharedWalletCreation({ network: 'net', label: 'team', copayers })
    expect(result).toMatchObject({ ok: false, errorKey: 'createSharedWallet.duplicateCreate' })
  })

  it('surfaces a persistence failure error key', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('multi-addr')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      duplicate: false,
      ok: false,
      inserted: false,
      errorKey: 'createSharedWallet.saveFailed',
      status: 500,
    })
    const result = await submitSharedWalletCreation({ network: 'net', label: 'team', copayers })
    expect(result).toMatchObject({ ok: false, errorKey: 'createSharedWallet.saveFailed' })
  })

  it('returns success with the persisted collections result', async () => {
    mocks.accountService.createMultiSigWalletAddress.mockResolvedValue('multi-addr')
    mocks.sharedWalletService.createSharedWallet.mockResolvedValue({ Error: 0 })
    mocks.walletPersistenceService.persistWallet.mockResolvedValue({
      duplicate: false,
      ok: true,
      inserted: true,
      collectionsResult: ['col'],
    })
    const result = await submitSharedWalletCreation({
      network: 'net',
      label: 'team',
      copayers,
      requiredSigNum: 2,
    })
    expect(result).toMatchObject({ ok: true, sharedWalletAddress: 'multi-addr' })
  })
})
