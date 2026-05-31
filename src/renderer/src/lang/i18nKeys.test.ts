import { describe, expect, it } from 'vitest'
import en from './en'
import zh from './zh'

function collectKeys(obj: Record<string, unknown>, prefix = ''): string[] {
  const keys: string[] = []
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      keys.push(...collectKeys(value as Record<string, unknown>, path))
    } else {
      keys.push(path)
    }
  }
  return keys.sort()
}

/** Flattens a message tree into a `path -> string value` map (leaf strings only). */
function collectLeaves(obj: Record<string, unknown>, prefix = ''): Map<string, string> {
  const leaves = new Map<string, string>()
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key
    const value = obj[key]
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      for (const [k, v] of collectLeaves(value as Record<string, unknown>, path)) {
        leaves.set(k, v)
      }
    } else if (typeof value === 'string') {
      leaves.set(path, value)
    }
  }
  return leaves
}

/** Extracts vue-i18n interpolation tokens (`{name}`, `{0}`) as a sorted list. */
function interpolationTokens(value: string): string[] {
  return (value.match(/\{[^}]+\}/g) ?? []).sort()
}

describe('i18n key consistency', () => {
  const enKeys = collectKeys(en)
  const zhKeys = collectKeys(zh)
  const enLeaves = collectLeaves(en)
  const zhLeaves = collectLeaves(zh)

  it('en and zh have the same number of keys', () => {
    expect(enKeys.length).toBe(zhKeys.length)
  })

  it('every en key exists in zh', () => {
    const missingInZh = enKeys.filter((k) => !zhKeys.includes(k))
    expect(missingInZh).toEqual([])
  })

  it('every zh key exists in en', () => {
    const missingInEn = zhKeys.filter((k) => !enKeys.includes(k))
    expect(missingInEn).toEqual([])
  })

  it('top-level sections match', () => {
    const enSections = Object.keys(en).sort()
    const zhSections = Object.keys(zh).sort()
    expect(enSections).toEqual(zhSections)
  })

  it('keeps empty message values consistent across en and zh', () => {
    const emptyEn = new Set([...enLeaves].filter(([, v]) => v.trim() === '').map(([k]) => k))
    const emptyZh = new Set([...zhLeaves].filter(([, v]) => v.trim() === '').map(([k]) => k))
    // Keys that are blank in BOTH locales are accepted as intentional placeholders.
    // This snapshot guards against new keys being added blank in only one locale.
    const knownEmptyEn = [
      'createJsonWallet.details',
      'importIdentity.label',
      'importJsonWallet.details',
      'nodeMgmt.nodeApplyTip',
    ]
    const knownEmptyZh = ['importIdentity.label']
    expect([...emptyEn].sort()).toEqual([...knownEmptyEn].sort())
    expect([...emptyZh].sort()).toEqual([...knownEmptyZh].sort())
  })

  it('en and zh use the same interpolation tokens per key', () => {
    const mismatches: string[] = []
    for (const [path, enValue] of enLeaves) {
      const zhValue = zhLeaves.get(path)
      if (zhValue === undefined) continue
      const enTokens = interpolationTokens(enValue)
      const zhTokens = interpolationTokens(zhValue)
      if (enTokens.join(',') !== zhTokens.join(',')) {
        mismatches.push(`${path}: en[${enTokens.join(' ')}] vs zh[${zhTokens.join(' ')}]`)
      }
    }
    expect(mismatches).toEqual([])
  })
})
