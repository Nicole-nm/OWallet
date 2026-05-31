'use strict'

/**
 * Centralized main-process constants.
 *
 * Magic numbers and allowlists that were previously scattered across individual
 * services live here so security-relevant limits (timeouts, vendor IDs, method
 * and header allowlists) can be reviewed and adjusted in a single place.
 */

/** USB vendor ID for Ledger hardware wallets (used for HID device gating). */
export const LEDGER_VENDOR_ID = 0x2c97

/** How long to wait for a Ledger device to appear before resolving selection. */
export const HID_SELECTION_TIMEOUT_MS = 3000

/** Hard timeout applied to every outbound `http:fetchJson` request. */
export const REQUEST_TIMEOUT_MS = 15000

/** Hosts the development renderer may navigate to while served by Vite. */
export const ALLOWED_DEVELOPMENT_NAVIGATION_HOSTNAMES: ReadonlySet<string> = new Set([
  'localhost',
  '127.0.0.1',
])

/** Hosts the main-process network bridge may request on behalf of the renderer. */
export const ALLOWED_API_HOSTNAMES: ReadonlySet<string> = new Set([
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

/** Ontology node hosts must use HTTPS on the REST port. */
export const SECURE_NODE_HOSTNAMES: ReadonlySet<string> = new Set([
  'polaris1.ont.io',
  'polaris2.ont.io',
  'polaris3.ont.io',
  'polaris4.ont.io',
  'dappnode1.ont.io',
  'dappnode2.ont.io',
  'dappnode3.ont.io',
  'dappnode4.ont.io',
])

/** Required HTTPS REST port for Ontology node hosts. */
export const SECURE_NODE_PORT = '10334'

/** External browser targets allowed through shell.openExternal. */
export const ALLOWED_EXTERNAL_HOSTNAMES: ReadonlySet<string> = new Set([
  'github.com',
  'medium.com',
  'node.ont.io',
  'support.ledgerwallet.com',
  'widget.changelly.com',
  'wallet.cryptonex.org',
  'explorer.ont.io',
  'polarisexplorer.ont.io',
])

/** HTTP methods the renderer is allowed to issue through the network bridge. */
export const ALLOWED_METHODS: ReadonlySet<string> = new Set(['GET', 'POST'])

/** Request header names the renderer is allowed to forward. */
export const ALLOWED_HEADER_NAMES: ReadonlySet<string> = new Set(['accept', 'content-type'])
