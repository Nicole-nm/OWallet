export const DEFAULT_IPC_TIMEOUT_MS = 15000
export const FILE_DIALOG_IPC_TIMEOUT_MS = 30000
export const NETWORK_IPC_TIMEOUT_MS = DEFAULT_IPC_TIMEOUT_MS + 1000

export class OWalletIpcTimeoutError extends Error {
  constructor(channel: string, timeoutMs: number) {
    super(`[OWallet] IPC channel "${channel}" timed out after ${timeoutMs}ms`)
    this.name = 'OWalletIpcTimeoutError'
  }
}

export function withIpcTimeout<T>(
  channel: string,
  timeoutMs: number,
  operation: () => Promise<T> | T
): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout> | undefined
  const timeout = new Promise<never>((_resolve, reject) => {
    timeoutId = setTimeout(() => reject(new OWalletIpcTimeoutError(channel, timeoutMs)), timeoutMs)
  })

  return Promise.race([Promise.resolve().then(operation), timeout]).finally(() => {
    if (timeoutId) {
      clearTimeout(timeoutId)
    }
  })
}
