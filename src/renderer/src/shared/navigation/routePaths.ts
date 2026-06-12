export const SHARED_WALLET_CHILD_PATHS = Object.freeze({
  home: 'home',
  sendTransfer: 'send-transfer',
  pendingTxHome: 'pending-tx',
  txMgmt: 'tx-management',
})

export const VOTE_CHILD_PATHS = Object.freeze({
  login: 'login',
  list: 'votes',
  create: 'create',
  detail: 'detail',
})

export const ROUTE_PATHS = Object.freeze({
  home: '/',
  walletDashboard: '/wallets/dashboard',
  identities: '/identities',
  wallets: '/wallets',
  loginLedger: '/wallets/login-ledger',
  setting: '/setting',
  dapps: '/dapps',
  createIdentity: '/identities/create',
  importIdentity: '/identities/import',
  createJsonWallet: '/wallets/create-json',
  importJsonWallet: '/wallets/import-json',
  importLedgerWallet: '/wallets/import-ledger',
  createSharedWallet: '/wallets/create-shared',
  importSharedWallet: '/wallets/import-shared',
  sharedWallet: '/shared-wallet',
  sharedWalletHome: '/shared-wallet/home',
  sharedWalletSendTransfer: '/shared-wallet/send-transfer',
  sharedWalletPendingTxHome: '/shared-wallet/pending-tx',
  sharedWalletTxMgmt: '/shared-wallet/tx-management',
  vote: '/governance/vote',
  node: '/governance',
  nodeApply: '/governance/node/apply',
  nodeApplySuccess: '/governance/node/apply-success',
  myNode: '/governance/node/my-nodes',
  send: '/wallet/send',
  receivePattern: '/wallet/receive/:walletType',
  receive(walletType: unknown) {
    return `/wallet/receive/${walletType}`
  },
  redeemPattern: '/wallet/redeem/:walletType',
  redeem(walletType: unknown) {
    return `/wallet/redeem/${walletType}`
  },
  nodeStakeIntro: '/governance/node/stake-intro',
  nodeStakeRegister: '/governance/node/stake-register',
  nodeStakeInfo: '/governance/node/stake-info',
  nodeStakeMgmt: '/governance/node/stake-management',
  nodeList: '/governance/node/list',
  stakeHistory: '/governance/node/stake-history',
  authorizeLogin: '/governance/authorization/login',
  authorizationMgmt: '/governance/authorization/management',
  newAuthorization: '/governance/authorization/new',
  cancelAuthorization: '/governance/authorization/cancel',
  oep4Home: '/wallet/oep4',
  notFound: '/:pathMatch(.*)*',
})
