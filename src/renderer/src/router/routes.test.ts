import { describe, expect, it } from 'vitest'
import type { RouteRecordRaw } from 'vue-router'
import { routes, ROUTE_NAMES, ROUTE_PATHS } from './routes'

function flattenRoutes(routeRecords: RouteRecordRaw[]): RouteRecordRaw[] {
  return routeRecords.flatMap((routeRecord) => [
    routeRecord,
    ...flattenRoutes(routeRecord.children ?? []),
  ])
}

describe('router route definitions', () => {
  it('keeps route names unique', () => {
    const routeNames = flattenRoutes(routes)
      .map((routeRecord) => routeRecord.name)
      .filter((name): name is string | symbol => name !== undefined)

    expect(new Set(routeNames).size).toBe(routeNames.length)
  })

  it('keeps the catch-all route last', () => {
    expect(routes.at(-1)?.path).toBe(ROUTE_PATHS.notFound)
  })

  it('defines wallet param route patterns through route path constants', () => {
    const receive = flattenRoutes(routes).find(
      (routeRecord) => routeRecord.name === ROUTE_NAMES.RECEIVE
    )
    const redeem = flattenRoutes(routes).find(
      (routeRecord) => routeRecord.name === ROUTE_NAMES.REDEEM
    )

    expect(receive?.path).toBe(ROUTE_PATHS.receivePattern)
    expect(redeem?.path).toBe(ROUTE_PATHS.redeemPattern)
    expect(ROUTE_PATHS.receive('sharedWallet')).toBe('/wallet/receive/sharedWallet')
    expect(ROUTE_PATHS.redeem('jsonWallet')).toBe('/wallet/redeem/jsonWallet')
  })

  it('uses relative child paths for nested route records', () => {
    const nestedChildren = routes.flatMap((routeRecord) => routeRecord.children ?? [])

    expect(nestedChildren.length).toBeGreaterThan(0)
    expect(nestedChildren.every((child) => !child.path.startsWith('/'))).toBe(true)
  })

  it('names shared wallet child pages used by navigation flows', () => {
    const sharedWallet = routes.find(
      (routeRecord) => routeRecord.name === ROUTE_NAMES.SHARED_WALLET_DETAIL
    )
    const childNames = new Set(
      (sharedWallet?.children ?? []).map((routeRecord) => routeRecord.name).filter(Boolean)
    )

    expect(childNames.has(ROUTE_NAMES.SHARED_WALLET_HOME)).toBe(true)
    expect(childNames.has(ROUTE_NAMES.SHARED_WALLET_SEND_TRANSFER)).toBe(true)
    expect(childNames.has(ROUTE_NAMES.SHARED_WALLET_PENDING_TX_HOME)).toBe(true)
    expect(childNames.has(ROUTE_NAMES.SHARED_TX_MGMT)).toBe(true)
  })

  it('uses explicit route guard meta names', () => {
    const routeMetas = flattenRoutes(routes)
      .map((routeRecord) => routeRecord.meta as Record<string, unknown> | undefined)
      .filter((meta): meta is Record<string, unknown> => meta !== undefined)

    expect(routeMetas.some((meta) => meta.requiresCurrentWallet === true)).toBe(true)
    expect(routeMetas.some((meta) => meta.requiresWalletCollection === true)).toBe(true)
    expect(routeMetas.every((meta) => meta.requiresWallet === undefined)).toBe(true)
    expect(routeMetas.every((meta) => meta.requiresWallets === undefined)).toBe(true)
  })

  it('marks public routes with explicit meta.public flag', () => {
    const publicRoutes = flattenRoutes(routes).filter((route) => route.meta?.public === true)
    const publicRouteNames = publicRoutes.map((r) => r.name)

    expect(publicRouteNames).toContain(ROUTE_NAMES.HOME)
    expect(publicRouteNames).toContain(ROUTE_NAMES.SETTING)
  })
})
