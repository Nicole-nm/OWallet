export type LocaleTranslator = (key: string, values?: Record<string, unknown>) => string

export function getAuthorizationBlockUnitLabel(t: LocaleTranslator, count: number) {
  return t(count === 1 ? 'nodeMgmt.block' : 'nodeMgmt.blocks')
}
