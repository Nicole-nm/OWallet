export const LOCAL_STORAGE_KEYS = {
  language: 'owallet:settings:language',
  network: 'owallet:settings:network',
  nodeAddress: 'owallet:settings:node-address',
  themeMode: 'owallet:settings:theme-mode',
  oep4s: 'owallet:cache:oep4s',
  oep4Tokens: 'owallet:cache:oep4-tokens',
}

export const SESSION_STORAGE_KEYS = {
  currentWallet: 'owallet:session:current-wallet',
  sharedWallet: 'owallet:session:shared-wallet',
  walletsTab: 'owallet:session:wallets-tab',
}

export const LEGACY_LOCAL_STORAGE_KEYS = {
  language: ['user_lang'],
  network: ['net'],
  nodeAddress: ['nodeAddress'],
  themeMode: ['themeMode'],
  oep4s: ['oep4s'],
  oep4Tokens: ['oep4Tokens'],
  savePath: ['savePath'],
  savePathConfigured: ['isSavePath'],
}

export const LEGACY_SESSION_STORAGE_KEYS = {
  currentWallet: ['currentWallet'],
  sharedWallet: ['sharedWallet'],
  walletsTab: ['Wallets_Tab'],
}
