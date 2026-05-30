import { computed } from 'vue'
import { useCurrentWalletStore } from '../../../stores/modules/CurrentWallet'
import { useWalletsStore } from '../../../stores/modules/Wallets'
import {
  WalletAdapterFactory,
  type WalletAdapterInput,
  type WalletAdapter,
  type SharedCosignerInput,
} from '../application/adapter/WalletAdapterFactory'
import type { CommonWallet, HardwareWallet, SharedWallet } from '../../../shared/lib/types'
import type { CurrentWalletRecord, SharedWalletSigner } from '../../../shared/types'

const COMMON_WALLET_TYPE_TAG = 'CommonWallet'

function resolveCosigner(
  signer: SharedWalletSigner,
  normalWallets: CommonWallet[],
  hardwareWallets: HardwareWallet[]
): SharedCosignerInput | null {
  if (!signer.address) return null

  if (signer.type === COMMON_WALLET_TYPE_TAG || signer.key) {
    const wallet = normalWallets.find((w) => w.address === signer.address)
    if (!wallet) return null
    return { type: 'common', wallet }
  }

  const wallet = hardwareWallets.find((w) => w.address === signer.address)
  if (!wallet || !wallet.publicKey) return null
  return {
    type: 'ledger',
    wallet: { ...wallet, publicKey: wallet.publicKey },
  }
}

function buildSharedInput(shared: SharedWallet, cosigner: SharedCosignerInput): WalletAdapterInput {
  const threshold = Number.parseInt(String(shared.requiredNumber), 10)
  return {
    kind: 'shared',
    identity: {
      type: 'shared',
      address: shared.sharedWalletAddress ?? shared.address,
      publicKey: '',
      label: shared.label,
    },
    threshold: Number.isFinite(threshold) ? threshold : 0,
    publicKeys: shared.coPayers.map((cp) => cp.publickey),
    activeCosigner: cosigner,
  }
}

function buildInput(
  current: CurrentWalletRecord,
  signer: SharedWalletSigner,
  normalWallets: CommonWallet[],
  hardwareWallets: HardwareWallet[],
  sharedWallets: SharedWallet[]
): WalletAdapterInput | null {
  if (!current.address) return null

  const commonWallet = normalWallets.find((w) => w.address === current.address)
  if (commonWallet) {
    return { kind: 'common', wallet: commonWallet }
  }

  const hardwareWallet = hardwareWallets.find((w) => w.address === current.address)
  if (hardwareWallet && hardwareWallet.publicKey) {
    return {
      kind: 'ledger',
      wallet: { ...hardwareWallet, publicKey: hardwareWallet.publicKey },
    }
  }

  const sharedAddress = current.sharedWalletAddress ?? current.address
  const sharedWallet = sharedWallets.find(
    (w) => w.sharedWalletAddress === sharedAddress || w.address === sharedAddress
  )
  if (sharedWallet) {
    const cosigner = resolveCosigner(signer, normalWallets, hardwareWallets)
    if (!cosigner) return null
    return buildSharedInput(sharedWallet, cosigner)
  }

  return null
}

export function useWalletAdapter() {
  const currentWalletStore = useCurrentWalletStore()
  const walletsStore = useWalletsStore()

  const adapter = computed<WalletAdapter | null>(() => {
    const input = buildInput(
      currentWalletStore.wallet,
      currentWalletStore.currentSigner,
      walletsStore.normalWallets,
      walletsStore.hardwareWallets,
      walletsStore.sharedWallets
    )
    return input ? WalletAdapterFactory.create(input) : null
  })

  return { adapter }
}
