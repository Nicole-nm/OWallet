import { vi, describe, it, expect, beforeEach } from 'vitest'

const mocks = vi.hoisted(() => ({
  signSharedTx: vi.fn(),
  signSharedTxWithLedger: vi.fn(),
}))

vi.mock('../../transaction/signingService', () => ({
  signSharedTx: (...args: unknown[]) => mocks.signSharedTx(...args),
  signSharedTxWithLedger: (...args: unknown[]) => mocks.signSharedTxWithLedger(...args),
}))

import { createSharedWalletAdapter } from './sharedAdapter'
import {
  createFakeEncryptedWallet,
  createFakeTransaction,
} from '../../../shared/chain/__fixtures__/fakeSdk'
import { createFakeLedgerWallet } from '../../../shared/chain/__fixtures__/fakeLedgerTransport'
import type { WalletIdentity } from './WalletAdapter'

const sharedIdentity: WalletIdentity = {
  type: 'shared',
  address: 'TSharedAddr',
  publicKey: '',
  label: 'Multi-sig',
}

describe('SharedWalletAdapter', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('reports multi-signature capabilities (no message signing)', () => {
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet: createFakeEncryptedWallet() },
    })

    expect(adapter.capabilities).toEqual({
      requiresPassword: true,
      requiresHardwareDevice: false,
      singleSignature: false,
      multiSignature: true,
      canSignMessage: false,
    })
  })

  it('flips requiresHardwareDevice and requiresPassword when the active cosigner is a Ledger', () => {
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'ledger', wallet: createFakeLedgerWallet() },
    })

    expect(adapter.capabilities.requiresPassword).toBe(false)
    expect(adapter.capabilities.requiresHardwareDevice).toBe(true)
  })

  it('exposes the shared identity passed in config', () => {
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet: createFakeEncryptedWallet() },
    })
    expect(adapter.identity).toEqual(sharedIdentity)
  })

  it('signs via signSharedTx when active cosigner is common', async () => {
    const tx = createFakeTransaction()
    mocks.signSharedTx.mockResolvedValue(tx)

    const wallet = createFakeEncryptedWallet()
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet },
    })

    const result = await adapter.signTransaction(tx, {
      password: 'p1',
      isFirstSignature: true,
    })

    expect(result).toBe(tx)
    expect(mocks.signSharedTx).toHaveBeenCalledWith(tx, 2, ['pk-1', 'pk-2'], wallet, 'p1')
    expect(mocks.signSharedTxWithLedger).not.toHaveBeenCalled()
  })

  it('returns null when signSharedTx returns undefined (wrong password)', async () => {
    mocks.signSharedTx.mockResolvedValue(undefined)

    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet: createFakeEncryptedWallet() },
    })

    const result = await adapter.signTransaction(createFakeTransaction(), {
      password: 'wrong',
      isFirstSignature: true,
    })

    expect(result).toBeNull()
  })

  it('signs via signSharedTxWithLedger when active cosigner is ledger; passes isFirstSignature', async () => {
    const tx = createFakeTransaction()
    mocks.signSharedTxWithLedger.mockResolvedValue(tx)

    const wallet = createFakeLedgerWallet({ publicKey: 'ledger-pk', acct: 1, neo: true })
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'ledger', wallet },
    })

    const result = await adapter.signTransaction(tx, { isFirstSignature: true })

    expect(result).toBe(tx)
    expect(mocks.signSharedTxWithLedger).toHaveBeenCalledWith(tx, 2, ['pk-1', 'pk-2'], wallet, true)
    expect(mocks.signSharedTx).not.toHaveBeenCalled()
  })

  it('addSignature dispatches the same path but with isFirstSignature=false', async () => {
    const tx = createFakeTransaction()
    mocks.signSharedTxWithLedger.mockResolvedValue(tx)

    const wallet = createFakeLedgerWallet()
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'ledger', wallet },
    })

    await adapter.addSignature(tx, {})

    expect(mocks.signSharedTxWithLedger).toHaveBeenCalledWith(
      tx,
      2,
      ['pk-1', 'pk-2'],
      wallet,
      false
    )
  })

  it('signMessage returns null because shared wallets do not sign messages', async () => {
    const adapter = createSharedWalletAdapter({
      identity: sharedIdentity,
      threshold: 2,
      publicKeys: ['pk-1', 'pk-2'],
      activeCosigner: { type: 'common', wallet: createFakeEncryptedWallet() },
    })

    const result = await adapter.signMessage('hello', { password: 'p1' })

    expect(result).toBeNull()
  })
})
