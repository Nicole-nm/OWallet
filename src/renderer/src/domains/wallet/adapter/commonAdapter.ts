import type { CommonWallet } from '../../../shared/lib/types'
import { signWithWallet, signMessageWithWallet } from '../../transaction/signingService'
import { addWalletSignature } from '../../transaction/walletSigningOrchestrator'
import type { SigningContext, WalletAdapter, WalletIdentity } from './WalletAdapter'
import type { WalletCapabilities } from './WalletCapabilities'

const COMMON_CAPABILITIES: WalletCapabilities = {
  requiresPassword: true,
  requiresHardwareDevice: false,
  singleSignature: true,
  multiSignature: false,
  canSignMessage: true,
}

interface SignedMessageResult {
  serializeHex?: () => string
}

export function createCommonWalletAdapter(stored: CommonWallet): WalletAdapter {
  const identity: WalletIdentity = {
    type: 'common',
    address: stored.address,
    publicKey: stored.publicKey,
    label: stored.label,
  }

  return {
    identity,
    capabilities: COMMON_CAPABILITIES,

    async signTransaction(tx, ctx: SigningContext) {
      const signed = await signWithWallet(tx, stored, ctx.password)
      return signed ?? null
    },

    async addSignature(tx, ctx: SigningContext) {
      return addWalletSignature({ tx, wallet: stored, password: ctx.password ?? '' })
    },

    async signMessage(message, ctx: SigningContext) {
      const result = (await signMessageWithWallet(message, stored, ctx.password)) as
        | SignedMessageResult
        | undefined
      if (!result) return null
      return result.serializeHex ? result.serializeHex() : String(result)
    },
  }
}
