import { getLocalJson, setLocalJson } from './browserStorage'
import { LEGACY_LOCAL_STORAGE_KEYS, LOCAL_STORAGE_KEYS } from './storageKeys'
import type { Oep4TokensByNetwork, TrackedOep4Token } from '../types'

export function loadStoredOep4s() {
  return (
    getLocalJson<TrackedOep4Token[]>(LOCAL_STORAGE_KEYS.oep4s, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.oep4s,
    }) || []
  )
}

export function saveStoredOep4s(oep4s: TrackedOep4Token[]) {
  setLocalJson(LOCAL_STORAGE_KEYS.oep4s, oep4s)
}

export function loadStoredOep4Tokens(defaultValue: Oep4TokensByNetwork) {
  return (
    getLocalJson<Oep4TokensByNetwork>(LOCAL_STORAGE_KEYS.oep4Tokens, {
      legacyKeys: LEGACY_LOCAL_STORAGE_KEYS.oep4Tokens,
    }) || defaultValue
  )
}

export function saveStoredOep4Tokens(oep4Tokens: Oep4TokensByNetwork) {
  setLocalJson(LOCAL_STORAGE_KEYS.oep4Tokens, oep4Tokens)
}
