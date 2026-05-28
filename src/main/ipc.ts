'use strict'

import type { BrowserWindow, IpcMain } from 'electron'
import { registerDatabaseIpc } from './services/database'
import { registerLedgerHid } from './services/ledgerHid'
import { registerNetworkIpc } from './services/network'
import { registerPreferencesIpc } from './services/preferences'
import { registerSystemIpc } from './services/system'

export function registerMainIpc(ipcMain: IpcMain): void {
  registerPreferencesIpc(ipcMain)
  registerSystemIpc(ipcMain)
  registerDatabaseIpc(ipcMain)
  registerNetworkIpc(ipcMain)
}

export function attachWindowIpc(window: BrowserWindow): void {
  registerLedgerHid(window)
}
