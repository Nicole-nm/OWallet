'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { dialog, shell } from 'electron'
import { isAllowedExternalUrl } from '../config'
import { validateKeystorePath } from './pathValidation'

export function registerSystemIpc(ipcMain: IpcMain): void {
  ipcMain.handle('shell:openExternal', (_event: IpcMainInvokeEvent, url: unknown) => {
    if (typeof url === 'string' && isAllowedExternalUrl(url)) {
      return shell.openExternal(url)
    }

    throw new Error('[OWallet] shell:openExternal received a disallowed URL')
  })

  ipcMain.handle(
    'dialog:openDirectory',
    (_event: IpcMainInvokeEvent, options: Electron.OpenDialogOptions = {}) => {
      const safeOptions =
        options && typeof options === 'object' && !Array.isArray(options)
          ? {
              title: typeof options.title === 'string' ? options.title : undefined,
              defaultPath:
                typeof options.defaultPath === 'string' ? options.defaultPath : undefined,
            }
          : {}

      return dialog.showOpenDialog({
        ...safeOptions,
        properties: ['openDirectory', 'createDirectory'],
      })
    }
  )

  ipcMain.handle(
    'system:validateKeystorePath',
    async (_event: IpcMainInvokeEvent, targetPath: unknown) => {
      if (typeof targetPath !== 'string') {
        throw new Error('[OWallet] system:validateKeystorePath requires a string path')
      }
      return validateKeystorePath(targetPath)
    }
  )

  ipcMain.handle('system:isTest', () => {
    return Boolean(process.env.IS_TEST)
  })
}
