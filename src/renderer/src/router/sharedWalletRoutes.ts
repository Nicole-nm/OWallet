import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS, SHARED_WALLET_CHILD_PATHS } from './routePaths'

export const sharedWalletRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.sharedWallet,
    name: ROUTE_NAMES.SHARED_WALLET_DETAIL,
    component: () => import('@/pages/wallet/SharedWalletDetailPage.vue'),
    children: [
      {
        path: SHARED_WALLET_CHILD_PATHS.home,
        name: ROUTE_NAMES.SHARED_WALLET_HOME,
        component: () => import('@/pages/wallet/SharedWalletHomePage.vue'),
      },
      {
        path: SHARED_WALLET_CHILD_PATHS.sendTransfer,
        name: ROUTE_NAMES.SHARED_WALLET_SEND_TRANSFER,
        component: () => import('@/pages/wallet/SharedWalletSendPage.vue'),
      },
      {
        path: SHARED_WALLET_CHILD_PATHS.pendingTxHome,
        name: ROUTE_NAMES.SHARED_WALLET_PENDING_TX_HOME,
        component: () => import('@/pages/wallet/PendingTxHomePage.vue'),
      },
      {
        path: SHARED_WALLET_CHILD_PATHS.copayers,
        name: ROUTE_NAMES.SHARED_WALLET_COPAYER,
        component: () => import('@/pages/wallet/SharedWalletCopayerPage.vue'),
      },
      {
        path: SHARED_WALLET_CHILD_PATHS.txMgmt,
        name: ROUTE_NAMES.SHARED_TX_MGMT,
        component: () => import('@/pages/wallet/SharedTxManagementPage.vue'),
      },
    ],
  },
]
