import { getLocalItem, setLocalItem } from './browserStorage'
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from './storageKeys'

export function getLanguage(defaultLanguage = 'en') {
  return (
    getLocalItem(LOCAL_STORAGE_KEYS.language, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.language,
    }) || defaultLanguage
  )
}

export function setLanguage(language: unknown) {
  return setLocalItem(LOCAL_STORAGE_KEYS.language, language)
}
