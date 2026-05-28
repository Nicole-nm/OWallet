import { createI18n } from 'vue-i18n'
import en from './en'
import zh from './zh'
import { getLanguage } from '../shared/persistence/languagePersistence'

const messages = {
  en,
  zh,
}

const i18n = createI18n({
  locale: getLanguage('en'),
  legacy: false,
  globalInjection: true,
  messages,
})

export default i18n
