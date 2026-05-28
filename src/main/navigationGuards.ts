'use strict'
import { shell } from 'electron'
import { isAllowedExternalUrl, isAllowedURL } from './config'

export function attachNavigationGuards(window: import('electron').BrowserWindow): void {
  window.webContents.on('will-navigate', (event: Electron.Event, url: string) => {
    if (!isAllowedURL(url)) {
      event.preventDefault()
      console.warn('[OWallet] Blocked navigation to:', url)
    }
  })

  window.webContents.setWindowOpenHandler(({ url }: { url: string }) => {
    if (isAllowedExternalUrl(url)) {
      shell.openExternal(url)
    }
    return { action: 'deny' }
  })
}
