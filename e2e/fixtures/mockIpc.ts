import type { ElectronApplication } from '@playwright/test'

interface WalletLike {
  type?: string
  address?: string
  [key: string]: unknown
}

interface IdentityLike extends Record<string, unknown> {
  ontid?: string
}

type SyntheticIpcEvent = {
  sender: Record<string, never>
}

type IpcInvokePayload = Record<string, unknown> | undefined

type InternalIpcHandler = (
  event: SyntheticIpcEvent,
  payload?: IpcInvokePayload
) => unknown | Promise<unknown>

type FetchJsonMock = {
  pattern: string
  response: unknown
}

type InternalIpcMain = {
  _invokeHandlers?: Map<string, InternalIpcHandler>
  _originalFetchHandler?: InternalIpcHandler
  _fetchJsonMocks?: FetchJsonMock[]
  removeHandler(channel: string): void
  handle(channel: string, listener: InternalIpcHandler): void
}

function normalizeWalletInsertDoc(doc: Record<string, unknown>) {
  if ('wallet' in doc && 'address' in doc && 'type' in doc) {
    return doc
  }

  const wallet = doc as WalletLike
  return {
    type: wallet.type || 'CommonWallet',
    address: wallet.address,
    wallet,
  }
}

/**
 * IPC-level helpers that run inside the Electron main process
 * via electronApp.evaluate().  Use these to seed data, spy on
 * IPC calls, or mock network responses for E2E tests.
 */

/** Seed a wallet document directly into the in-memory NeDB. */
export async function seedWalletDoc(
  electronApp: ElectronApplication,
  doc: Record<string, unknown>
) {
  return electronApp.evaluate(async ({ ipcMain }: { ipcMain: unknown }, walletDoc) => {
    // The main process exposes keystoreDb:insert channel.
    // We fire a synthetic IPC to insert the doc.
    const handlers = (ipcMain as InternalIpcMain)._invokeHandlers
    const handler = handlers?.get('keystoreDb:insert')
    if (handler) {
      await handler({ sender: {} }, { doc: walletDoc })
    }
  }, normalizeWalletInsertDoc(doc))
}

export async function seedIdentityDoc(
  electronApp: ElectronApplication,
  identity: Record<string, unknown>
) {
  return electronApp.evaluate(
    async ({ ipcMain }: { ipcMain: unknown }, identityDoc) => {
      const handlers = (ipcMain as InternalIpcMain)._invokeHandlers
      const handler = handlers?.get('keystoreDb:insert')
      if (handler) {
        await handler({ sender: {} }, { doc: identityDoc })
      }
    },
    {
      type: 'Identity',
      address: (identity as IdentityLike).ontid,
      wallet: identity,
    }
  )
}

/** Mock the http:fetchJson IPC channel to return a canned response. */
export async function mockFetchJson(
  electronApp: ElectronApplication,
  urlPattern: string,
  response: unknown
) {
  return electronApp.evaluate(
    async (
      { ipcMain }: { ipcMain: unknown },
      { pattern, resp }: { pattern: string; resp: unknown }
    ) => {
      const mainIpc = ipcMain as InternalIpcMain
      const originalHandler = mainIpc._originalFetchHandler
      const handlers = mainIpc._invokeHandlers
      const existingMocks = mainIpc._fetchJsonMocks || []

      // Save original handler on first call
      if (!originalHandler && handlers?.has('http:fetchJson')) {
        const currentHandler = handlers.get('http:fetchJson')
        if (currentHandler) {
          mainIpc._originalFetchHandler = currentHandler
        }
      }

      const nextMocks = existingMocks.filter((mock) => mock.pattern !== pattern)
      nextMocks.push({ pattern, response: resp })
      mainIpc._fetchJsonMocks = nextMocks

      // Register intercepting handler
      mainIpc.removeHandler('http:fetchJson')
      mainIpc.handle(
        'http:fetchJson',
        async (
          event,
          args?: {
            url?: string
          }
        ) => {
          const mocks = mainIpc._fetchJsonMocks || []
          const matchedMock = mocks.find((mock) => {
            const url = typeof args?.url === 'string' ? args.url : ''
            return url.includes(mock.pattern)
          })

          if (matchedMock) {
            return matchedMock.response
          }

          // Fall through to original
          const orig = mainIpc._originalFetchHandler
          if (orig) {
            return orig(event, args)
          }
          return null
        }
      )
    },
    { pattern: urlPattern, resp: response }
  )
}

/** Clear all mock IPC overrides and restore originals. */
export async function clearMocks(electronApp: ElectronApplication) {
  return electronApp.evaluate(async ({ ipcMain }: { ipcMain: unknown }) => {
    const mainIpc = ipcMain as InternalIpcMain
    const orig = mainIpc._originalFetchHandler
    if (orig) {
      mainIpc.removeHandler('http:fetchJson')
      mainIpc.handle('http:fetchJson', orig)
      delete mainIpc._originalFetchHandler
    }

    delete mainIpc._fetchJsonMocks
  })
}

/** Get the save path configured in the app. */
export async function getConfiguredSavePath(electronApp: ElectronApplication): Promise<string> {
  return electronApp.evaluate(async ({ ipcMain }: { ipcMain: unknown }) => {
    const handlers = (ipcMain as InternalIpcMain)._invokeHandlers
    const handler = handlers?.get('preferences:getSavePath')
    if (handler) {
      const result = await handler({ sender: {} })
      return typeof result === 'string' ? result : ''
    }
    return ''
  })
}

export async function findSeededDocs(
  electronApp: ElectronApplication,
  query: Record<string, unknown> = {}
) {
  return electronApp.evaluate(async ({ ipcMain }: { ipcMain: unknown }, dbQuery) => {
    const handlers = (ipcMain as InternalIpcMain)._invokeHandlers
    const handler = handlers?.get('keystoreDb:find')
    if (handler) {
      const result = await handler({ sender: {} }, { query: dbQuery })
      return Array.isArray(result) ? result : []
    }

    return []
  }, query)
}

export async function findDbDocs(
  electronApp: ElectronApplication,
  query: Record<string, unknown> = {}
) {
  return electronApp.evaluate(async ({ ipcMain }: { ipcMain: unknown }, searchQuery) => {
    const handlers = (ipcMain as InternalIpcMain)._invokeHandlers
    const handler = handlers?.get('keystoreDb:find')
    if (handler) {
      const result = await handler({ sender: {} }, { query: searchQuery })
      return Array.isArray(result) ? result : []
    }

    return []
  }, query)
}
