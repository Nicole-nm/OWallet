import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS } from './routePaths'

export const governanceRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.nodeApply,
    name: ROUTE_NAMES.NODE_APPLY,
    component: () => import('@/pages/governance/NodeApplyPage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeApplySuccess,
    name: ROUTE_NAMES.NODE_APPLY_SUCCESS,
    component: () => import('@/pages/governance/NodeApplySuccessPage.vue'),
  },
  {
    path: ROUTE_PATHS.myNode,
    name: ROUTE_NAMES.MY_NODE,
    component: () => import('@/pages/governance/MyNodesPage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeStakeIntro,
    name: ROUTE_NAMES.NODE_STAKE_INTRO,
    component: () => import('@/pages/governance/NodeStakeIntroPage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeStakeRegister,
    name: ROUTE_NAMES.NODE_STAKE_REGISTER,
    meta: { requiresWalletCollection: true },
    component: () => import('@/pages/governance/NodeStakeRegisterPage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeStakeInfo,
    name: ROUTE_NAMES.NODE_STAKE_INFO,
    component: () => import('@/pages/governance/NodeStakeInfoPage.vue'),
  },
  {
    path: ROUTE_PATHS.node,
    name: ROUTE_NAMES.NODE_MANAGEMENT,
    component: () => import('@/pages/governance/GovernanceHomePage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeStakeMgmt,
    name: ROUTE_NAMES.NODE_STAKE_MANAGEMENT,
    meta: { requiresWalletCollection: true },
    component: () => import('@/pages/governance/NodeStakeManagementPage.vue'),
  },
  {
    path: ROUTE_PATHS.nodeList,
    name: ROUTE_NAMES.NODE_LIST,
    component: () => import('@/pages/governance/AuthorizationListPage.vue'),
  },
  {
    path: ROUTE_PATHS.stakeHistory,
    name: ROUTE_NAMES.STAKE_HISTORY,
    component: () => import('@/pages/governance/StakeHistoryPage.vue'),
  },
  {
    path: ROUTE_PATHS.authorizeLogin,
    name: ROUTE_NAMES.AUTHORIZE_LOGIN,
    component: () => import('@/pages/governance/AuthorizationLoginPage.vue'),
  },
  {
    path: ROUTE_PATHS.authorizationMgmt,
    name: ROUTE_NAMES.AUTHORIZATION_MGMT,
    meta: { requiresWalletCollection: true },
    component: () => import('@/pages/governance/AuthorizationManagementPage.vue'),
  },
  {
    path: ROUTE_PATHS.newAuthorization,
    name: ROUTE_NAMES.NEW_AUTHORIZATION,
    meta: { requiresWalletCollection: true },
    component: () => import('@/pages/governance/NewAuthorizationPage.vue'),
  },
]
