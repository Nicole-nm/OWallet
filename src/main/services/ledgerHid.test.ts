import { beforeEach, describe, expect, it, vi } from 'vitest'

const LEDGER_VENDOR_ID = 0x2c97

interface FakeHidDevice {
  deviceId: string
  vendorId: number
}

type Listener = (...args: unknown[]) => void

function createFakeWindow() {
  const listeners = new Map<string, Listener[]>()
  let devicePermissionHandler: (details: { deviceType: string; device: FakeHidDevice }) => boolean
  let permissionCheckHandler: ((_webContents: unknown, permission: string) => boolean) | undefined
  let closedHandler: (() => void) | undefined

  const session = {
    on: vi.fn((event: string, listener: Listener) => {
      listeners.set(event, [...(listeners.get(event) || []), listener])
    }),
    off: vi.fn((event: string, listener: Listener) => {
      listeners.set(
        event,
        (listeners.get(event) || []).filter((existingListener) => existingListener !== listener)
      )
    }),
    setDevicePermissionHandler: vi.fn((handler) => {
      devicePermissionHandler = handler
    }),
    setPermissionCheckHandler: vi.fn((handler) => {
      permissionCheckHandler = handler
    }),
  }

  const window = {
    isDestroyed: vi.fn(() => false),
    once: vi.fn((_event: string, handler: () => void) => {
      closedHandler = handler
    }),
    webContents: {
      isDestroyed: vi.fn(() => false),
      session,
    },
  }

  return {
    window,
    session,
    getClosedHandler: () => closedHandler,
    getDevicePermissionHandler: () => devicePermissionHandler,
    getPermissionCheckHandler: () => permissionCheckHandler,
    emit(event: string, ...args: unknown[]) {
      for (const listener of listeners.get(event) || []) {
        listener(...args)
      }
    },
    listenerCount(event: string) {
      return (listeners.get(event) || []).length
    },
  }
}

describe('ledger HID registration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.useRealTimers()
  })

  it('grants permission only to Ledger HID devices and checks hid permission', async () => {
    const { registerLedgerHid } = await import('./ledgerHid')
    const fake = createFakeWindow()

    registerLedgerHid(fake.window as never)

    expect(
      fake.getDevicePermissionHandler()?.({
        deviceType: 'hid',
        device: { deviceId: 'ledger', vendorId: LEDGER_VENDOR_ID },
      })
    ).toBe(true)
    expect(
      fake.getDevicePermissionHandler()?.({
        deviceType: 'hid',
        device: { deviceId: 'other', vendorId: 1234 },
      })
    ).toBe(false)
    expect(fake.getPermissionCheckHandler()?.(null, 'hid')).toBe(true)
    expect(fake.getPermissionCheckHandler()?.(null, 'camera')).toBe(false)
  })

  it('selects an already available Ledger device immediately', async () => {
    const { registerLedgerHid } = await import('./ledgerHid')
    const fake = createFakeWindow()
    const callback = vi.fn()
    const event = { preventDefault: vi.fn() }

    registerLedgerHid(fake.window as never)
    fake.emit(
      'select-hid-device',
      event,
      { deviceList: [{ deviceId: 'ledger-1', vendorId: LEDGER_VENDOR_ID }] },
      callback
    )

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(callback).toHaveBeenCalledWith('ledger-1')
    expect(fake.listenerCount('hid-device-added')).toBe(0)
  })

  it('waits for a Ledger device to be added and cleans up listeners after selection', async () => {
    vi.useFakeTimers()
    const { registerLedgerHid } = await import('./ledgerHid')
    const fake = createFakeWindow()
    const callback = vi.fn()

    registerLedgerHid(fake.window as never)
    fake.emit('select-hid-device', { preventDefault: vi.fn() }, { deviceList: [] }, callback)

    expect(callback).not.toHaveBeenCalled()
    expect(fake.listenerCount('hid-device-added')).toBe(1)

    fake.emit('hid-device-added', {}, { deviceId: 'ledger-added', vendorId: LEDGER_VENDOR_ID })

    expect(callback).toHaveBeenCalledWith('ledger-added')
    expect(fake.listenerCount('hid-device-added')).toBe(0)
    vi.runOnlyPendingTimers()
    expect(callback).toHaveBeenCalledTimes(1)
  })

  it('returns undefined when no Ledger device is selected before timeout', async () => {
    vi.useFakeTimers()
    const { registerLedgerHid } = await import('./ledgerHid')
    const fake = createFakeWindow()
    const callback = vi.fn()

    registerLedgerHid(fake.window as never)
    fake.emit('select-hid-device', { preventDefault: vi.fn() }, { deviceList: [] }, callback)
    vi.advanceTimersByTime(3000)

    expect(callback).toHaveBeenCalledWith(undefined)
    expect(fake.listenerCount('hid-device-added')).toBe(0)
  })

  it('cleans pending selections on window close', async () => {
    vi.useFakeTimers()
    const { registerLedgerHid } = await import('./ledgerHid')
    const fake = createFakeWindow()
    const callback = vi.fn()

    registerLedgerHid(fake.window as never)
    fake.emit('select-hid-device', { preventDefault: vi.fn() }, { deviceList: [] }, callback)
    fake.getClosedHandler()?.()

    expect(callback).toHaveBeenCalledWith(undefined)
    expect(fake.listenerCount('hid-device-added')).toBe(0)
  })
})
