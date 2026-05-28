import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const homeRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.home,
    name: ROUTE_NAMES.HOME,
    component: () => import('@/pages/home/HomePage.vue'),
  },
]
