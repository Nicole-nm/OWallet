'use strict'

import { BrowserWindow, BaseWindow, MenuItem, MenuItemConstructorOptions } from 'electron'

export function getApplicationMenuTemplate({
  isDevelopment,
}: {
  isDevelopment: boolean
}): MenuItemConstructorOptions[] {
  return [
    {
      label: 'Edit',
      submenu: [
        {
          label: 'Select All',
          accelerator: 'CmdOrCtrl+A',
          role: 'selectAll',
        },
        {
          label: 'Copy',
          accelerator: 'CmdOrCtrl+C',
          role: 'copy',
        },
        {
          label: 'Cut',
          accelerator: 'CmdOrCtrl+X',
          role: 'cut',
        },
        {
          label: 'Paste',
          accelerator: 'CmdOrCtrl+V',
          role: 'paste',
        },
        {
          label: 'Reload',
          accelerator: 'CmdOrCtrl+R',
          click(_item: MenuItem, focusedWindow: BaseWindow | undefined) {
            if (focusedWindow && focusedWindow instanceof BrowserWindow) {
              if (focusedWindow.id === 1) {
                BrowserWindow.getAllWindows().forEach(function (win) {
                  if (win.id > 1) {
                    win.close()
                  }
                })
              }
              focusedWindow.reload()
            }
          },
        },
        {
          label: 'Quit',
          accelerator: 'CmdOrCtrl+Q',
          role: 'quit',
        },
      ],
    },
    {
      label: 'Window',
      role: 'window',
      submenu: [
        {
          label: 'Minimize',
          accelerator: 'CmdOrCtrl+M',
          role: 'minimize',
        },
        {
          label: 'Close',
          accelerator: 'CmdOrCtrl+W',
          role: 'close',
        },
        ...(isDevelopment
          ? [
              {
                label: 'Developer Tools',
                accelerator: process.platform === 'darwin' ? 'Alt+Command+I' : 'Ctrl+Shift+I',
                click(_item: MenuItem, focusedWindow: BaseWindow | undefined) {
                  if (focusedWindow && focusedWindow instanceof BrowserWindow) {
                    focusedWindow.webContents.toggleDevTools()
                  }
                },
              },
            ]
          : []),
        {
          type: 'separator',
        },
      ],
    },
  ]
}
