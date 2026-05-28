import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  platformDbFind: vi.fn(),
  platformDbInsert: vi.fn(),
  platformDbRemove: vi.fn(),
  platformDbUpdate: vi.fn(),
}))

vi.mock('../platform/bridge', () => ({
  dbFind: mocks.platformDbFind,
  dbInsert: mocks.platformDbInsert,
  dbRemove: mocks.platformDbRemove,
  dbUpdate: mocks.platformDbUpdate,
}))

import dbService from './dbService'

class WalletRecordLike {
  address: string
  label: string

  constructor(address: string, label: string) {
    this.address = address
    this.label = label
  }

  getDisplayLabel() {
    return this.label
  }
}

describe('dbService', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('serializes insert payloads into plain data before IPC', async () => {
    const wallet = new WalletRecordLike('AQ123', 'Serialized Wallet')
    mocks.platformDbInsert.mockResolvedValue({ ok: true })

    await dbService.insert({
      type: 'CommonWallet',
      address: wallet.address,
      wallet,
    })

    expect(mocks.platformDbInsert).toHaveBeenCalledWith({
      type: 'CommonWallet',
      address: 'AQ123',
      wallet: {
        address: 'AQ123',
        label: 'Serialized Wallet',
      },
    })
  })

  it('serializes nested update payloads into plain data before IPC', async () => {
    const wallet = new WalletRecordLike('AQ456', 'Updated Wallet')
    mocks.platformDbUpdate.mockResolvedValue(1)

    await dbService.update(
      { address: wallet.address },
      {
        $set: {
          wallet,
        },
      },
      {}
    )

    expect(mocks.platformDbUpdate).toHaveBeenCalledWith(
      { address: 'AQ456' },
      {
        $set: {
          wallet: {
            address: 'AQ456',
            label: 'Updated Wallet',
          },
        },
      },
      {}
    )
  })
})
