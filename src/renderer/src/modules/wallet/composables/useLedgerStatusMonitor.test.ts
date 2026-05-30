import { createPinia, setActivePinia } from 'pinia'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ref } from 'vue'

const mocks = vi.hoisted(() => ({
  ledgerConnection: {
    readLedgerConnectionSelection: vi.fn(),
  },
}))

vi.mock('../../../lang', () => ({
  default: {
    global: {
      t: (key: string) => key,
    },
  },
}))

vi.mock('../application/ledger/ledgerWalletConnectionService', () => ({
  readLedgerConnectionSelection: (...args: unknown[]) =>
    mocks.ledgerConnection.readLedgerConnectionSelection(...args),
}))

import { useLedgerStatusMonitor } from './useLedgerStatusMonitor'

describe('useLedgerStatusMonitor', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.clearAllMocks()
    setActivePinia(createPinia())
    mocks.ledgerConnection.readLedgerConnectionSelection.mockResolvedValue({
      ok: true,
      deviceInfo: 'Ledger Nano X',
      selection: {
        publicKey: 'ledger-pk',
        address: 'ALedger',
      },
    })
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('polls ledger status every second by default while enabled', async () => {
    const shouldPoll = ref(true)

    useLedgerStatusMonitor({ shouldPoll })

    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(1)

    await vi.advanceTimersByTimeAsync(1000)

    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(2)

    shouldPoll.value = false
    await vi.advanceTimersByTimeAsync(1000)

    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(2)
  })
})
