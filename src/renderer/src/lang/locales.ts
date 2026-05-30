import type en from './en'

type LocaleMessages = typeof en

/**
 * Registry of lazily-loaded locales. Vite chunk-splits each module so the
 * non-active locales never ship in the initial bundle. Keep this map in sync
 * with the actual locale files under `src/renderer/src/lang/`.
 *
 * The fallback locale (`en`) is intentionally NOT in this registry — it is
 * eagerly imported in `index.ts` so `vue-i18n` can always render even before
 * any dynamic load completes.
 */
export const lazyLocaleLoaders: Record<string, () => Promise<{ default: LocaleMessages }>> = {
  zh: () => import('./zh') as Promise<{ default: LocaleMessages }>,
}
