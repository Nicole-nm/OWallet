import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const commonWalletRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.send,
    name: ROUTE_NAMES.SEND,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonSendPage.vue'),
  },
  {
    path: ROUTE_PATHS.receivePattern,
    name: ROUTE_NAMES.RECEIVE,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonReceivePage.vue'),
  },
  {
    path: ROUTE_PATHS.redeemPattern,
    name: ROUTE_NAMES.REDEEM,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonRedeemPage.vue'),
  },
]
