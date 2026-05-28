/**
 * Test data factories for E2E tests.
 * Generates deterministic wallet / identity / governance data
 * without touching real blockchain networks.
 */

export const TEST_WALLETS = {
  /** A pre-generated JSON wallet for testing flows that need an existing wallet. */
  alice: {
    type: 'CommonWallet',
    label: 'Alice-Test',
    address: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ',
    publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b',
    key: '7b2261646472657373223a2241557235515566654241447136424d593654703579754d73554e47707344376e4c5a227d',
    salt: '5f2d2c1b0a99887766554433221100aa',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: { n: 4096, r: 8, p: 8, dkLen: 64 },
  },

  /** A second wallet for send-to-self or multi-wallet tests. */
  bob: {
    type: 'CommonWallet',
    label: 'Bob-Test',
    address: 'AQf4Mzu1YJrhz9f3aRkkwSm9n3qhXGSh4p',
    publicKey: '02a8c5b3e6f1d4a7b9c2e5f8a1d4b7c0e3f6a9d2c5b8e1f4a7d0c3b6e9f2a5d8',
    key: '7b2261646472657373223a22415166344d7a7531594a72687a39663361526b6b77536d396e337168584753683470227d',
    salt: '0f1e2d3c4b5a69788796a5b4c3d2e1f0',
    algorithm: 'ECDSA',
    parameters: { curve: 'P-256' },
    scrypt: { n: 4096, r: 8, p: 8, dkLen: 64 },
  },
}

export const TEST_SHARED_WALLET = {
  sharedWalletName: 'Imported Smoke Wallet',
  sharedWalletAddress: 'Af6Q7Z6mK7k5n6p7Q8r9S1t2U3v4W5x6Y7',
  totalNumber: 2,
  requiredNumber: 2,
  coPayers: [
    {
      name: 'Alice',
      publickey: TEST_WALLETS.alice.publicKey,
      address: TEST_WALLETS.alice.address,
    },
    {
      name: 'Bob',
      publickey: TEST_WALLETS.bob.publicKey,
      address: TEST_WALLETS.bob.address,
    },
  ],
}

export const TEST_SHARED_PENDING_TRANSFER = {
  transactionidhash: 'shared-pending-tx-hash',
  transactionbodyhash: 'serialized-pending-tx',
  sendaddress: TEST_SHARED_WALLET.sharedWalletAddress,
  receiveaddress: TEST_WALLETS.bob.address,
  assetName: 'ONT',
  amount: '1',
  gasprice: '500',
  gaslimit: '20000',
  coPayerSignDtos: [
    {
      name: 'Alice',
      address: TEST_WALLETS.alice.address,
      publickey: TEST_WALLETS.alice.publicKey,
      isSign: true,
    },
    {
      name: 'Bob',
      address: TEST_WALLETS.bob.address,
      publickey: TEST_WALLETS.bob.publicKey,
      isSign: false,
    },
  ],
}

export const TEST_AUTHORIZATION_NODE = {
  peerPubkey: TEST_WALLETS.alice.publicKey,
  publicKey: TEST_WALLETS.alice.publicKey,
  nodePublicKey: TEST_WALLETS.alice.publicKey,
  public_key: TEST_WALLETS.alice.publicKey,
  name: 'TestNode',
  address: 'APZyfVsJc9m6BsETkQ2x8L2yR6dfH9V7hG',
  status: 1,
  node_rank: 1,
  node_proportion: '50%',
  user_proportion: '50%',
  current_stake: 1200,
  progress: '60.00%',
  init_pos: 1000,
  total_pos: 2000,
  max_authorize: 5000,
  maxAuthorize: 5000,
  maxAuthorizeStr: '5000',
  totalPosStr: '2000',
  detail_url: 'https://example.com/node',
}

export const TEST_VOTE_TOPIC = {
  hash: 'a1'.repeat(32),
  title: 'Baseline Vote Topic',
  content: 'Baseline vote topic detail copy.',
  approves: 12,
  rejects: 3,
  startTime: Date.now() - 60_000,
  endTime: Date.now() + 60_000,
  admin: TEST_WALLETS.alice.address,
  statusText: 'IN_PROGRESS',
}

export const TEST_IDENTITY = {
  label: 'TestOntId',
  ontid: 'did:ont:AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ',
  controls: [
    {
      address: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ',
      key: 'identity-key',
      salt: 'identity-salt',
    },
  ],
  scrypt: { n: 4096, r: 8, p: 8, dkLen: 64 },
}

export const TEST_NODE = {
  name: 'TestNode',
  publicKey: '03d0fdb54acba3f6e53d4f8f2e3b2f1e7e6b3d92c81a0e6a6f6a76de3b2f1e7e6b',
  stakeAddress: 'AUr5QUfeBADq6BMY6Tp5yuMsUNGpsD7nLZ',
  initPos: 10000,
  totalPos: 50000,
  status: 1,
}

export const TEST_BALANCE = {
  ont: '100',
  ong: '5.523',
  claimableOng: '0.132',
}

/** A valid WIF private key captured from a locally generated wallet for import tests only. */
export const TEST_WIF = 'L5PSvRJ2kaqrqApKqZTDJDkNN8XcWcwDWA77YpLzaHiS15AFqdRZ'

/** Password used across test wallets. */
export const TEST_PASSWORD = 'TestPassword123!'

/** Deterministic mock for fetchJson responses. */
export function mockBalanceResponse(address: string) {
  return {
    result: [
      { asset_name: 'ont', balance: TEST_BALANCE.ont, address },
      { asset_name: 'ong', balance: TEST_BALANCE.ong, address },
      { asset_name: 'waitboundong', balance: TEST_BALANCE.claimableOng, address },
      { asset_name: 'unboundong', balance: TEST_BALANCE.claimableOng, address },
    ],
  }
}

export function mockTransactionsResponse() {
  return {
    result: [],
  }
}

export function mockOep4BalanceResponse() {
  return {
    result: [],
  }
}

export function mockNodeListResponse() {
  return [
    {
      name: 'TestNode',
      publicKey: TEST_NODE.publicKey,
      address: TEST_NODE.stakeAddress,
      initPos: TEST_NODE.initPos,
      totalPos: TEST_NODE.totalPos,
      status: 1,
    },
  ]
}
