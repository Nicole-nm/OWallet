'use strict'

import type { BrowserWindow, HIDDevice } from 'electron'

const LEDGER_VENDOR_ID = 0x2c97
const HID_SELECTION_TIMEOUT_MS = 3000

interface LedgerDeviceSelection {
  callback: (deviceId: string | undefined) => void
  finished: boolean
  onDeviceAdded: (event: Electron.Event, device: HIDDevice) => void
  onDeviceRemoved: (event: Electron.Event, device: HIDDevice) => void
  timeoutId: ReturnType<typeof setTimeout> | null
}

interface HidSessionWithDeviceEvents {
  on(
    event: 'hid-device-added' | 'hid-device-removed',
    listener: (event: Electron.Event, device: HIDDevice) => void
  ): this
  off(
    event: 'hid-device-added' | 'hid-device-removed',
    listener: (event: Electron.Event, device: HIDDevice) => void
  ): this
}

function findLedgerDevice(deviceList: HIDDevice[] = []): HIDDevice | undefined {
  return deviceList.find((device) => device.vendorId === LEDGER_VENDOR_ID)
}

function isWindowAlive(window: BrowserWindow): boolean {
  return Boolean(window) && !window.isDestroyed() && !window.webContents.isDestroyed()
}

export function registerLedgerHid(window: BrowserWindow): void {
  const pendingLedgerDeviceSelections = new Map<
    (deviceId: string | undefined) => void,
    LedgerDeviceSelection
  >()
  const session = window.webContents.session
  const hidSession = session as unknown as HidSessionWithDeviceEvents

  const completeLedgerDeviceSelection = (selection: LedgerDeviceSelection, deviceId?: string) => {
    if (!selection || selection.finished) {
      return
    }

    selection.finished = true
    if (selection.timeoutId) {
      clearTimeout(selection.timeoutId)
      selection.timeoutId = null
    }

    hidSession.off('hid-device-added', selection.onDeviceAdded)
    hidSession.off('hid-device-removed', selection.onDeviceRemoved)
    pendingLedgerDeviceSelections.delete(selection.callback)

    if (isWindowAlive(window)) {
      selection.callback(deviceId)
    }
  }

  session.setDevicePermissionHandler((details) => {
    if (
      details.deviceType === 'hid' &&
      (details.device as HIDDevice)?.vendorId === LEDGER_VENDOR_ID
    ) {
      return true
    }
    return false
  })

  session.on(
    'select-hid-device',
    (
      event: Electron.Event,
      details: { deviceList: HIDDevice[] },
      callback: (deviceId: string | undefined) => void
    ) => {
      try {
        if (!isWindowAlive(window)) {
          return
        }

        event.preventDefault()

        const existingSelection = pendingLedgerDeviceSelections.get(callback)
        const currentLedger = findLedgerDevice(details.deviceList)

        if (existingSelection) {
          if (currentLedger) {
            completeLedgerDeviceSelection(existingSelection, currentLedger.deviceId)
          }
          return
        }

        const onDeviceAdded = (_addEvent: Electron.Event, device: HIDDevice) => {
          if (device.vendorId === LEDGER_VENDOR_ID) {
            completeLedgerDeviceSelection(selection, device.deviceId)
          }
        }

        const onDeviceRemoved = (_removeEvent: Electron.Event, device: HIDDevice) => {
          if (device.vendorId === LEDGER_VENDOR_ID && currentLedger?.deviceId === device.deviceId) {
            completeLedgerDeviceSelection(selection)
          }
        }

        const selection: LedgerDeviceSelection = {
          callback,
          finished: false,
          onDeviceAdded,
          onDeviceRemoved,
          timeoutId: null,
        }

        pendingLedgerDeviceSelections.set(callback, selection)

        if (currentLedger) {
          completeLedgerDeviceSelection(selection, currentLedger.deviceId)
          return
        }

        hidSession.on('hid-device-added', onDeviceAdded)
        hidSession.on('hid-device-removed', onDeviceRemoved)
        selection.timeoutId = setTimeout(
          () => completeLedgerDeviceSelection(selection),
          HID_SELECTION_TIMEOUT_MS
        )
      } catch (err: unknown) {
        console.error('[OWallet][ledgerHid]', err)
        callback(undefined)
      }
    }
  )

  session.setPermissionCheckHandler(
    (_webContents: Electron.WebContents | null, permission: string) => {
      return permission === 'hid'
    }
  )

  window.once('closed', () => {
    for (const selection of pendingLedgerDeviceSelections.values()) {
      completeLedgerDeviceSelection(selection)
    }
  })
}
