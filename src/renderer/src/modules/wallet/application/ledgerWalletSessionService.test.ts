import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  accountService: {
    deriveAddressFromPublicKey: vi.fn(),
  },
}))

vi.mock('../../../domains/wallet/accountService', () => ({
  deriveAddressFromPublicKey: (...args: unknown[]) =>
    mocks.accountService.deriveAddressFromPublicKey(...args),
}))

import { verifyLedgerLogin } from './ledgerWalletSessionService'

describe('ledgerWalletSessionService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('rejects missing current wallets', async () => {
    await expect(verifyLedgerLogin({ publicKey: 'pk-1', currentWallet: null })).resolves.toEqual({
      ok: false,
    })
  })

  it('verifies matching ledger public keys against the current wallet', async () => {
    mocks.accountService.deriveAddressFromPublicKey.mockResolvedValue('AQ123')

    await expect(
      verifyLedgerLogin({
        publicKey: 'pk-1',
        currentWallet: { address: 'AQ123' },
      })
    ).resolves.toEqual({
      ok: true,
      ledgerWallet: {
        publicKey: 'pk-1',
        address: 'AQ123',
      },
    })
  })

  it('rejects ledger keys that do not match the selected wallet', async () => {
    mocks.accountService.deriveAddressFromPublicKey.mockResolvedValue('AQ999')

    await expect(
      verifyLedgerLogin({
        publicKey: 'pk-1',
        currentWallet: { address: 'AQ123' },
      })
    ).resolves.toEqual({
      ok: false,
      address: 'AQ999',
    })
  })
})
