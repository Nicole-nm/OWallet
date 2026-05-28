import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const dappRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.dapps,
    name: ROUTE_NAMES.DAPPS,
    component: () => import('@/pages/dapp/DappsPage.vue'),
  },
]
