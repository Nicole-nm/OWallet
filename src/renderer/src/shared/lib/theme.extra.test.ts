import { describe, expect, it, vi } from 'vitest'

vi.mock('ant-design-vue', () => ({
  theme: { darkAlgorithm: 'dark-algo', defaultAlgorithm: 'default-algo' },
}))

import {
  applyResolvedTheme,
  createAntdThemeConfig,
  getSystemTheme,
  getThemePalette,
  normalizeResolvedTheme,
  normalizeThemeMode,
  RESOLVED_THEMES,
  THEME_MODES,
  watchSystemTheme,
} from './theme'

describe('normalizeThemeMode', () => {
  it('passes through valid modes and falls back to system otherwise', () => {
    expect(normalizeThemeMode('dark')).toBe(THEME_MODES.DARK)
    expect(normalizeThemeMode('light')).toBe(THEME_MODES.LIGHT)
    expect(normalizeThemeMode('purple')).toBe(THEME_MODES.SYSTEM)
    expect(normalizeThemeMode(undefined)).toBe(THEME_MODES.SYSTEM)
  })
})

describe('normalizeResolvedTheme', () => {
  it('returns dark only for the dark token', () => {
    expect(normalizeResolvedTheme('dark')).toBe(RESOLVED_THEMES.DARK)
    expect(normalizeResolvedTheme('whatever')).toBe(RESOLVED_THEMES.LIGHT)
  })
})

describe('getSystemTheme without media query', () => {
  it('returns light when matchMedia is unavailable', () => {
    expect(getSystemTheme({ matchMedia: null })).toBe(RESOLVED_THEMES.LIGHT)
  })

  it('returns light when the media query does not match', () => {
    expect(getSystemTheme({ matchMedia: vi.fn(() => ({ matches: false })) })).toBe(
      RESOLVED_THEMES.LIGHT
    )
  })
})

describe('applyResolvedTheme no-op branch', () => {
  it('does nothing when no document element is resolvable', () => {
    expect(() => applyResolvedTheme('dark', { documentElement: null })).not.toThrow()
  })
})

describe('watchSystemTheme fallbacks', () => {
  it('returns a noop when matchMedia is unavailable', () => {
    expect(watchSystemTheme(() => {}, { matchMedia: null })()).toBeUndefined()
  })

  it('returns a noop when the handler is not a function', () => {
    const matchMedia = vi.fn(() => ({ matches: false }))
    expect(watchSystemTheme(null as never, { matchMedia })()).toBeUndefined()
  })

  it('falls back to addListener/removeListener', () => {
    const addListener = vi.fn()
    const removeListener = vi.fn()
    const handler = vi.fn()
    const matchMedia = vi.fn(() => ({ matches: false, addListener, removeListener }))

    const dispose = watchSystemTheme(handler, { matchMedia })
    const registered = addListener.mock.calls[0]![0] as (e: { matches: boolean }) => void
    registered({ matches: false })
    expect(handler).toHaveBeenCalledWith(RESOLVED_THEMES.LIGHT)

    dispose()
    expect(removeListener).toHaveBeenCalled()
  })

  it('returns a noop when no listener API is present', () => {
    const matchMedia = vi.fn(() => ({ matches: false }))
    expect(watchSystemTheme(() => {}, { matchMedia })()).toBeUndefined()
  })
})

describe('palette and light antd config', () => {
  it('selects the dark and light palettes', () => {
    expect(getThemePalette('dark').colorBgBase).toBe('#0f141a')
    expect(getThemePalette('light').colorBgBase).toBe('#ffffff')
  })

  it('builds the light antd config with the default algorithm', () => {
    const config = createAntdThemeConfig('light')
    expect(config.algorithm).toBe('default-algo')
    expect(config.components.Select.optionSelectedBg).toBe('#eaf2ff')
    expect(config.components.Table.headerBg).toBe('#f5f7fb')
  })
})
