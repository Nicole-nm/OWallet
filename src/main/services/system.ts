'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { dialog, shell } from 'electron'
import { isAllowedExternalUrl } from '../config'
import { validateKeystorePath } from './pathValidation'
import { FILE_DIALOG_IPC_TIMEOUT_MS, registerIpcHandlerWithTimeout } from './ipcTimeout'

export function registerSystemIpc(ipcMain: IpcMain): void {
  registerIpcHandlerWithTimeout(
    ipcMain,
    'shell:openExternal',
    (_event: IpcMainInvokeEvent, url: unknown) => {
      if (typeof url === 'string' && isAllowedExternalUrl(url)) {
        return shell.openExternal(url)
      }

      throw new Error('[OWallet] shell:openExternal received a disallowed URL')
    }
  )

  registerIpcHandlerWithTimeout(
    ipcMain,
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
    },
    FILE_DIALOG_IPC_TIMEOUT_MS
  )

  registerIpcHandlerWithTimeout(
    ipcMain,
    'system:validateKeystorePath',
    async (_event: IpcMainInvokeEvent, targetPath: unknown) => {
      if (typeof targetPath !== 'string') {
        throw new Error('[OWallet] system:validateKeystorePath requires a string path')
      }
      return validateKeystorePath(targetPath)
    },
    FILE_DIALOG_IPC_TIMEOUT_MS
  )

  registerIpcHandlerWithTimeout(ipcMain, 'system:isTest', () => {
    return Boolean(process.env.IS_TEST)
  })
}
