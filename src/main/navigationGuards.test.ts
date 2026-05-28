import { beforeEach, describe, expect, it, vi } from 'vitest'
import { pathToFileURL } from 'node:url'
import { join } from 'path'

const mocks = vi.hoisted(() => ({
  openExternal: vi.fn(),
}))

vi.mock('electron', () => ({
  app: {
    commandLine: { appendSwitch: vi.fn() },
    getPath: vi.fn(() => '/tmp/owallet-user-data'),
    setPath: vi.fn(),
  },
  shell: {
    openExternal: mocks.openExternal,
  },
}))

type WebContentsHandler = (event: { preventDefault: () => void }, url: string) => void
type WindowOpenHandler = (details: { url: string }) => { action: 'deny' }

function rendererEntryUrl() {
  return pathToFileURL(join(__dirname, '../renderer/index.html')).href
}

async function createGuardedWindow() {
  vi.resetModules()
  const handlers: Record<string, WebContentsHandler> = {}
  let windowOpenHandler: WindowOpenHandler | null = null
  const window = {
    webContents: {
      on: vi.fn((event: string, handler: WebContentsHandler) => {
        handlers[event] = handler
      }),
      setWindowOpenHandler: vi.fn((handler: WindowOpenHandler) => {
        windowOpenHandler = handler
      }),
    },
  }

  const { attachNavigationGuards } = await import('./navigationGuards')
  attachNavigationGuards(window as never)
  return { handlers, window, getWindowOpenHandler: () => windowOpenHandler }
}

describe('navigation guards', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.spyOn(console, 'warn').mockImplementation(() => undefined)
  })

  it('blocks disallowed top-level navigations', async () => {
    const { handlers } = await createGuardedWindow()
    const event = { preventDefault: vi.fn() }

    handlers['will-navigate']?.(event, 'https://attacker.test/phishing')

    expect(event.preventDefault).toHaveBeenCalledOnce()
    expect(console.warn).toHaveBeenCalledWith(
      '[OWallet] Blocked navigation to:',
      'https://attacker.test/phishing'
    )
  })

  it('allows the packaged renderer entry file and local development URL', async () => {
    const { handlers } = await createGuardedWindow()
    const packagedEvent = { preventDefault: vi.fn() }
    const devEvent = { preventDefault: vi.fn() }

    handlers['will-navigate']?.(packagedEvent, rendererEntryUrl())
    handlers['will-navigate']?.(devEvent, 'http://localhost:5173')

    expect(packagedEvent.preventDefault).not.toHaveBeenCalled()
    expect(devEvent.preventDefault).not.toHaveBeenCalled()
  })

  it('denies new windows while opening allowlisted external URLs through the shell', async () => {
    const { getWindowOpenHandler } = await createGuardedWindow()
    const handler = getWindowOpenHandler()

    expect(handler?.({ url: 'https://support.ledgerwallet.com/hc/en-us/articles/1' })).toEqual({
      action: 'deny',
    })
    expect(handler?.({ url: 'https://support.ledgerwallet.com.attacker.test/' })).toEqual({
      action: 'deny',
    })

    expect(mocks.openExternal).toHaveBeenCalledTimes(1)
    expect(mocks.openExternal).toHaveBeenCalledWith(
      'https://support.ledgerwallet.com/hc/en-us/articles/1'
    )
  })
})
