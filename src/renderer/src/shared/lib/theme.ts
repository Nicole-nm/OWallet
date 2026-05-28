import { theme as antdTheme } from 'ant-design-vue'

export const THEME_MODES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
  SYSTEM: 'system',
})

export const RESOLVED_THEMES = Object.freeze({
  LIGHT: 'light',
  DARK: 'dark',
})

const SYSTEM_THEME_MEDIA_QUERY = '(prefers-color-scheme: dark)'

type ThemeMode = (typeof THEME_MODES)[keyof typeof THEME_MODES]
type ResolvedTheme = (typeof RESOLVED_THEMES)[keyof typeof RESOLVED_THEMES]
interface ThemeMediaQueryList {
  matches: boolean
  addEventListener?: MediaQueryList['addEventListener']
  removeEventListener?: MediaQueryList['removeEventListener']
  addListener?: MediaQueryList['addListener']
  removeListener?: MediaQueryList['removeListener']
}

interface ThemeDocumentElement {
  setAttribute: (name: string, value: string) => void
  style: { colorScheme?: string }
}

type MatchMediaFn = (query: string) => ThemeMediaQueryList
type ThemeChangeHandler = (theme: ResolvedTheme) => void

interface SystemThemeOptions {
  matchMedia?: MatchMediaFn | null
}

interface ApplyThemeOptions {
  documentElement?: ThemeDocumentElement | null
}

const LIGHT_THEME_PALETTE = Object.freeze({
  colorPrimary: '#196bd8',
  colorPrimaryHover: '#619ae5',
  colorInfo: '#196bd8',
  colorSuccess: '#4eb926',
  colorWarning: '#d69b00',
  colorError: '#ff4d4f',
  colorText: '#000000',
  colorTextSecondary: '#5e6369',
  colorTextTertiary: '#6f7781',
  colorTextQuaternary: '#a5a7a9',
  colorBgBase: '#ffffff',
  colorBgContainer: '#ffffff',
  colorBgElevated: '#ffffff',
  colorBgLayout: '#ffffff',
  colorBgMask: 'rgba(0, 0, 0, 0.5)',
  colorBorder: '#dfe2e9',
  colorBorderSecondary: '#f4f4f6',
  colorFillSecondary: '#f5f7fb',
  colorFillTertiary: '#e4e6ea',
  boxShadow: '0 -1px 6px 0 rgba(242, 242, 242, 1)',
})

const DARK_THEME_PALETTE = Object.freeze({
  colorPrimary: '#4f95ff',
  colorPrimaryHover: '#77afff',
  colorInfo: '#77afff',
  colorSuccess: '#79d34f',
  colorWarning: '#ffcf4d',
  colorError: '#ff6b6d',
  colorText: '#f3f6fa',
  colorTextSecondary: '#c2cad4',
  colorTextTertiary: '#98a2b3',
  colorTextQuaternary: '#7f8a99',
  colorBgBase: '#0f141a',
  colorBgContainer: '#161d26',
  colorBgElevated: '#1b232d',
  colorBgLayout: '#0f141a',
  colorBgMask: 'rgba(3, 7, 12, 0.72)',
  colorBorder: '#3a4555',
  colorBorderSecondary: '#242c36',
  colorFillSecondary: '#202833',
  colorFillTertiary: '#293240',
  boxShadow: '0 -1px 6px 0 rgba(0, 0, 0, 0.45)',
})

function getMatchMedia(matchMediaImpl?: MatchMediaFn | null): MatchMediaFn | null {
  if (typeof matchMediaImpl === 'function') {
    return matchMediaImpl
  }

  return typeof window !== 'undefined' && typeof window.matchMedia === 'function'
    ? window.matchMedia.bind(window)
    : null
}

export function normalizeThemeMode(themeMode: unknown): ThemeMode {
  return (Object.values(THEME_MODES) as ThemeMode[]).includes(themeMode as ThemeMode)
    ? (themeMode as ThemeMode)
    : THEME_MODES.SYSTEM
}

export function normalizeResolvedTheme(theme: unknown): ResolvedTheme {
  return theme === RESOLVED_THEMES.DARK ? RESOLVED_THEMES.DARK : RESOLVED_THEMES.LIGHT
}

export function getSystemTheme({ matchMedia }: SystemThemeOptions = {}): ResolvedTheme {
  const query = getMatchMedia(matchMedia)
  if (!query) {
    return RESOLVED_THEMES.LIGHT
  }

  return query(SYSTEM_THEME_MEDIA_QUERY).matches ? RESOLVED_THEMES.DARK : RESOLVED_THEMES.LIGHT
}

