import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_PATHS } from './routePaths'

export const notFoundRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.notFound,
    redirect: ROUTE_PATHS.home,
  },
]
