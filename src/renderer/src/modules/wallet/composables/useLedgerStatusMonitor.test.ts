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

  it.each([
    ['NOT_FOUND', 'ledgerStatus.NOT_FOUND'],
    ['NOT_SUPPORT', 'ledgerStatus.NOT_SUPPORT'],
    [{ statusCode: 0x6e00 }, 'ledgerStatus.NOT_OPEN'],
    [{ message: ' transport failed ' }, ' transport failed '],
    [' custom failure ', ' custom failure '],
    [null, 'ledgerStatus.NO_DEVICE'],
  ])('maps failed selections from %j to %s', async (error, expectedStatus) => {
    mocks.ledgerConnection.readLedgerConnectionSelection.mockResolvedValueOnce({
      ok: false,
      error,
    })
    const monitor = useLedgerStatusMonitor()

    await monitor.startMonitoring()

    expect(monitor.ledgerConnectorStore.ledgerStatus).toBe(expectedStatus)
    monitor.stopMonitoring()
  })

  it('normalizes empty successful selections and supports one-shot refreshes', async () => {
    mocks.ledgerConnection.readLedgerConnectionSelection.mockResolvedValueOnce({
      ok: true,
      deviceInfo: null,
      selection: null,
    })
    const monitor = useLedgerStatusMonitor({ interval: ref(undefined) })

    monitor.startMonitoring()
    await vi.runAllTicks()

    expect(monitor.ledgerConnectorStore.ledgerStatus).toBe('ledgerStatus.READY')
    expect(monitor.ledgerConnectorStore.publicKey).toBe('')
    expect(monitor.ledgerConnectorStore.ledgerWallet).toEqual({
      publicKey: '',
      address: '',
    })
    monitor.stopMonitoring()
  })

  it('does not start polling while disabled', () => {
    const monitor = useLedgerStatusMonitor({ shouldPoll: false })

    expect(mocks.ledgerConnection.readLedgerConnectionSelection).not.toHaveBeenCalled()
    monitor.stopMonitoring()
  })

  it('pauses polling, waits for the active read, and preserves the connected wallet', async () => {
    let resolveSelection: (value: unknown) => void = () => {}
    mocks.ledgerConnection.readLedgerConnectionSelection.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSelection = resolve
      })
    )
    const monitor = useLedgerStatusMonitor({ shouldPoll: true })

    const paused = monitor.pauseMonitoring()
    await vi.advanceTimersByTimeAsync(3000)
    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(1)

    resolveSelection({
      ok: true,
      deviceInfo: 'Ledger Nano X',
      selection: {
        publicKey: 'paused-ledger-pk',
        address: 'APausedLedger',
      },
    })
    await paused

    expect(monitor.ledgerConnectorStore.ledgerWallet).toEqual({
      publicKey: 'paused-ledger-pk',
      address: 'APausedLedger',
    })
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(1)

    monitor.startMonitoring()
    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(2)
    monitor.stopMonitoring()
  })

  it('does not overlap slow ledger status reads', async () => {
    let resolveSelection: (value: unknown) => void = () => {}
    mocks.ledgerConnection.readLedgerConnectionSelection.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSelection = resolve
      })
    )
    const monitor = useLedgerStatusMonitor({ shouldPoll: true })

    await vi.advanceTimersByTimeAsync(3000)
    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(1)

    resolveSelection({ ok: false, error: 'NOT_FOUND' })
    await vi.runAllTicks()
    await vi.advanceTimersByTimeAsync(1000)
    expect(mocks.ledgerConnection.readLedgerConnectionSelection).toHaveBeenCalledTimes(2)
    monitor.stopMonitoring()
  })

  it('ignores stale reads after monitoring stops', async () => {
    let resolveSelection: (value: unknown) => void = () => {}
    mocks.ledgerConnection.readLedgerConnectionSelection.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveSelection = resolve
      })
    )
    const monitor = useLedgerStatusMonitor({ shouldPoll: true })

    monitor.stopMonitoring()
    resolveSelection({
      ok: true,
      deviceInfo: 'Ledger Nano X',
      selection: {
        publicKey: 'stale-ledger-pk',
        address: 'AStaleLedger',
      },
    })
    await vi.runAllTicks()

    expect(monitor.ledgerConnectorStore.publicKey).toBe('')
    expect(monitor.ledgerConnectorStore.ledgerWallet).toEqual({
      address: '',
      publicKey: '',
    })
  })
})
