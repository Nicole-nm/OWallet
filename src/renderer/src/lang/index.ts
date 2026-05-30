import { createI18n } from 'vue-i18n'
import en from './en'
import { getLanguage } from '../shared/persistence/languagePersistence'
import { lazyLocaleLoaders } from './locales'

const initialLocale = getLanguage('en')

const i18n = createI18n({
  locale: initialLocale,
  fallbackLocale: 'en',
  legacy: false,
  globalInjection: true,
  messages: { en },
})

// If the user's saved locale isn't the fallback, dynamically load it on boot.
// The `loadLocaleMessages` helper is the canonical runtime entry point.
const initialLoader = lazyLocaleLoaders[initialLocale]
if (initialLoader) {
  void initialLoader().then(
    (mod) => {
      i18n.global.setLocaleMessage(initialLocale, mod.default)
    },
    () => {
      /* unknown locale code — vue-i18n falls back to `en` */
    }
  )
}

export default i18n
