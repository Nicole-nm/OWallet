import type { HardwareWalletSigner } from '../../../shared/lib/types'
import { signWithLedger } from '../../transaction/signingService'
import { addLedgerSignature, signLedgerPayload } from '../../transaction/walletSigningOrchestrator'
import type { WalletAdapter, WalletIdentity } from './WalletAdapter'
import type { WalletCapabilities } from './WalletCapabilities'

const LEDGER_CAPABILITIES: WalletCapabilities = {
  requiresPassword: false,
  requiresHardwareDevice: true,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

export type LedgerWalletInput = HardwareWalletSigner & {
  publicKey: string
  label: string
  [key: string]: unknown
}

export function createLedgerWalletAdapter(stored: LedgerWalletInput): WalletAdapter {
  const identity: WalletIdentity = {
    type: 'ledger',
    address: stored.address,
    publicKey: stored.publicKey,
    label: stored.label,
  }

  return {
    identity,
    capabilities: LEDGER_CAPABILITIES,

    async signTransaction(tx) {
      return signWithLedger(tx, stored)
    },

    async addSignature(tx) {
      return addLedgerSignature({ tx, wallet: stored })
    },

    async signMessage(message) {
      const result = await signLedgerPayload({ payload: message, wallet: stored })
      return typeof result === 'string' ? result : null
    },
  }
}
