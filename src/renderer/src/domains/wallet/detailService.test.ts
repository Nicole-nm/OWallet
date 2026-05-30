import { beforeEach, describe, expect, it, vi } from 'vitest'

const state = vi.hoisted(() => ({ decryptThrows: false }))

const mocks = vi.hoisted(() => ({
  downloadFile: vi.fn(),
  removeWallet: vi.fn(),
  updateWalletField: vi.fn(),
}))

const sdk = vi.hoisted(() => {
  class FakePrivateKey {
    constructor(public key: string) {}
    static deserializeWIF = vi.fn(() => ({
      getPublicKey: () => ({ pk: true }),
    }))
    decrypt() {
      if (state.decryptThrows) {
        throw new Error('bad')
      }
      return {
        serializeWIF: () => 'WIF-VALUE',
        encrypt: () => ({ key: 'reencrypted-key' }),
      }
    }
  }
  class FakeAddress {
    constructor(public value: string) {}
    static fromPubKey = vi.fn(() => ({ toBase58: () => 'AMatchingAddress' }))
  }
  return {
    loaded: {
      Crypto: { PrivateKey: FakePrivateKey, Address: FakeAddress },
      Wallet: {
        create: vi.fn(() => ({
          scrypt: { n: 0 },
          addAccount: vi.fn(),
          toJsonObj: () => ({ wallet: true }),
        })),
      },
      Account: { parseJsonObj: vi.fn(() => ({ account: true })) },
    },
  }
})

vi.mock('../../shared/persistence/fileHelper', () => ({
  default: { downloadFile: mocks.downloadFile },
}))

vi.mock('../../shared/lib/constants', () => ({
  DEFAULT_SCRYPT: { cost: 16384, blockSize: 8, parallel: 8, size: 64 },
}))

vi.mock('../../shared/chain/loadOntologySdk', () => ({
  loadOntologySdk: vi.fn(async () => sdk.loaded),
}))

vi.mock('./walletDomainService', () => ({
  removeWallet: (...args: unknown[]) => mocks.removeWallet(...args),
  updateWalletField: (...args: unknown[]) => mocks.updateWalletField(...args),
}))

import {
  changeStoredWalletPassword,
  deleteStoredWallet,
  downloadWalletFile,
  exportWalletWif,
  validateWalletPassword,
  validateWalletWif,
} from './detailService'

const wallet = {
  label: 'My Wallet',
  key: 'enc-key',
  address: 'AAddress',
  salt: 'AAAA',
} as never

beforeEach(() => {
  vi.clearAllMocks()
  state.decryptThrows = false
})

describe('detailService', () => {
  it('downloadWalletFile builds and downloads the wallet json', async () => {
    await downloadWalletFile(wallet)
    expect(mocks.downloadFile).toHaveBeenCalledWith({ wallet: true }, 'My Wallet')
  })

  it('exportWalletWif returns the WIF when the password is correct', async () => {
    expect(await exportWalletWif(wallet, 'pwd')).toBe('WIF-VALUE')
  })

  it('exportWalletWif returns null when decryption fails', async () => {
    state.decryptThrows = true
    expect(await exportWalletWif(wallet, 'wrong')).toBeNull()
  })

  it('validateWalletPassword reflects whether decryption succeeded', async () => {
    expect(await validateWalletPassword(wallet, 'pwd')).toBe(true)
    state.decryptThrows = true
    expect(await validateWalletPassword(wallet, 'wrong')).toBe(false)
  })

  it('validateWalletWif compares the derived address to the expected one', async () => {
    expect(await validateWalletWif('wif', 'AMatchingAddress')).toBe(true)
    expect(await validateWalletWif('wif', 'ADifferentAddress')).toBe(false)
  })

  it('deleteStoredWallet classifies a common vs hardware wallet', async () => {
    const commonResult = await deleteStoredWallet(wallet)
    expect(commonResult.address).toBe('AAddress')
    expect(mocks.removeWallet).toHaveBeenCalled()

    const hardwareResult = await deleteStoredWallet({ address: 'AHw' } as never)
    expect(hardwareResult.address).toBe('AHw')
  })

  it('changeStoredWalletPassword re-encrypts and persists the wallet', async () => {
    const updated = await changeStoredWalletPassword(wallet, 'old', 'new')
    expect(updated).toMatchObject({ key: 'reencrypted-key' })
    expect(mocks.updateWalletField).toHaveBeenCalled()
  })

  it('changeStoredWalletPassword returns null when the old password is wrong', async () => {
    state.decryptThrows = true
    expect(await changeStoredWalletPassword(wallet, 'wrong', 'new')).toBeNull()
    expect(mocks.updateWalletField).not.toHaveBeenCalled()
  })
})
