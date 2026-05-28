import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const identityRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.identities,
    name: ROUTE_NAMES.IDENTITIES,
    component: () => import('@/pages/identity/IdentitiesPage.vue'),
  },
  {
    path: ROUTE_PATHS.createIdentity,
    name: ROUTE_NAMES.CREATE_IDENTITY,
    component: () => import('@/pages/identity/CreateIdentityPage.vue'),
  },
  {
    path: ROUTE_PATHS.importIdentity,
    name: ROUTE_NAMES.IMPORT_IDENTITY,
    component: () => import('@/pages/identity/ImportIdentityPage.vue'),
  },
]
