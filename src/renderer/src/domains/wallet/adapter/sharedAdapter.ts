import type { CommonWallet, HardwareWalletSigner } from '../../../shared/lib/types'
import { signSharedTx, signSharedTxWithLedger } from '../../transaction/signingService'
import type { SigningContext, WalletAdapter, WalletIdentity } from './WalletAdapter'
import type { WalletCapabilities } from './WalletCapabilities'

export type SharedCosignerInput =
  | { type: 'common'; wallet: CommonWallet }
  | {
      type: 'ledger'
      wallet: HardwareWalletSigner & { publicKey: string; [key: string]: unknown }
    }

export interface SharedAdapterConfig {
  identity: WalletIdentity
  threshold: number
  publicKeys: string[]
  activeCosigner: SharedCosignerInput
}

function capabilitiesFor(cosigner: SharedCosignerInput): WalletCapabilities {
  return {
    requiresPassword: cosigner.type === 'common',
    requiresHardwareDevice: cosigner.type === 'ledger',
    singleSignature: false,
    multiSignature: true,
    canSignMessage: false,
  }
}

export function createSharedWalletAdapter(config: SharedAdapterConfig): WalletAdapter {
  const { identity, threshold, publicKeys, activeCosigner } = config

  async function sign(
    tx: Parameters<WalletAdapter['signTransaction']>[0],
    ctx: SigningContext,
    isFirstSignature: boolean
  ) {
    if (activeCosigner.type === 'common') {
      const result = await signSharedTx(
        tx,
        threshold,
        publicKeys,
        activeCosigner.wallet,
        ctx.password
      )
      return result ?? null
    }
    const result = await signSharedTxWithLedger(
      tx,
      threshold,
      publicKeys,
      activeCosigner.wallet,
      isFirstSignature
    )
    return result ?? null
  }

  return {
    identity,
    capabilities: capabilitiesFor(activeCosigner),

    async signTransaction(tx, ctx) {
      return sign(tx, ctx, ctx.isFirstSignature ?? true)
    },

    async addSignature(tx, ctx) {
      return sign(tx, ctx, false)
    },

    async signMessage() {
      return null
    },
  }
}
