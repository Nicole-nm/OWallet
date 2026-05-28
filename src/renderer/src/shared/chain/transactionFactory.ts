/**
 * transactionFactory.ts
 *
 * Centralized barrel for chain transaction builders. Consumers should import
 * from here rather than reaching into individual domain files. The underlying
 * factories live in `domains/transaction` and `domains/governance` to keep
 * SDK-loading and chain-side coupling isolated by concern.
 *
 * Adding a new transaction kind: implement the builder in the appropriate
 * domain file (asset / governance / identity), then re-export it here.
 */

// Asset transfers (ONT, ONG, OEP-4) and ONG claim
export {
  buildNativeTransfer,
  buildOep4Transfer,
  buildClaimOng,
} from '../../domains/transaction/assetBuilder'

// Governance: authorization stake (authorize / unauthorize / withdraw / etc.)
export {
  buildAuthorizeForPeer,
  buildUnauthorizeForPeer,
  buildWithdraw,
  buildAddInitPos,
  buildReduceInitPos,
  buildChangeAuthorization,
  buildWithdrawFee,
  buildWithdrawPeerUnboundOng,
} from '../../domains/governance/authorizeTransactionBuilder'

// Governance: candidate node ops (register / unregister / quit / set fee)
export {
  buildUnregisterCandidate,
  buildQuitNode,
  buildRegisterCandidate,
  buildSetFeePercentage,
} from '../../domains/governance/candidateTransactionBuilder'

// Governance: voting (commit-pos, reject, vote-info)
export * from '../../domains/governance/voteTransactionBuilder'
