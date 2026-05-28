import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const walletRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.walletDashboard,
    name: ROUTE_NAMES.WALLET_DASHBOARD,
    component: () => import('@/pages/wallet/WalletDashboardPage.vue'),
  },
  {
    path: ROUTE_PATHS.wallets,
    name: ROUTE_NAMES.WALLETS,
    component: () => import('@/pages/wallet/WalletsPage.vue'),
  },
  {
    path: ROUTE_PATHS.loginLedger,
    name: ROUTE_NAMES.LOGIN_LEDGER,
    component: () => import('@/pages/wallet/LoginLedgerPage.vue'),
  },
  {
    path: ROUTE_PATHS.createJsonWallet,
    name: ROUTE_NAMES.CREATE_JSON_WALLET,
    component: () => import('@/pages/wallet/CreateJsonWalletPage.vue'),
  },
  {
    path: ROUTE_PATHS.importJsonWallet,
    name: ROUTE_NAMES.IMPORT_JSON_WALLET,
    component: () => import('@/pages/wallet/ImportJsonWalletPage.vue'),
  },
  {
    path: ROUTE_PATHS.importLedgerWallet,
    name: ROUTE_NAMES.IMPORT_LEDGER_WALLET,
    component: () => import('@/pages/wallet/ImportLedgerWalletPage.vue'),
  },
  {
    path: ROUTE_PATHS.createSharedWallet,
    name: ROUTE_NAMES.CREATE_SHARED_WALLET,
    component: () => import('@/pages/wallet/CreateSharedWalletPage.vue'),
  },
  {
    path: ROUTE_PATHS.importSharedWallet,
    name: ROUTE_NAMES.IMPORT_SHARED_WALLET,
    component: () => import('@/pages/wallet/ImportSharedWalletPage.vue'),
  },
  {
    path: ROUTE_PATHS.oep4Home,
    name: ROUTE_NAMES.OEP4_HOME,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/Oep4HomePage.vue'),
  },
]
