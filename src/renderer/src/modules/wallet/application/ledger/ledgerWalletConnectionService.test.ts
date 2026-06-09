import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  ledgerService: {
    getConnectionSnapshot: vi.fn(),
    getDeviceInfo: vi.fn(),
    getPublicKey: vi.fn(),
  },
  accountService: {
    deriveAddressFromPublicKey: vi.fn(),
  },
}))

vi.mock('../../../../shared/chain/ledgerSigner', () => ({
  getConnectionSnapshot: (...args: unknown[]) => mocks.ledgerService.getConnectionSnapshot(...args),
  getDeviceInfo: (...args: unknown[]) => mocks.ledgerService.getDeviceInfo(...args),
  getPublicKey: (...args: unknown[]) => mocks.ledgerService.getPublicKey(...args),
}))

vi.mock('../../../../shared/chain/walletSdk', () => ({
  deriveAddressFromPublicKey: (...args: unknown[]) =>
    mocks.accountService.deriveAddressFromPublicKey(...args),
}))

import {
  loadLedgerAccountPage,
  loadLedgerAccountSelection,
  readLedgerConnectionSelection,
  readLedgerDeviceInfo,
} from './ledgerWalletConnectionService'

describe('ledgerWalletConnectionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reads ledger device metadata', async () => {
    const device = { name: 'Ledger Nano X' }
    mocks.ledgerService.getDeviceInfo.mockResolvedValue(device)

    await expect(readLedgerDeviceInfo()).resolves.toEqual({ ok: true, deviceInfo: device })
  })

  it('loads derived ledger account selections', async () => {
    mocks.ledgerService.getPublicKey.mockResolvedValue('pk-1')
    mocks.accountService.deriveAddressFromPublicKey.mockResolvedValue('AQ123')

    await expect(loadLedgerAccountSelection({ acct: 2, neo: true })).resolves.toEqual({
      ok: true,
      selection: {
        publicKey: 'pk-1',
        acct: 2,
        neo: true,
        address: 'AQ123',
      },
    })
  })

  it('reads device info and the first ledger selection in a single call', async () => {
    const deviceInfo = { product: 'Ledger Nano X' }
    mocks.ledgerService.getConnectionSnapshot.mockResolvedValue({
      deviceInfo,
      publicKey: 'pk-1',
    })
    mocks.accountService.deriveAddressFromPublicKey.mockResolvedValue('AQ123')

    await expect(readLedgerConnectionSelection({ acct: 2, neo: true })).resolves.toEqual({
      ok: true,
      deviceInfo,
      selection: {
        publicKey: 'pk-1',
        acct: 2,
        neo: true,
        address: 'AQ123',
      },
    })
  })

  it('loads ledger account pages sequentially by account index', async () => {
    mocks.ledgerService.getPublicKey
      .mockResolvedValueOnce('pk-0')
      .mockResolvedValueOnce('pk-1')
      .mockResolvedValueOnce('pk-2')
    mocks.accountService.deriveAddressFromPublicKey
      .mockResolvedValueOnce('AQ0')
      .mockResolvedValueOnce('AQ1')
      .mockResolvedValueOnce('AQ2')

    await expect(loadLedgerAccountPage({ page: 1, pageSize: 3, neo: false })).resolves.toEqual({
      ok: true,
      accounts: [
        { publicKey: 'pk-0', acct: 0, neo: false, address: 'AQ0' },
        { publicKey: 'pk-1', acct: 1, neo: false, address: 'AQ1' },
        { publicKey: 'pk-2', acct: 2, neo: false, address: 'AQ2' },
      ],
    })
  })
})
