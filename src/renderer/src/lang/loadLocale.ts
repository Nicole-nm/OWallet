import i18n from './index'
import { lazyLocaleLoaders } from './locales'

const loaded = new Set<string>(['en'])
const inflight = new Map<string, Promise<void>>()

export async function loadLocaleMessages(locale: string): Promise<void> {
  if (loaded.has(locale)) return
  const loader = lazyLocaleLoaders[locale]
  if (!loader) return // unknown locale — caller's choice to handle

  let pending = inflight.get(locale)
  if (!pending) {
    pending = (async () => {
      const mod = await loader()
      i18n.global.setLocaleMessage(locale, mod.default)
      loaded.add(locale)
    })().finally(() => {
      inflight.delete(locale)
    })
    inflight.set(locale, pending)
  }
  return pending
}
