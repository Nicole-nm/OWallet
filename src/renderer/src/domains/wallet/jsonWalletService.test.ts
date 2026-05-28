import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  account: {
    address: 'AQ123',
    publicKey: 'pk-1',
    key: 'encrypted-key',
    isDefault: false,
    toJsonObj: vi.fn(),
  },
  wallet: {
    scrypt: { n: 0 },
    addAccount: vi.fn(),
    toJsonObj: vi.fn(),
  },
  sdk: {
    Wallet: {
      create: vi.fn(),
    },
    Account: {
      create: vi.fn(),
    },
  },
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: vi.fn(() => Promise.resolve(mocks.sdk)),
}))

vi.mock('../../shared/lib/constants', () => ({
  DEFAULT_SCRYPT: { cost: 4096, blockSize: 8, parallel: 8, size: 64 },
}))

import { buildJsonWallet } from './jsonWalletService'

describe('jsonWalletService', () => {
  beforeEach(() => {
    vi.clearAllMocks()

    mocks.account.isDefault = false
    mocks.account.toJsonObj.mockReturnValue({
      address: 'AQ123',
      publicKey: 'pk-1',
      key: 'encrypted-key',
    })
    mocks.wallet.scrypt = { n: 0 }
    mocks.wallet.toJsonObj.mockReturnValue({
      name: 'Alice',
      accounts: [{ address: 'AQ123' }],
    })

    mocks.sdk.Wallet.create.mockReturnValue(mocks.wallet)
    mocks.sdk.Account.create.mockReturnValue(mocks.account)
  })

  describe('buildJsonWallet', () => {
    it('creates a wallet with the provided label, sets scrypt cost, and marks the account as default', async () => {
      const result = await buildJsonWallet({
        label: 'Alice',
        privateKey: 'private-key-hex',
        password: 'secret123',
        wif: 'WIF-1',
      })

      expect(mocks.sdk.Wallet.create).toHaveBeenCalledWith('Alice')
      expect(mocks.wallet.scrypt.n).toBe(4096)
      expect(mocks.sdk.Account.create).toHaveBeenCalledWith(
        'private-key-hex',
        'secret123',
        'Alice',
        expect.objectContaining({ cost: 4096 })
      )
      expect(mocks.account.isDefault).toBe(true)
      expect(mocks.wallet.addAccount).toHaveBeenCalledWith(mocks.account)
      expect(result.label).toBe('Alice')
      expect(result.wif).toBe('WIF-1')
    })

    it('uses an empty string as wallet name when label is not provided', async () => {
      await buildJsonWallet({
        label: '',
        privateKey: 'private-key-hex',
        password: 'secret123',
      })

      expect(mocks.sdk.Wallet.create).toHaveBeenCalledWith('')
      expect(mocks.sdk.Account.create).toHaveBeenCalledWith(
        'private-key-hex',
        'secret123',
        '',
        expect.anything()
      )
    })

    it('sets wif to undefined when wif is not passed', async () => {
      const result = await buildJsonWallet({
        label: 'Alice',
        privateKey: 'private-key-hex',
        password: 'secret123',
      })

      expect(result.wif).toBeUndefined()
    })

    it('returns account json object and wallet content from the sdk', async () => {
      const accountJson = { address: 'AQ123', publicKey: 'pk-1', key: 'encrypted-key' }
      const walletJson = { name: 'Alice', accounts: [{ address: 'AQ123' }] }
      mocks.account.toJsonObj.mockReturnValue(accountJson)
      mocks.wallet.toJsonObj.mockReturnValue(walletJson)

      const result = await buildJsonWallet({
        label: 'Alice',
        privateKey: 'private-key-hex',
        password: 'secret123',
        wif: 'WIF-1',
      })

      expect(result.account).toEqual(accountJson)
      expect(result.content).toEqual(walletJson)
      expect(result.wif).toBe('WIF-1')
    })
  })
})
