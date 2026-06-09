import type { Ref } from 'vue'
import { notifyError } from '../../shared/ui/feedback'
import { notifyFailure } from '../../shared/ui/notifyFailure'

const SELECT_INDIVIDUAL_WALLET_KEY = 'nodeStake.selectIndividualWallet'

/**
 * Resolve the active stake wallet, surfacing the standard "select an individual
 * wallet" toast and returning null when none is available. Collapses the
 * resolve + null-check + notify guard repeated across the stake handlers.
 */
export function resolveWalletOrNotify<T>(
  resolve: () => T | null,
  errorKey: string = SELECT_INDIVIDUAL_WALLET_KEY
): T | null {
  const wallet = resolve()
  if (!wallet) {
    notifyError(errorKey)
    return null
  }
  return wallet
}

type SignableTxResult =
  | { ok: true; tx: unknown }
  | { ok: false; errorKey?: string; error?: unknown; detail?: unknown }

/**
 * Handle the tail shared by every "build draft then open the password modal"
 * stake handler: toast on failure, otherwise stash the tx and reveal the
 * password modal. Returns true when the draft was staged for signing.
 */
export function stageSignableTx(
  result: SignableTxResult,
  refs: { tx: Ref<unknown>; walletPassModal: Ref<boolean> }
): boolean {
  if (notifyFailure(result)) {
    return false
  }
  refs.tx.value = result.tx
  refs.walletPassModal.value = true
  return true
}

interface LoadingModalLike {
  showLoadingModals: () => void
  hideLoadingModals: () => void
}

/** Run `fn` between the global loading modal's show/hide, hiding even on throw. */
export async function withLoading<T>(
  loadingStore: LoadingModalLike,
  fn: () => Promise<T>
): Promise<T> {
  loadingStore.showLoadingModals()
  try {
    return await fn()
  } finally {
    loadingStore.hideLoadingModals()
  }
}
