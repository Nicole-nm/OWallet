import { beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn(async () => undefined),
  showOpenDialog: vi.fn(async () => ({ canceled: false, filePaths: ['/tmp/wallets'] })),
  validateKeystorePath: vi.fn(async () => true),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: { appendSwitch: vi.fn() },
    getPath: vi.fn(() => '/tmp/owallet-user-data'),
    setPath: vi.fn(),
  },
  dialog: {
    showOpenDialog: mocks.showOpenDialog,
  },
  shell: {
    openExternal: mocks.openExternal,
  },
}))

vi.mock('./pathValidation', () => ({
  validateKeystorePath: mocks.validateKeystorePath,
}))

type IpcHandler = (_event: unknown, payload?: unknown) => unknown

async function getSystemHandlers() {
  vi.resetModules()
  const handlers: Record<string, IpcHandler> = {}
  const ipcMain = {
    handle: vi.fn((channel: string, handler: IpcHandler) => {
      handlers[channel] = handler
    }),
  }

  const { registerSystemIpc } = await import('./system')
  registerSystemIpc(ipcMain as never)
  return handlers
}

describe('system IPC service', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    delete process.env.IS_TEST
  })

  it('opens only allowlisted external URLs', async () => {
    const handlers = await getSystemHandlers()

    await expect(
      handlers['shell:openExternal']?.(null, 'https://github.com/ontio/OWallet/releases')
    ).resolves.toBeUndefined()
    expect(() =>
      handlers['shell:openExternal']?.(null, 'https://github.com.attacker.test/ontio/OWallet')
    ).toThrow('disallowed URL')

    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
    expect(mocks.openExternal).toHaveBeenCalledWith('https://github.com/ontio/OWallet/releases')
  })

  it('sanitizes directory dialog options and forces directory selection', async () => {
    const handlers = await getSystemHandlers()

    const result = await handlers['dialog:openDirectory']?.(null, {
      title: 'Choose wallet folder',
      defaultPath: '/tmp',
      buttonLabel: 'ignored',
      properties: ['openFile'],
    })

    expect(result).toEqual({ canceled: false, filePaths: ['/tmp/wallets'] })
    expect(mocks.showOpenDialog).toHaveBeenCalledWith({
      title: 'Choose wallet folder',
      defaultPath: '/tmp',
      properties: ['openDirectory', 'createDirectory'],
    })
  })

  it('delegates path validation and rejects non-string paths', async () => {
    const handlers = await getSystemHandlers()

    await expect(handlers['system:validateKeystorePath']?.(null, '/tmp/wallets')).resolves.toBe(
      true
    )
    await expect(handlers['system:validateKeystorePath']?.(null, 123)).rejects.toThrow(
      'requires a string path'
    )
    expect(mocks.validateKeystorePath).toHaveBeenCalledWith('/tmp/wallets')
  })

  it('reports whether the app is running in test mode', async () => {
    const handlers = await getSystemHandlers()

    expect(handlers['system:isTest']?.(null)).toBe(false)
    process.env.IS_TEST = '1'
    expect(handlers['system:isTest']?.(null)).toBe(true)
  })
})
