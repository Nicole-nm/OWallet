import { getConnectionSnapshot, getDeviceInfo, getPublicKey } from '../../shared/chain/ledgerSigner'

export function fetchLedgerDeviceInfo() {
  return getDeviceInfo()
}

export function fetchLedgerPublicKey({ acct = 0, neo = false } = {}) {
  return getPublicKey(acct, neo)
}

export function fetchLedgerConnectionSnapshot({ acct = 0, neo = false } = {}) {
  return getConnectionSnapshot(acct, neo)
}
