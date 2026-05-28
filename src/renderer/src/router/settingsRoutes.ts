import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const settingsRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.setting,
    name: ROUTE_NAMES.SETTING,
    component: () => import('@/pages/settings/SettingPage.vue'),
  },
]
