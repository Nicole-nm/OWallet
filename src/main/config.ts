'use strict'

import { app } from 'electron'
import { pathToFileURL } from 'node:url'
import { join } from 'path'

export const isDevelopment = !app.isPackaged
export const electronMajorVersion = Number.parseInt(
  (process.versions.electron || '0').split('.')[0] ?? '0',
  10
)

const ALLOWED_DEVELOPMENT_NAVIGATION_HOSTNAMES = new Set(['localhost', '127.0.0.1'])
const ALLOWED_API_HOSTNAMES = new Set([
  'api.github.com',
  'service.onto.app',
  'service-test.onto.app',
  'coincap.io',
  'min-api.cryptocompare.com',
  'explorer.ont.io',
  'polarisexplorer.ont.io',
  'polaris1.ont.io',
  'polaris2.ont.io',
  'polaris3.ont.io',
  'polaris4.ont.io',
  'dappnode1.ont.io',
  'dappnode2.ont.io',
  'dappnode3.ont.io',
  'dappnode4.ont.io',
])
const SECURE_NODE_HOSTNAMES = new Set([
  'polaris1.ont.io',
  'polaris2.ont.io',
  'polaris3.ont.io',
  'polaris4.ont.io',
  'dappnode1.ont.io',
  'dappnode2.ont.io',
  'dappnode3.ont.io',
  'dappnode4.ont.io',
])
const SECURE_NODE_PORT = '10334'
const ALLOWED_EXTERNAL_HOSTNAMES = new Set([
  'github.com',
  'medium.com',
  'node.ont.io',
  'support.ledgerwallet.com',
  'widget.changelly.com',
  'wallet.cryptonex.org',
  'explorer.ont.io',
  'polarisexplorer.ont.io',
])

function isRendererEntryFile(url: URL): boolean {
  if (url.protocol !== 'file:') {
    return false
  }

  const rendererEntryUrl = pathToFileURL(join(__dirname, '../renderer/index.html'))
  return url.href === rendererEntryUrl.href
}

export function isAllowedURL(url: string): boolean {
  try {
    const parsedUrl = new URL(url)

    if (isRendererEntryFile(parsedUrl)) {
      return true
    }

    if (
      isDevelopment &&
      parsedUrl.protocol === 'http:' &&
      ALLOWED_DEVELOPMENT_NAVIGATION_HOSTNAMES.has(parsedUrl.hostname)
    ) {
      return true
    }

    return false
  } catch {
    return false
  }
}

export function isAllowedApiUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    if (!ALLOWED_API_HOSTNAMES.has(parsedUrl.hostname)) {
      return false
    }

    if (SECURE_NODE_HOSTNAMES.has(parsedUrl.hostname)) {
      return parsedUrl.protocol === 'https:' && parsedUrl.port === SECURE_NODE_PORT
    }

    return parsedUrl.protocol === 'https:'
  } catch {
    return false
  }
}

export function isAllowedExternalUrl(url: string): boolean {
  try {
    const parsedUrl = new URL(url)
    return parsedUrl.protocol === 'https:' && ALLOWED_EXTERNAL_HOSTNAMES.has(parsedUrl.hostname)
  } catch {
    return false
  }
}

export function shouldInstallVueDevtools() {
  if (!isDevelopment || process.env.IS_TEST) {
    return false
  }

  if (process.env.OWALLET_INSTALL_VUE_DEVTOOLS === '1') {
    return true
  }

  return electronMajorVersion < 34
}

export function shouldOpenDevtools() {
  return isDevelopment && !process.env.IS_TEST && process.env.OWALLET_OPEN_DEVTOOLS === '1'
}

export function configureAppEnvironment() {
  app.commandLine.appendSwitch('disable-features', 'AutofillServerCommunication')

  if (isDevelopment && process.env.OWALLET_INSTALL_VUE_DEVTOOLS !== '1') {
    app.commandLine.appendSwitch('disable-extensions')
  }

  if (isDevelopment) {
    app.setPath('sessionData', join(app.getPath('userData'), 'session-data-dev'))
  }
}
