import { defineStore, storeToRefs } from 'pinia'
import { useCurrentWalletIdentityStore } from './currentWallet/identity'
import { useCurrentWalletBalanceStore } from './currentWallet/balance'
import { useCurrentWalletSessionStore } from './currentWallet/session'

/**
 * Facade store that composes the three single-responsibility slices:
 *   - identity (wallet record)
 *   - balance  (ONT/ONG/OEP4 + redeem + NEP5 ONT)
 *   - session  (transfer, pendingTx, currentSigner, localCopayers)
 *
 * Existing callers continue to use `useCurrentWalletStore()` unchanged.
 * New code should prefer the focused sub-stores when it only touches one
 * concern, to make tests and reactivity scopes smaller.
 *
 * IMPORTANT: state must be re-exported via `storeToRefs()` to preserve
 * reactivity across ref reassignment in the sub-stores (e.g. when
 * `setCurrentWallet` replaces `wallet.value` with a fresh object).
 * Returning `identity.wallet` directly captures a snapshot of the unwrapped
 * value at compose time and goes stale on reassignment.
 */
export const useCurrentWalletStore = defineStore('CurrentWallet', () => {
  const identity = useCurrentWalletIdentityStore()
  const balance = useCurrentWalletBalanceStore()
  const session = useCurrentWalletSessionStore()

  const { wallet } = storeToRefs(identity)
  const { balance: balanceState, redeem, nep5Ont } = storeToRefs(balance)
  const { transfer, pendingTx, currentSigner, localCopayers } = storeToRefs(session)

  return {
    // identity slice
    wallet,
    setCurrentWallet: identity.setCurrentWallet,
    mergeCurrentWallet: identity.mergeCurrentWallet,
    resetCurrentWallet: identity.resetCurrentWallet,

    // balance slice
    balance: balanceState,
    redeem,
    nep5Ont,
    setNativeBalance: balance.setNativeBalance,
    resetNativeBalance: balance.resetNativeBalance,
    setCurrentRedeem: balance.setCurrentRedeem,
    setNep5Ont: balance.setNep5Ont,

    // session slice
    transfer,
    pendingTx,
    currentSigner,
    localCopayers,
    setTransfer: session.setTransfer,
    setLocalCopayers: session.setLocalCopayers,
    setPendingTx: session.setPendingTx,
    setCurrentSigner: session.setCurrentSigner,
    resetCurrentTransfer: session.resetCurrentTransfer,
    setTransferRedeemType: session.setTransferRedeemType,
    resetTransferBalance: session.resetTransferBalance,
  }
})
