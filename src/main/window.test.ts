import { beforeEach, describe, expect, it, vi } from 'vitest'

interface CapturedWebPreferences {
  nodeIntegration?: boolean
  webSecurity?: boolean
  contextIsolation?: boolean
  sandbox?: boolean
  preload?: string
}

interface MockedMainWindow {
  webContents: {
    reload: ReturnType<typeof vi.fn>
  }
  loadURL: ReturnType<typeof vi.fn>
  emitWebContents(event: string, ...args: unknown[]): void
}

const mocks = vi.hoisted(() => {
  const constructorOptions: { value: Record<string, unknown> | null } = { value: null }
  const lastWindow: { value: MockBrowserWindow | null } = { value: null }

  class MockBrowserWindow {
    private webContentsListeners = new Map<string, Array<(...args: unknown[]) => void>>()
    private webContentsDestroyed = false

    webContents = {
      on: vi.fn((event: string, listener: (...args: unknown[]) => void) => {
        this.webContentsListeners.set(event, [
          ...(this.webContentsListeners.get(event) || []),
          listener,
        ])
      }),
      openDevTools: vi.fn(),
      reload: vi.fn(),
      isDestroyed: vi.fn(() => this.webContentsDestroyed),
    }
    once = vi.fn()
    show = vi.fn()
    isDestroyed = vi.fn(() => false)
    loadURL = vi.fn()
    loadFile = vi.fn()

    constructor(options: Record<string, unknown>) {
      constructorOptions.value = options
      lastWindow.value = this
    }

    emitWebContents(event: string, ...args: unknown[]) {
      for (const listener of this.webContentsListeners.get(event) || []) {
        listener(...args)
      }
    }
  }

  return {
    constructorOptions,
    lastWindow,
    BrowserWindow: MockBrowserWindow,
    Menu: {
      buildFromTemplate: vi.fn(() => ({})),
      setApplicationMenu: vi.fn(),
    },
    attachWindowIpc: vi.fn(),
    attachNavigationGuards: vi.fn(),
  }
})

vi.mock('electron', () => ({
  BrowserWindow: mocks.BrowserWindow,
  Menu: mocks.Menu,
}))

vi.mock('./menu', () => ({
  getApplicationMenuTemplate: vi.fn(() => []),
}))

vi.mock('./config', () => ({
  isDevelopment: false,
  shouldOpenDevtools: vi.fn(() => false),
}))

vi.mock('./ipc', () => ({
  attachWindowIpc: mocks.attachWindowIpc,
}))

vi.mock('./navigationGuards', () => ({
  attachNavigationGuards: mocks.attachNavigationGuards,
}))

async function buildWindow() {
  vi.resetModules()
  const { createMainWindow } = await import('./window')
  return createMainWindow()
}

describe('createMainWindow security configuration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mocks.constructorOptions.value = null
  })

  it('hardens the renderer with isolation, sandbox, and no node integration', async () => {
    await buildWindow()

    const webPreferences = (mocks.constructorOptions.value?.webPreferences ||
      {}) as CapturedWebPreferences

    expect(webPreferences.nodeIntegration).toBe(false)
    expect(webPreferences.contextIsolation).toBe(true)
    expect(webPreferences.sandbox).toBe(true)
    expect(webPreferences.webSecurity).toBe(true)
    expect(webPreferences.preload).toMatch(/preload[\\/]index\.js$/)
  })

  it('attaches navigation guards and the window IPC bridge', async () => {
    await buildWindow()

    expect(mocks.attachNavigationGuards).toHaveBeenCalledOnce()
    expect(mocks.attachWindowIpc).toHaveBeenCalledOnce()
  })

  it('loads the bundled renderer file when not in development', async () => {
    const window = await buildWindow()

    expect(window.loadFile).toHaveBeenCalledOnce()
    expect(window.loadURL).not.toHaveBeenCalled()
  })

  it('reloads the renderer after recoverable renderer exits', async () => {
    const window = (await buildWindow()) as unknown as MockedMainWindow

    window.emitWebContents('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })

    expect(window.webContents.reload).toHaveBeenCalledOnce()
    expect(window.loadURL).not.toHaveBeenCalled()
  })

  it('shows a local recovery page after repeated renderer exits', async () => {
    const window = (await buildWindow()) as unknown as MockedMainWindow

    window.emitWebContents('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })
    window.emitWebContents('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })
    window.emitWebContents('render-process-gone', {}, { reason: 'crashed', exitCode: 1 })

    expect(window.webContents.reload).toHaveBeenCalledTimes(2)
    expect(window.loadURL).toHaveBeenCalledWith(expect.stringContaining('data:text/html'))
  })

  it('does not recover clean renderer exits', async () => {
    const window = (await buildWindow()) as unknown as MockedMainWindow

    window.emitWebContents('render-process-gone', {}, { reason: 'clean-exit', exitCode: 0 })

    expect(window.webContents.reload).not.toHaveBeenCalled()
    expect(window.loadURL).not.toHaveBeenCalled()
  })
})
