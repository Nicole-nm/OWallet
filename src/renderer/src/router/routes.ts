import type { RouteRecordRaw } from 'vue-router'
import { commonWalletRoutes } from './commonWalletRoutes'
import { dappRoutes } from './dappRoutes'
import { governanceRoutes } from './governanceRoutes'
import { homeRoutes } from './homeRoutes'
import { identityRoutes } from './identityRoutes'
import { notFoundRoutes } from './notFoundRoutes'
import { settingsRoutes } from './settingsRoutes'
import { sharedWalletRoutes } from './sharedWalletRoutes'
import { voteRoutes } from './voteRoutes'
import { walletRoutes } from './walletRoutes'

export { ROUTE_NAMES } from './routeNames'
export { ROUTE_PATHS } from './routePaths'

export const routes: RouteRecordRaw[] = [
  ...homeRoutes,
  ...walletRoutes,
  ...identityRoutes,
  ...settingsRoutes,
  ...dappRoutes,
  ...sharedWalletRoutes,
  ...voteRoutes,
  ...commonWalletRoutes,
  ...governanceRoutes,
  ...notFoundRoutes,
]
