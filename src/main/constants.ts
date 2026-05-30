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

/** HTTP methods the renderer is allowed to issue through the network bridge. */
export const ALLOWED_METHODS: ReadonlySet<string> = new Set(['GET', 'POST'])

/** Request header names the renderer is allowed to forward. */
export const ALLOWED_HEADER_NAMES: ReadonlySet<string> = new Set(['accept', 'content-type'])
