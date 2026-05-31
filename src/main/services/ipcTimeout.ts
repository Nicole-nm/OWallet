'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import {
  DEFAULT_IPC_TIMEOUT_MS,
  FILE_DIALOG_IPC_TIMEOUT_MS,
  NETWORK_IPC_TIMEOUT_MS,
  withIpcTimeout,
} from '../../shared-types/ipcTimeout'

export { DEFAULT_IPC_TIMEOUT_MS, FILE_DIALOG_IPC_TIMEOUT_MS, NETWORK_IPC_TIMEOUT_MS }

type IpcHandler<TArgs extends unknown[] = unknown[]> = (
  event: IpcMainInvokeEvent,
  ...args: TArgs
) => unknown

export function runWithIpcTimeout<T>(
  channel: string,
  timeoutMs: number,
  operation: () => Promise<T> | T
): Promise<T> {
  return withIpcTimeout(channel, timeoutMs, operation)
}

export function registerIpcHandlerWithTimeout<TArgs extends unknown[] = unknown[]>(
  ipcMain: IpcMain,
  channel: string,
  handler: IpcHandler<TArgs>,
  timeoutMs = DEFAULT_IPC_TIMEOUT_MS
): void {
  ipcMain.handle(channel, (event: IpcMainInvokeEvent, ...args: unknown[]) => {
    return runWithIpcTimeout(channel, timeoutMs, () => handler(event, ...(args as TArgs)))
  })
}
