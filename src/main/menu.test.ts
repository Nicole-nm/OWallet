import { beforeEach, describe, expect, it, vi } from 'vitest'

const electronMocks = vi.hoisted(() => {
  class MockBrowserWindow {
    static windows: MockBrowserWindow[] = []
    static getAllWindows = vi.fn(() => MockBrowserWindow.windows)

    close = vi.fn()
    reload = vi.fn()
    webContents = {
      toggleDevTools: vi.fn(),
    }

    constructor(public id: number) {}
  }

  return {
    BrowserWindow: MockBrowserWindow,
    BaseWindow: class BaseWindow {},
    MenuItem: class MenuItem {},
  }
})

vi.mock('electron', () => electronMocks)

type MenuClick = (...args: unknown[]) => void

describe('application menu template', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    electronMocks.BrowserWindow.windows = []
  })

  it('includes developer tools only in development menus', async () => {
    const { getApplicationMenuTemplate } = await import('./menu')

    const developmentTemplate = getApplicationMenuTemplate({ isDevelopment: true })
    const productionTemplate = getApplicationMenuTemplate({ isDevelopment: false })

    expect(JSON.stringify(developmentTemplate)).toContain('Developer Tools')
    expect(JSON.stringify(productionTemplate)).not.toContain('Developer Tools')
  })

  it('reloads the focused main window and closes secondary windows', async () => {
    const { getApplicationMenuTemplate } = await import('./menu')
    const template = getApplicationMenuTemplate({ isDevelopment: false })
    const editMenu = template.find((item) => item.label === 'Edit')
    const reloadItem = (editMenu?.submenu as Array<{ label?: string; click?: MenuClick }>).find(
      (item) => item.label === 'Reload'
    )
    const mainWindow = new electronMocks.BrowserWindow(1)
    const secondaryWindow = new electronMocks.BrowserWindow(2)
    electronMocks.BrowserWindow.windows = [mainWindow, secondaryWindow]

    reloadItem?.click?.(null, mainWindow)

    expect(secondaryWindow.close).toHaveBeenCalledOnce()
    expect(mainWindow.reload).toHaveBeenCalledOnce()
  })

  it('toggles devtools on the focused window from the development menu', async () => {
    const { getApplicationMenuTemplate } = await import('./menu')
    const template = getApplicationMenuTemplate({ isDevelopment: true })
    const windowMenu = template.find((item) => item.label === 'Window')
    const devtoolsItem = (windowMenu?.submenu as Array<{ label?: string; click?: MenuClick }>).find(
      (item) => item.label === 'Developer Tools'
    )
    const focusedWindow = new electronMocks.BrowserWindow(1)

    devtoolsItem?.click?.(null, focusedWindow)

    expect(focusedWindow.webContents.toggleDevTools).toHaveBeenCalledOnce()
  })
})
