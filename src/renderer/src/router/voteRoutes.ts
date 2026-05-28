import type { RouteRecordRaw } from 'vue-router'
import { ROUTE_NAMES } from './routeNames'
import { ROUTE_PATHS, VOTE_CHILD_PATHS } from './routePaths'

export const voteRoutes: RouteRecordRaw[] = [
  {
    path: ROUTE_PATHS.vote,
    name: ROUTE_NAMES.NODE_VOTE,
    component: () => import('@/pages/governance/VotePage.vue'),
    children: [
      {
        path: VOTE_CHILD_PATHS.login,
        name: ROUTE_NAMES.VOTE_LOGIN,
        component: () => import('@/pages/governance/VoteLoginPage.vue'),
      },
      {
        path: VOTE_CHILD_PATHS.list,
        name: ROUTE_NAMES.VOTE_LIST,
        component: () => import('@/pages/governance/VoteListPage.vue'),
      },
      {
        path: VOTE_CHILD_PATHS.create,
        name: ROUTE_NAMES.VOTE_CREATE,
        component: () => import('@/pages/governance/VoteCreatePage.vue'),
      },
      {
        path: VOTE_CHILD_PATHS.detail,
        name: ROUTE_NAMES.VOTE_DETAIL,
        component: () => import('@/pages/governance/VoteDetailPage.vue'),
      },
    ],
  },
]
