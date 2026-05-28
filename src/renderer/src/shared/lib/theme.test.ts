import { describe, expect, it, vi } from 'vitest'

import {
  RESOLVED_THEMES,
  THEME_MODES,
  applyResolvedTheme,
  createAntdThemeConfig,
  resolveTheme,
  watchSystemTheme,
} from './theme'

describe('theme', () => {
  it('resolves explicit theme modes without relying on system preferences', () => {
    expect(resolveTheme(THEME_MODES.LIGHT)).toBe(RESOLVED_THEMES.LIGHT)
    expect(resolveTheme(THEME_MODES.DARK)).toBe(RESOLVED_THEMES.DARK)
  })

  it('resolves the system theme through matchMedia', () => {
    const darkMatchMedia = vi.fn(() => ({ matches: true }))
    const lightMatchMedia = vi.fn(() => ({ matches: false }))

    expect(resolveTheme(THEME_MODES.SYSTEM, { matchMedia: darkMatchMedia })).toBe(
      RESOLVED_THEMES.DARK
    )
    expect(resolveTheme(THEME_MODES.SYSTEM, { matchMedia: lightMatchMedia })).toBe(
      RESOLVED_THEMES.LIGHT
    )
  })

  it('applies the resolved theme to the document element', () => {
    const setAttribute = vi.fn()
    const documentElement = {
      style: {} as Record<string, unknown>,
      setAttribute,
    }

    applyResolvedTheme(RESOLVED_THEMES.DARK, { documentElement })

    expect(setAttribute).toHaveBeenCalledWith('data-theme', RESOLVED_THEMES.DARK)
    expect(documentElement.style.colorScheme).toBe(RESOLVED_THEMES.DARK)
  })

  it('watches system theme changes and cleans up the listener', () => {
    const onThemeChange = vi.fn()
    const addEventListener = vi.fn()
    const removeEventListener = vi.fn()
    const mediaQueryList = {
      matches: false,
      addEventListener,
      removeEventListener,
    }
    const matchMedia = vi.fn(() => mediaQueryList)

    const stopWatching = watchSystemTheme(onThemeChange, { matchMedia })
    const listener = addEventListener.mock.calls[0]?.[1]

    expect(listener).toEqual(expect.any(Function))
    if (typeof listener !== 'function') {
      throw new Error('Expected system theme listener to be registered')
    }

    listener({ matches: true })
    expect(onThemeChange).toHaveBeenCalledWith(RESOLVED_THEMES.DARK)

    stopWatching()
    expect(removeEventListener).toHaveBeenCalledWith('change', listener)
  })

  it('creates antd theme config from the resolved theme palette', () => {
    const config = createAntdThemeConfig(RESOLVED_THEMES.DARK)

    expect(config.token.colorBgBase).toBe('#0f141a')
    expect(config.token.colorPrimary).toBe('#4f95ff')
    expect(config.token.borderRadius).toBe(0)
  })
})
