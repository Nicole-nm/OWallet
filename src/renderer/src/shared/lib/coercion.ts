/**
 * Coercion helpers for normalizing loosely-typed backend payloads, whose fields
 * arrive with inconsistent casing (snake_case vs camelCase) and value types.
 */

/** Coerce to string; null/undefined become ''. */
export function asString(value: unknown): string {
  return value === undefined || value === null ? '' : String(value)
}

/**
 * Coerce to boolean. Numbers: non-zero is true. Strings: 'true'/'1'/'yes' →
 * true, 'false'/'0'/'no' → false (case/whitespace-insensitive). Anything else
 * is false.
 */
export function asBoolean(value: unknown): boolean {
  if (typeof value === 'boolean') return value
  if (typeof value === 'number') return value !== 0
  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase()
    if (['true', '1', 'yes'].includes(normalized)) return true
    if (['false', '0', 'no'].includes(normalized)) return false
  }
  return false
}

/**
 * Return the first defined (non-null/undefined) value among the given keys —
 * for fields the backend may send under more than one casing.
 */
export function pick(record: Record<string, unknown>, ...keys: string[]): unknown {
  for (const key of keys) {
    const value = record[key]
    if (value !== undefined && value !== null) return value
  }
  return undefined
}
