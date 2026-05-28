export const GAS_PRICE = '500'
export const LEDGER_GAS_PRICE = '2500'
export const GAS_LIMIT = '20000'
export const GAS_LIMIT_HIGH = '200000'

const ONG_BASE_UNITS = 1e9
const TRANSFER_GAS_DECIMALS = 3
const TRANSFER_GAS_LIMIT = parseInt(GAS_LIMIT, 10)

function toTransferFeeAmount(gasPrice: number) {
  return Number(((gasPrice * TRANSFER_GAS_LIMIT) / ONG_BASE_UNITS).toFixed(TRANSFER_GAS_DECIMALS))
}

export const NETWORKS = {
  TEST_NET: 'TEST_NET',
  MAIN_NET: 'MAIN_NET',
}

export const DEFAULT_NETWORK = NETWORKS.MAIN_NET

export const REST_PORT = '10334'
export const WS_PORT = '20335'

export const ONT_CONTRACT = '0000000000000000000000000000000000000001'

export const TEST_NET_LIST = [
  'https://polaris1.ont.io',
  'https://polaris2.ont.io',
  'https://polaris3.ont.io',
  'https://polaris4.ont.io',
]

export const MAIN_NET_LIST = [
  'https://dappnode1.ont.io',
  'https://dappnode2.ont.io',
  'https://dappnode3.ont.io',
  'https://dappnode4.ont.io',
]

export const NETWORK_NODE_LISTS = {
  [NETWORKS.TEST_NET]: TEST_NET_LIST,
  [NETWORKS.MAIN_NET]: MAIN_NET_LIST,
}

export const getNodeListForNetwork = (network = DEFAULT_NETWORK) => {
  return NETWORK_NODE_LISTS[network] || NETWORK_NODE_LISTS[DEFAULT_NETWORK]
}

export const getDefaultNodeForNetwork = (network = DEFAULT_NETWORK) => {
  const nodeList = getNodeListForNetwork(network) ?? MAIN_NET_LIST
  return nodeList[0] ?? MAIN_NET_LIST[0] ?? ''
}

export const isTestNetNetwork = (network: unknown) => network === NETWORKS.TEST_NET

export const EXPLORER_URL = {
  [NETWORKS.TEST_NET]: 'https://polarisexplorer.ont.io',
  [NETWORKS.MAIN_NET]: 'https://explorer.ont.io',
}

export const EXPLORER_PAGE_URL = {
  [NETWORKS.TEST_NET]: 'https://explorer.ont.io',
  [NETWORKS.MAIN_NET]: 'https://explorer.ont.io',
}

export const getExplorerApiBaseUrl = (network = DEFAULT_NETWORK) => {
  return EXPLORER_URL[network] || EXPLORER_URL[DEFAULT_NETWORK]
}

export const getExplorerPageBaseUrl = (network = DEFAULT_NETWORK) => {
  return EXPLORER_PAGE_URL[network] || EXPLORER_PAGE_URL[DEFAULT_NETWORK]
}

export const getExplorerApiUrl = (path: unknown, network = DEFAULT_NETWORK) => {
  return `${getExplorerApiBaseUrl(network)}${path}`
}

export const ONT_PASS_HOSTS = {
  [NETWORKS.TEST_NET]: 'https://service-test.onto.app',
  [NETWORKS.MAIN_NET]: 'https://service.onto.app',
}

export const getOntPassHost = (network = DEFAULT_NETWORK) => {
  return ONT_PASS_HOSTS[network] || ONT_PASS_HOSTS[DEFAULT_NETWORK]
}

export const ONT_PASS_API_PATHS = {
  CreateSharedWallet: '/S5/api/v1/ontpass/SharedWallet/create',
  QuerySharedWallet: '/S5/api/v1/ontpass/SharedWallet/getBySharedWalletAddress',
  CreateSharedTransfer: '/S5/api/v1/ontpass/SharedTransfer/create',
  SignSharedTransfer: '/S5/api/v1/ontpass/SharedTransfer/sign',
  SendSharedTransfer: '/S5/api/v1/ontpass/SharedTransfer/isSendToChain',
  QueryPendingTransfer: '/S5/api/v1/ontpass/SharedTransfer/listSigningBeforeTime',
  ExchangeCurrency: '/S5/api/v1/ontpass/api/v1/onto/exchangerate/reckon/',
  GetQualifiedState: '/S4/NodePledgeApi/v1/Nodepledge/getQuailifiedState',
  DelegateSendTx: '/S4/NodePledgeApi/v1/Nodepledge/delegateSendTransaction',
  SetStakeInfo: '/S4/NodePledgeApi/v1/Nodepledge/setInfo',
  GetStakeInfo: '/S4/NodePledgeApi/v1/Nodepledge/info',
  GetVoteContract: '/S4/NodePledgeApi/v1/Nodepledge/vote-contract-address',
}

export const ONT_PASS_URL = ONT_PASS_API_PATHS

export const DEFAULT_SCRYPT = {
  cost: 16384,
  blockSize: 8,
  parallel: 8,
  size: 64,
}

export const SWAP_ADDRESS = 'AFmseVrdL9f9oyCzZefL9tG6UbvhPbdYzM'
export const GOVERNANCE_ONG_ADDRESS = 'AFmseVrdL9f9oyCzZefL9tG6UbviEH9ugK'
export const POLLING_INTERVAL_MS = 15000

export const TRANSFER_GAS_PRICE_MIN = parseInt(GAS_PRICE, 10)
export const TRANSFER_GAS_PRICE_MAX = 1000
export const TRANSFER_GAS_PRICE_STEP = 50

// User-selectable transfer fee in ONG. Adjusting it changes gasPrice while gasLimit stays fixed.
export const TRANSFER_GAS_MIN = toTransferFeeAmount(TRANSFER_GAS_PRICE_MIN)
export const TRANSFER_GAS_MAX = toTransferFeeAmount(TRANSFER_GAS_PRICE_MAX)
export const TRANSFER_GAS_STEP = toTransferFeeAmount(TRANSFER_GAS_PRICE_STEP)

export const VOTE_ROLE = {
  ADMIN: 'ADMIN',
  VOTER: 'VOTER',
  VISITOR: 'VISITOR',
}

export const GOVERNANCE_STATUS = {
  REGISTER: 0,
  CANDIDATE: 1,
  CONSENSUS: 2,
  QUIT_CANDIDATE: 3,
  QUIT_CONSENSUS: 4,
  BLACKLIST: 5,
  EXITED: 6,
}
