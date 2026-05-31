'use strict'

import type { IpcMain, IpcMainInvokeEvent } from 'electron'
import { app } from 'electron'
import type { FetchJsonOptions } from '../../shared-types/ipc'
import { isAllowedApiUrl } from '../config'
import { ALLOWED_HEADER_NAMES, ALLOWED_METHODS, REQUEST_TIMEOUT_MS } from '../constants'
import { NETWORK_IPC_TIMEOUT_MS, registerIpcHandlerWithTimeout } from './ipcTimeout'

function getDefaultUserAgent() {
  return `OWallet/${app.getVersion()} (Electron ${process.versions.electron}; ${process.platform})`
}

function normalizeHeaders(url: URL, inputHeaders: Record<string, string> = {}): Headers {
  const headers = new Headers()
  headers.set(
    'Accept',
    url.hostname === 'api.github.com' ? 'application/vnd.github+json' : 'application/json'
  )
  headers.set('User-Agent', getDefaultUserAgent())

  Object.entries(inputHeaders).forEach(([key, value]) => {
    if (typeof value === 'string' && ALLOWED_HEADER_NAMES.has(key.toLowerCase())) {
      headers.set(key, value)
    }
  })

  return headers
}

function normalizeBody(body: unknown, headers: Headers): string | undefined {
  if (body === undefined || body === null) {
    return undefined
  }

  if (typeof body === 'string') {
    return body
  }

  if (!headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json')
  }

  return JSON.stringify(body)
}

function parseHttpUrl(url: unknown): URL {
  if (typeof url !== 'string') {
    throw new Error('[OWallet] http:fetchJson requires a string URL')
  }

  let parsedUrl: URL
  try {
    parsedUrl = new URL(url)
  } catch {
    throw new Error('[OWallet] http:fetchJson received a malformed URL')
  }

  if (parsedUrl.protocol !== 'https:' && parsedUrl.protocol !== 'http:') {
    throw new Error('[OWallet] http:fetchJson only supports http/https URLs')
  }

  return parsedUrl
}

async function fetchAllowedJson(requestUrl: URL, options: FetchJsonOptions = {}) {
  if (!isAllowedApiUrl(requestUrl.href)) {
    console.warn('[OWallet] Blocked network request to disallowed upstream JSON endpoint')
    throw new Error('[OWallet] Blocked network request to disallowed URL')
  }

  const method = typeof options.method === 'string' ? options.method.toUpperCase() : 'GET'
  if (!ALLOWED_METHODS.has(method)) {
    throw new Error(`[OWallet] Blocked unsupported HTTP method: ${method}`)
  }

  const headers = normalizeHeaders(requestUrl, options.headers || {})
  const body = normalizeBody(options.body, headers)
  const response = await fetch(requestUrl, {
    method,
    headers,
    body,
    redirect: 'error',
    signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
  })

  const responseText = await response.text()
  if (!response.ok) {
    console.error(`[OWallet] HTTP ${response.status} from upstream JSON endpoint`)
    throw new Error(`HTTP ${response.status}`)
  }

  try {
    return responseText ? JSON.parse(responseText) : {}
  } catch (error) {
    console.error('[OWallet] Invalid JSON from upstream JSON endpoint')
    throw new Error('[OWallet] Invalid JSON response from upstream endpoint', {
      cause: error,
    })
  }
}

export function registerNetworkIpc(ipcMain: IpcMain): void {
  registerIpcHandlerWithTimeout(
    ipcMain,
    'http:fetchJson',
    (
      _event: IpcMainInvokeEvent,
      { url, options }: { url: unknown; options?: FetchJsonOptions }
    ) => {
      return fetchAllowedJson(parseHttpUrl(url), options || {})
    },
    NETWORK_IPC_TIMEOUT_MS
  )
}
