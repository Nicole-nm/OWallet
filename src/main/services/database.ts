'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { app } from 'electron'
import { appendFile, chmod, mkdir } from 'node:fs/promises'
import { dirname, join } from 'path'
import { createRequire } from 'module'
import { isDevelopment } from '../config'
import { clearConfiguredSavePath, getResolvedSavePath } from './preferences'
import {
  WALLET_RECORD_TYPES,
  assertSafeDocument,
  assertSafeQuery,
  assertSafeRemove,
  assertSafeUpdate,
} from './databaseValidators'

const require = createRequire(import.meta.url)
const Datastore = require('nedb-promises')
const nedbStorage = require('@seald-io/nedb/lib/storage')

interface NedbDatastore {
  find(query: Record<string, unknown>): Promise<unknown[]>
  insert(doc: Record<string, unknown>): Promise<unknown>
  update(
    query: Record<string, unknown>,
    update: Record<string, unknown>,
    options: Record<string, unknown>
  ): Promise<number>
  remove(query: Record<string, unknown>, options: Record<string, unknown>): Promise<number>
  ensureIndex(options: { fieldName: string; unique?: boolean }): Promise<void>
}

interface KeystoreDatabaseConnection {
  database: NedbDatastore
  ready: Promise<void>
}

const databaseCache = new Map<string, KeystoreDatabaseConnection>()

nedbStorage.crashSafeWriteFileLinesAsync = async (
  filename: string,
  lines: string[],
  modes = { fileMode: 0o600, dirMode: 0o700 }
) => {
  await nedbStorage.ensureParentDirectoryExistsAsync(filename, modes.dirMode)
  await nedbStorage.writeFileLinesAsync(filename, lines, modes.fileMode)
}

function getDatabaseFilename(savePath: string): string {
  return join(savePath, 'keystore.db')
}

async function ensureDatabaseFileReady(filename: string): Promise<void> {
  await mkdir(dirname(filename), { recursive: true, mode: 0o700 })
  await chmod(dirname(filename), 0o700).catch(() => undefined)
  await appendFile(filename, '', { mode: 0o600 })
  await chmod(filename, 0o600).catch(() => undefined)
}

async function logDatabaseSummary(savePath: string, filename: string, database: NedbDatastore) {
  if (!isDevelopment || process.env.NODE_ENV === 'test') {
    return
  }

  try {
    const docs = await database.find({ type: { $in: WALLET_RECORD_TYPES } })
    const counts: Record<string, number> = {}

    for (const doc of docs) {
      const type = (doc as { type?: string }).type
      if (type && WALLET_RECORD_TYPES.includes(type)) {
        counts[type] = (counts[type] || 0) + 1
      }
    }

    console.info('[OWallet][keystoreDb] loaded', {
      savePath,
      filename,
      totalWalletRecords: docs.length,
      counts,
    })
  } catch (error) {
    console.warn('[OWallet][keystoreDb] unable to summarize database', {
      savePath,
      filename,
      error: error instanceof Error ? error.message : String(error),
    })
  }
}

async function ensureDatabase(savePath: string): Promise<KeystoreDatabaseConnection> {
  const filename = getDatabaseFilename(savePath)
  if (!databaseCache.has(filename)) {
    await ensureDatabaseFileReady(filename)
    const database: NedbDatastore = Datastore.create({ filename, autoload: true })
    const ready = database
      .ensureIndex({ fieldName: 'address', unique: true })
      .then(() => logDatabaseSummary(savePath, filename, database))
    const connection: KeystoreDatabaseConnection = { database, ready }
    ready.catch(() => {
      if (databaseCache.get(filename) === connection) {
        databaseCache.delete(filename)
      }
    })
    databaseCache.set(filename, connection)
  }

  return databaseCache.get(filename)!
}

function isRecoverableStorageError(error: unknown): boolean {
  return (
    (error as NodeJS.ErrnoException)?.code === 'ENOENT' ||
    (error as NodeJS.ErrnoException)?.code === 'ENOTDIR'
  )
}

function clearDatabaseCache(savePath: string): void {
  databaseCache.delete(getDatabaseFilename(savePath))
}

export function closeAllDatabases(): void {
  databaseCache.clear()
}

async function withDatabaseAtPath(
  savePath: string,
  callback: (db: NedbDatastore) => Promise<unknown>
) {
  let connection = await ensureDatabase(savePath)

  try {
    await connection.ready
  } catch (error) {
    if (!isRecoverableStorageError(error)) {
      throw error
    }

    clearDatabaseCache(savePath)
    connection = await ensureDatabase(savePath)
    await connection.ready
  }

  return callback(connection.database)
}

async function withDatabase(callback: (db: NedbDatastore) => Promise<unknown>) {
  const savePath = await getResolvedSavePath()

  try {
    return await withDatabaseAtPath(savePath, callback)
  } catch (error) {
    const defaultSavePath = app.getPath('userData')
    if (!isRecoverableStorageError(error) || savePath === defaultSavePath) {
      throw error
    }

    await clearConfiguredSavePath()
    return withDatabaseAtPath(defaultSavePath, callback)
  }
}

export function registerDatabaseIpc(ipcMain: IpcMain): void {
  ipcMain.handle(
    'keystoreDb:find',
    (_event: IpcMainInvokeEvent, { query }: { query?: Record<string, unknown> }) => {
      assertSafeQuery(query || {})
      return withDatabase((db: NedbDatastore) => db.find(query || {}))
    }
  )

  ipcMain.handle(
    'keystoreDb:insert',
    (_event: IpcMainInvokeEvent, { doc }: { doc: Record<string, unknown> }) => {
      assertSafeDocument(doc)
      return withDatabase((db: NedbDatastore) => db.insert(doc))
    }
  )

  ipcMain.handle(
    'keystoreDb:update',
    (
      _event: IpcMainInvokeEvent,
      {
        query,
        update,
        options,
      }: {
        query: Record<string, unknown>
        update: Record<string, unknown>
        options?: Record<string, unknown>
      }
    ) => {
      assertSafeUpdate(query, update, options || {})
      return withDatabase((db: NedbDatastore) => db.update(query, update, options || {}))
    }
  )

  ipcMain.handle(
    'keystoreDb:remove',
    (
      _event: IpcMainInvokeEvent,
      { query, options }: { query: Record<string, unknown>; options?: Record<string, unknown> }
    ) => {
      assertSafeRemove(query, options || {})
      return withDatabase((db: NedbDatastore) => db.remove(query, options || {}))
    }
  )
}
