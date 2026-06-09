import { NETWORKS } from '../../shared/lib/constants'

/** Byte length of an Ontology address in its binary storage form. */
export const ADDRESS_BYTES = 20
/** Byte length of a vote topic hash (H256) in binary form. */
export const HASH_BYTES = 32

/** Governance (node-staking) native contract address. */
export const GOVERNANCE_CONTRACT = '0700000000000000000000000000000000000000'
/** Unix timestamp (seconds) of the genesis block, used for unbound-ONG time math. */
export const GENESIS_BLOCK_TIMESTAMP = 1530316800

/**
 * Vote contract hashes per network. The "old" map tracks a legacy testnet
 * deployment that still serves existing topics; mainnet is unchanged.
 */
export const VOTE_CONTRACT_HASH: Record<string, string> = {
  [NETWORKS.MAIN_NET]: 'c0df752ca786a99755b2e8950060ade9fa3d4e1b',
  [NETWORKS.TEST_NET]: '32a7403e17eb9a2bbeeb7bc3eaa6dee7b0ae3829',
}
export const VOTE_CONTRACT_HASH_OLD: Record<string, string> = {
  [NETWORKS.MAIN_NET]: 'c0df752ca786a99755b2e8950060ade9fa3d4e1b',
  [NETWORKS.TEST_NET]: 'a088ae3b508794e666ab649d890213e66e0c3a2e',
}
