'use strict'

import { app, ipcMain, BrowserWindow } from 'electron'
import installExtension, { VUEJS_DEVTOOLS } from 'electron-devtools-installer'
import {
  configureAppEnvironment,
  electronMajorVersion,
  isDevelopment,
  shouldInstallVueDevtools,
  shouldOpenDevtools,
} from './config'
import { registerMainIpc } from './ipc'
import { createMainWindow } from './window'
import { closeAllDatabases } from './services/database'
import { onPreferencesSavePathChanged } from './services/preferences'

configureAppEnvironment()
app.setName('OWallet')

let win: BrowserWindow | null = null

function createWindow() {
  win = createMainWindow()

  win.on('closed', () => {
    win = null
  })
}

registerMainIpc(ipcMain)

// Clear DB cache when user changes save path to avoid stale connections.
onPreferencesSavePathChanged(() => {
  closeAllDatabases()
})

// Close all cached database handles before quitting.
app.on('before-quit', () => {
  closeAllDatabases()
})

// Quit when all windows are closed.
app.on('window-all-closed', () => {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

app.on('activate', () => {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (win === null) {
    createWindow()
  }
})

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', async () => {
  if (shouldInstallVueDevtools()) {
    // Install Vue Devtools
    try {
      await installExtension(VUEJS_DEVTOOLS)
    } catch (e) {
      console.error('Vue Devtools failed to install:', e instanceof Error ? e.message : e)
    }
  } else if (isDevelopment && !process.env.IS_TEST && electronMajorVersion >= 34) {
    console.info(
      '[OWallet] Skipping Vue Devtools extension auto-install on Electron 34+. Set OWALLET_INSTALL_VUE_DEVTOOLS=1 to force it.'
    )
  }

  if (isDevelopment && !process.env.IS_TEST && !shouldOpenDevtools()) {
    console.info(
      '[OWallet] DevTools auto-open is disabled. Set OWALLET_OPEN_DEVTOOLS=1 to open them on launch.'
    )
  }

  createWindow()
})

// Exit cleanly on request from parent process in development mode.
if (isDevelopment) {
  if (process.platform === 'win32') {
    process.on('message', (data) => {
      if (data === 'graceful-exit') {
        app.quit()
      }
    })
  } else {
    process.on('SIGTERM', () => {
      app.quit()
    })
  }
}