export function resolveTheme(themeMode: unknown, options: SystemThemeOptions = {}): ResolvedTheme {
  const normalizedThemeMode = normalizeThemeMode(themeMode)
  if (normalizedThemeMode === THEME_MODES.LIGHT) {
    return RESOLVED_THEMES.LIGHT
  }

  if (normalizedThemeMode === THEME_MODES.DARK) {
    return RESOLVED_THEMES.DARK
  }

  return getSystemTheme(options)
}

export function applyResolvedTheme(
  theme: unknown,
  { documentElement }: ApplyThemeOptions = {}
): void {
  const root =
    documentElement || (typeof document !== 'undefined' ? document.documentElement : null)
  if (!root) {
    return
  }

  const normalizedTheme = normalizeResolvedTheme(theme)
  root.setAttribute('data-theme', normalizedTheme)
  root.style.colorScheme = normalizedTheme
}

export function watchSystemTheme(
  onThemeChange: ThemeChangeHandler,
  { matchMedia }: SystemThemeOptions = {}
): () => void {
  const query = getMatchMedia(matchMedia)
  if (!query || typeof onThemeChange !== 'function') {
    return () => {}
  }

  const mediaQueryList = query(SYSTEM_THEME_MEDIA_QUERY)
  const listener = (event: { matches: boolean }) => {
    onThemeChange(event.matches ? RESOLVED_THEMES.DARK : RESOLVED_THEMES.LIGHT)
  }
  const eventListener: EventListener = (event) => listener(event as MediaQueryListEvent)

  const addEventListener = mediaQueryList.addEventListener
  const removeEventListener = mediaQueryList.removeEventListener
  if (typeof addEventListener === 'function' && typeof removeEventListener === 'function') {
    addEventListener.call(mediaQueryList, 'change', eventListener)
    return () => removeEventListener.call(mediaQueryList, 'change', eventListener)
  }

  const addListener = mediaQueryList.addListener
  const removeListener = mediaQueryList.removeListener
  if (typeof addListener === 'function' && typeof removeListener === 'function') {
    addListener.call(mediaQueryList, listener)
    return () => removeListener.call(mediaQueryList, listener)
  }

  return () => {}
}

export function getThemePalette(theme: unknown) {
  return normalizeResolvedTheme(theme) === RESOLVED_THEMES.DARK
    ? DARK_THEME_PALETTE
    : LIGHT_THEME_PALETTE
}

export function createAntdThemeConfig(theme: unknown) {
  const resolvedTheme = normalizeResolvedTheme(theme)
  const palette = getThemePalette(resolvedTheme)

  return {
    algorithm:
      resolvedTheme === RESOLVED_THEMES.DARK ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      borderRadius: 0,
      colorPrimary: palette.colorPrimary,
      colorInfo: palette.colorInfo,
      colorLink: palette.colorPrimary,
      colorSuccess: palette.colorSuccess,
      colorWarning: palette.colorWarning,
      colorError: palette.colorError,
      colorText: palette.colorText,
      colorTextSecondary: palette.colorTextSecondary,
      colorTextTertiary: palette.colorTextTertiary,
      colorTextQuaternary: palette.colorTextQuaternary,
      colorBgBase: palette.colorBgBase,
      colorBgContainer: palette.colorBgContainer,
      colorBgElevated: palette.colorBgElevated,
      colorBgLayout: palette.colorBgLayout,
      colorBgMask: palette.colorBgMask,
      colorBorder: palette.colorBorder,
      colorBorderSecondary: palette.colorBorderSecondary,
      colorFillSecondary: palette.colorFillSecondary,
      colorFillTertiary: palette.colorFillTertiary,
      boxShadow: palette.boxShadow,
      fontFamily: 'AvenirNext-Regular, sans-serif',
      controlHeight: 34,
    },
    components: {
      Button: {
        borderRadius: 0,
        controlHeight: 34,
        fontWeight: 500,
      },
      Input: {
        activeBorderColor: palette.colorPrimary,
        hoverBorderColor: palette.colorPrimary,
        activeShadow: 'none',
      },
      Select: {
        borderRadius: 0,
        controlHeight: 34,
        optionSelectedBg: resolvedTheme === RESOLVED_THEMES.DARK ? '#17335f' : '#eaf2ff',
      },
      Table: {
        headerBg: resolvedTheme === RESOLVED_THEMES.DARK ? '#161d26' : '#f5f7fb',
        rowHoverBg: resolvedTheme === RESOLVED_THEMES.DARK ? '#202833' : '#f5f7fb',
      },
    },
  }
}
