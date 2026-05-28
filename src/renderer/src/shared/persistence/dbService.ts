import {
  dbFind as platformDbFind,
  dbInsert as platformDbInsert,
  dbRemove as platformDbRemove,
  dbUpdate as platformDbUpdate,
} from '../platform/bridge'
import type {
  KeystoreDbDocument,
  KeystoreDbQuery,
  KeystoreDbRemoveOptions,
  KeystoreDbUpdateOptions,
} from '../../../../shared-types/ipc'
import { getCachedQueryResult, invalidateQueryCache } from './queryCache'

function toSerializableValue(value: unknown): unknown {
  if (value === null || value === undefined) {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => toSerializableValue(item))
  }

  if (typeof value !== 'object') {
    return value
  }

  const record = value as Record<string, unknown> & { toJSON?: () => unknown }
  if (typeof record.toJSON === 'function') {
    return toSerializableValue(record.toJSON())
  }

  const plainObject: Record<string, unknown> = {}
  for (const [key, nestedValue] of Object.entries(record)) {
    plainObject[key] = toSerializableValue(nestedValue)
  }

  return plainObject
}

const db = {
  find<T = unknown>(query: KeystoreDbQuery): Promise<T[]> {
    return getCachedQueryResult({
      prefix: 'db:find',
      query,
      loader: () => platformDbFind<T>(query),
    })
  },
  insert<T extends KeystoreDbDocument = KeystoreDbDocument>(doc: T): Promise<T> {
    invalidateQueryCache('db:find')
    return platformDbInsert<T>(toSerializableValue(doc) as T)
  },
  update(
    query: KeystoreDbQuery,
    doc: KeystoreDbDocument,
    options: KeystoreDbUpdateOptions = {}
  ): Promise<number> {
    invalidateQueryCache('db:find')
    return platformDbUpdate(query, toSerializableValue(doc) as KeystoreDbDocument, options)
  },
  remove(query: KeystoreDbQuery, options: KeystoreDbRemoveOptions = {}): Promise<number> {
    invalidateQueryCache('db:find')
    return platformDbRemove(query, options)
  },
}

export const dbFind = <T = unknown>(dbInstance: typeof db, query: KeystoreDbQuery): Promise<T[]> =>
  dbInstance.find<T>(query)
export const dbInsert = <T extends KeystoreDbDocument = KeystoreDbDocument>(
  dbInstance: typeof db,
  doc: T
): Promise<T> => dbInstance.insert<T>(doc)
export const dbUpsert = <T extends KeystoreDbDocument>(
  dbInstance: typeof db,
  index: string,
  doc: T & { indexKey: unknown }
) => dbInstance.update({ [index]: doc.indexKey }, doc, { upsert: true })

export default db
