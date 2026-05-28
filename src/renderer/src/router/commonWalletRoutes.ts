import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const commonWalletRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.commonSend,
    name: ROUTE_NAMES.COMMON_SEND_HOME,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonSendPage.vue'),
  },
  {
    path: ROUTE_PATHS.commonReceivePattern,
    name: ROUTE_NAMES.COMMON_RECEIVE,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonReceivePage.vue'),
  },
  {
    path: ROUTE_PATHS.commonRedeemPattern,
    name: ROUTE_NAMES.COMMON_REDEEM,
    meta: { requiresCurrentWallet: true },
    component: () => import('@/pages/wallet/CommonRedeemPage.vue'),
  },
]
