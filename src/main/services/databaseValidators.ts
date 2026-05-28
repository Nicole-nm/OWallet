export const WALLET_RECORD_TYPES: readonly string[] = [
  'CommonWallet',
  'SharedWallet',
  'HardwareWallet',
]

const ALLOWED_RECORD_TYPES = new Set([...WALLET_RECORD_TYPES, 'Identity'])
const ALLOWED_QUERY_KEYS = new Set(['type', 'address', 'wallet.publicKey'])
const DANGEROUS_OBJECT_KEYS = new Set(['__proto__', 'constructor', 'prototype'])
const MAX_DOCUMENT_BYTES = 1024 * 1024

function isPlainRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value)
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0
}

function isAllowedRecordType(value: unknown): value is string {
  return typeof value === 'string' && ALLOWED_RECORD_TYPES.has(value)
}

function matchesSingleOrInFilter(
  value: unknown,
  isAllowedValue: (item: unknown) => boolean
): boolean {
  if (isAllowedValue(value)) {
    return true
  }

  return isPlainRecord(value) && Array.isArray(value.$in) && value.$in.every(isAllowedValue)
}

function assertNoDangerousObjectKeys(value: unknown): void {
  if (!isPlainRecord(value) && !Array.isArray(value)) {
    return
  }

  const entries = Array.isArray(value)
    ? value.map((nestedValue, index) => [String(index), nestedValue] as const)
    : Object.entries(value)

  for (const [key, nestedValue] of entries) {
    if (DANGEROUS_OBJECT_KEYS.has(key)) {
      throw new Error(`[OWallet] Rejected unsafe object key: ${key}`)
    }
    assertNoDangerousObjectKeys(nestedValue)
  }
}

function assertStringArrayFilter(value: unknown, field: string): void {
  if (matchesSingleOrInFilter(value, isNonEmptyString)) {
    return
  }

  throw new Error(`[OWallet] Invalid query filter for ${field}`)
}

function assertTypeFilter(value: unknown): void {
  if (matchesSingleOrInFilter(value, isAllowedRecordType)) {
    return
  }

  throw new Error('[OWallet] Invalid keystore record type query')
}

export function assertSafeQuery(
  query: unknown,
  { allowEmpty = false } = {}
): asserts query is Record<string, unknown> {
  if (!isPlainRecord(query)) {
    throw new Error('[OWallet] Database query must be an object')
  }

  const entries = Object.entries(query)
  if (!allowEmpty && entries.length === 0) {
    throw new Error('[OWallet] Database query must not be empty')
  }

  assertNoDangerousObjectKeys(query)

  for (const [key, value] of entries) {
    if (!ALLOWED_QUERY_KEYS.has(key)) {
      throw new Error(`[OWallet] Unsupported database query field: ${key}`)
    }

    if (key === 'type') {
      assertTypeFilter(value)
      continue
    }

    assertStringArrayFilter(value, key)
  }
}

export function assertSafeDocument(doc: unknown): asserts doc is Record<string, unknown> {
  if (!isPlainRecord(doc)) {
    throw new Error('[OWallet] Database document must be an object')
  }

  assertNoDangerousObjectKeys(doc)

  if (!isAllowedRecordType(doc.type)) {
    throw new Error('[OWallet] Database document has an invalid type')
  }

  if (!isNonEmptyString(doc.address)) {
    throw new Error('[OWallet] Database document requires a non-empty address')
  }

  if (!isPlainRecord(doc.wallet)) {
    throw new Error('[OWallet] Database document requires a wallet object')
  }

  const serialized = JSON.stringify(doc)
  if (serialized.length > MAX_DOCUMENT_BYTES) {
    throw new Error('[OWallet] Database document is too large')
  }
}

export function assertSafeUpdate(
  query: unknown,
  update: unknown,
  options: unknown
): asserts query is Record<string, unknown> {
  assertSafeQuery(query)

  if (!isNonEmptyString(query.address)) {
    throw new Error('[OWallet] Database update requires a concrete address')
  }

  if (!isPlainRecord(update) || !isPlainRecord(update.$set)) {
    throw new Error('[OWallet] Database update must use $set')
  }

  assertNoDangerousObjectKeys(update)

  const updateKeys = Object.keys(update.$set)
  if (updateKeys.length !== 1 || updateKeys[0] !== 'wallet' || !isPlainRecord(update.$set.wallet)) {
    throw new Error('[OWallet] Database update can only replace the wallet object')
  }

  if (isPlainRecord(options) && options.multi === true) {
    throw new Error('[OWallet] Database update does not allow multi=true')
  }
}

export function assertSafeRemove(
  query: unknown,
  options: unknown
): asserts query is Record<string, unknown> {
  assertSafeQuery(query)

  if (!isAllowedRecordType(query.type)) {
    throw new Error('[OWallet] Database remove requires a concrete record type')
  }

  if (!isNonEmptyString(query.address)) {
    throw new Error('[OWallet] Database remove requires a concrete address')
  }

  if (isPlainRecord(options) && options.multi === true) {
    throw new Error('[OWallet] Database remove does not allow multi=true')
  }
}
