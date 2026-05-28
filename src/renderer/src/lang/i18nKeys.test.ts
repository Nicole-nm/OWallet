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

describe('i18n key consistency', () => {
  const enKeys = collectKeys(en)
  const zhKeys = collectKeys(zh)

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
})
