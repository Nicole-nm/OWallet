'use strict'

import {
  BrowserWindow,
  Menu,
  MenuItemConstructorOptions,
  type BrowserWindowConstructorOptions,
} from 'electron'
import { join } from 'path'
import { getApplicationMenuTemplate } from './menu'
import { isDevelopment, shouldOpenDevtools } from './config'
import { attachWindowIpc } from './ipc'
import { attachNavigationGuards } from './navigationGuards'

const STARTUP_BACKGROUND_COLOR = '#0f141a'
const MAX_RENDERER_RECOVERY_ATTEMPTS = 2
const LINUX_SOURCE_ICON_PATH = '../../src/renderer/src/assets/icons/512x512.png'
const LINUX_PACKAGED_ICON_PATH = 'icons/512x512.png'

function getLinuxWindowIconPath(): string | undefined {
  if (process.platform !== 'linux') {
    return undefined
  }

  if (isDevelopment) {
    return join(__dirname, LINUX_SOURCE_ICON_PATH)
  }

  return process.resourcesPath ? join(process.resourcesPath, LINUX_PACKAGED_ICON_PATH) : undefined
}

function attachDevelopmentLogging(window: BrowserWindow): void {
  window.webContents.on(
    'console-message',
    (details: { level: string; lineNumber: number; message: string; sourceId: string }) => {
      const { level, lineNumber, message, sourceId } = details

      if (
        message.includes('Electron Security Warning (Insecure Content-Security-Policy)') ||
        message.includes("The Content Security Policy directive 'frame-ancestors' is ignored") ||
        message.includes('ResizeObserver loop completed with undelivered notifications') ||
        message.includes('ResizeObserver loop limit exceeded')
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
}

function createRendererRecoveryHtml(details: Electron.RenderProcessGoneDetails): string {
  const reason = String(details.reason || 'unknown')

  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>OWallet Recovery</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      background: #0f141a;
      color: #f8fafc;
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
    }
    main {
      max-width: 520px;
      padding: 32px;
      text-align: center;
    }
    h1 {
      margin: 0 0 12px;
      font-size: 24px;
    }
    p {
      margin: 0;
      color: #cbd5e1;
      line-height: 1.6;
    }
    code {
      color: #93c5fd;
    }
  </style>
</head>
<body>
  <main>
    <h1>OWallet needs to be restarted</h1>
    <p>The renderer stopped repeatedly (<code>${reason}</code>). Please close and reopen OWallet.</p>
  </main>
</body>
</html>`
}

function loadRendererRecoveryPage(
  window: BrowserWindow,
  details: Electron.RenderProcessGoneDetails
): void {
  const recoveryUrl = `data:text/html;charset=utf-8,${encodeURIComponent(
    createRendererRecoveryHtml(details)
  )}`

  void Promise.resolve(window.loadURL(recoveryUrl)).catch((error: unknown) => {
    console.error('[OWallet][renderer-recovery-page-failed]', error)
  })
}

export function attachRendererRecovery(window: BrowserWindow): void {
  let rendererFailureCount = 0

  window.webContents.on('did-finish-load', () => {
    rendererFailureCount = 0
  })

  window.webContents.on(
    'render-process-gone',
    (_event: Electron.Event, details: Electron.RenderProcessGoneDetails) => {
      if (details.reason === 'clean-exit') {
        return
      }

      rendererFailureCount += 1
      console.error('[OWallet][render-process-gone]', {
        ...details,
        rendererFailureCount,
      })

      if (window.isDestroyed() || window.webContents.isDestroyed()) {
        return
      }

      if (rendererFailureCount <= MAX_RENDERER_RECOVERY_ATTEMPTS) {
        window.webContents.reload()
        return
      }

      loadRendererRecoveryPage(window, details)
    }
  )
}

function attachStartupShowBehavior(window: BrowserWindow): void {
  let hasShownWindow = false

  const showWindow = () => {
    if (hasShownWindow || window.isDestroyed()) {
      return
    }

    hasShownWindow = true
    window.show()
  }

  window.once('ready-to-show', showWindow)
  window.webContents.on(
    'did-fail-load',
    (
      _event: Electron.Event,
      _errorCode: number,
      _errorDescription: string,
      _validatedURL: string,
      isMainFrame: boolean
    ) => {
      if (isMainFrame) {
        showWindow()
      }
    }
  )
}

export function createMainWindow() {
  const windowOptions: BrowserWindowConstructorOptions = {
    title: 'OWallet',
    show: false,
    backgroundColor: STARTUP_BACKGROUND_COLOR,
    useContentSize: true,
    autoHideMenuBar: process.platform !== 'darwin',
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
  }
  const linuxWindowIconPath = getLinuxWindowIconPath()
  if (linuxWindowIconPath) {
    windowOptions.icon = linuxWindowIconPath
  }

  const window = new BrowserWindow(windowOptions)

  if (isDevelopment) {
    attachDevelopmentLogging(window)
  }

  attachWindowIpc(window)
  attachNavigationGuards(window)
  attachStartupShowBehavior(window)
  attachRendererRecovery(window)

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
