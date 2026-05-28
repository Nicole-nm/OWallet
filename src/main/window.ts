'use strict'

import { BrowserWindow, Menu, MenuItemConstructorOptions } from 'electron'
import { join } from 'path'
import { getApplicationMenuTemplate } from './menu'
import { isDevelopment, shouldOpenDevtools } from './config'
import { attachWindowIpc } from './ipc'
import { attachNavigationGuards } from './navigationGuards'

function attachDevelopmentLogging(window: BrowserWindow): void {
  window.webContents.on(
    'console-message',
    (details: { level: string; lineNumber: number; message: string; sourceId: string }) => {
      const { level, lineNumber, message, sourceId } = details

      if (
        message.includes('Electron Security Warning (Insecure Content-Security-Policy)') ||
        message.includes("The Content Security Policy directive 'frame-ancestors' is ignored")
      ) {
        return
      }

      if (level === 'warning' || level === 'error') {
        console.error(`[OWallet][renderer:${level}] ${message} (${sourceId}:${lineNumber})`)
      }
    }
  )

  window.webContents.on(
    'did-fail-load',
    (
      _event: Electron.Event,
      errorCode: number,
      errorDescription: string,
      validatedURL: string,
      isMainFrame: boolean
    ) => {
      console.error('[OWallet][did-fail-load]', {
        errorCode,
        errorDescription,
        validatedURL,
        isMainFrame,
      })
    }
  )

  window.webContents.on(
    'render-process-gone',
    (_event: Electron.Event, details: Electron.RenderProcessGoneDetails) => {
      console.error('[OWallet][render-process-gone]', details)
    }
  )
}

export function createMainWindow() {
  const window = new BrowserWindow({
    title: 'OWallet',
    useContentSize: true,
    width: 1140,
    minWidth: 1140,
    height: 675,
    minHeight: 635,
    webPreferences: {
      nodeIntegration: false,
      webSecurity: true,
      contextIsolation: true,
      preload: join(__dirname, '../preload/index.js'),
      sandbox: true,
    },
  })

  if (isDevelopment) {
    attachDevelopmentLogging(window)
  }

  attachWindowIpc(window)
  attachNavigationGuards(window)

  const menu = Menu.buildFromTemplate(
    getApplicationMenuTemplate({ isDevelopment }) as MenuItemConstructorOptions[]
  )
  Menu.setApplicationMenu(menu)

  if (isDevelopment && process.env.ELECTRON_RENDERER_URL) {
    window.loadURL(process.env.ELECTRON_RENDERER_URL)
    if (shouldOpenDevtools()) {
      window.webContents.openDevTools()
    }
  } else {
    window.loadFile(join(__dirname, '../renderer/index.html'))
  }

  return window
}
